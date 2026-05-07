#!/usr/bin/env node
/**
 * Ghost LocalFileStorage → Cloudinary one-shot migration.
 *
 * Uploads every image in <content>/images/ to Cloudinary with its relative path
 * preserved as the public_id, then rewrites every Ghost DB reference to those
 * local paths so the content starts serving from Cloudinary. Intended to be
 * run once per instance when transitioning off a local-disk storage regime.
 *
 * IMPORTANT: take a mysqldump of the target DB *before* running without
 * DRY_RUN=1. The SQL REPLACE() operations are non-reversible.
 *
 * Required env:
 *   CLOUDINARY_URL     cloudinary://<api_key>:<api_secret>@<cloud_name>
 *   DB_URL             mysql://user:pass@host:port/db  (Ghost's DB)
 *   CONTENT_DIR        absolute path to Ghost content/ (host-local, mount the
 *                      Railway volume or download the folder first)
 *   SITE_URL           e.g. https://ghost.example.com  (used to strip absolute
 *                      URLs that live inside rendered HTML)
 *
 * Optional env:
 *   DRY_RUN=1              no writes — prints planned uploads + counts SQL rows
 *                          that would be touched
 *   CLOUDINARY_FOLDER      prefix every public_id with this (default: migrated)
 *   RESUME_MAP             absolute path to a previous run's map JSON to skip
 *                          already-uploaded files (written to /tmp by default)
 *   CONCURRENCY            parallel upload workers (default: 4)
 *
 * Typical invocation (from repo root):
 *   DRY_RUN=1 \
 *   CLOUDINARY_URL='cloudinary://KEY:SECRET@CLOUD' \
 *   DB_URL='mysql://root:PASS@host:PORT/railway' \
 *   CONTENT_DIR=/path/to/ghost/content \
 *   SITE_URL='https://ghost.example.com' \
 *   node scripts/migrate-local-to-cloudinary.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const mysql = require('mysql2/promise');

const IMG_EXT_RE = /\.(jpe?g|png|gif|webp|svg|ico|bmp|avif|tiff?)$/i;

function die(msg) {
    console.error(msg);
    process.exit(1);
}

function requireEnv(names) {
    const missing = names.filter((n) => !process.env[n]);
    if (missing.length) {
        die(`missing required env: ${missing.join(', ')}`);
    }
}

function walkImages(root) {
    const out = [];
    (function walk(dir) {
        for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, ent.name);
            const rel = path.relative(root, full);
            if (ent.isDirectory()) {
                // Skip Ghost's on-the-fly resize cache — those files are
                // derivations of the originals we're already uploading, so
                // re-uploading them would just duplicate content.
                const topSegment = rel.split(path.sep)[0];
                if (topSegment === 'size') continue;
                walk(full);
            } else if (IMG_EXT_RE.test(ent.name)) {
                out.push(full);
            }
        }
    })(root);
    return out;
}

function toPublicId(relPath, folderPrefix) {
    // Cloudinary public_id has no extension — the uploader uses the file bytes
    // to infer format, and URLs get the correct extension back automatically.
    const withoutExt = relPath.replace(/\.[^.]+$/, '');
    const unixPath = withoutExt.split(path.sep).join('/');
    return folderPrefix ? `${folderPrefix}/${unixPath}` : unixPath;
}

async function uploadOne(absPath, publicId) {
    const res = await cloudinary.uploader.upload(absPath, {
        public_id: publicId,
        overwrite: false,        // make re-runs cheap/idempotent
        unique_filename: false,
        use_filename: false,
        resource_type: 'image'
    });
    return res.secure_url;
}

async function poolRun(items, worker, concurrency, onResult) {
    // N workers pulling from a shared index, each awaiting worker(items[i]) to
    // completion before taking the next. Simple, robust, no race between
    // finally-removals and Promise.race restarts.
    let next = 0;
    async function workerLoop() {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            const value = items[i];
            let settled;
            try {
                settled = {value, result: await worker(value), error: null};
            } catch (error) {
                settled = {value, result: null, error};
            }
            onResult(settled);
        }
    }
    const workers = Array.from({length: Math.min(concurrency, items.length)}, () => workerLoop());
    await Promise.all(workers);
}

async function phaseUpload({imagesDir, files, folderPrefix, concurrency, resumeMap, dryRun}) {
    const urlMap = new Map(resumeMap);
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    const failures = [];

    const todo = files.filter((abs) => {
        const rel = path.relative(imagesDir, abs).split(path.sep).join('/');
        const key = `/content/images/${rel}`;
        if (urlMap.has(key)) {
            skipped++;
            return false;
        }
        return true;
    });

    console.log(`[upload] ${todo.length} to upload (${skipped} already in resume map)`);

    async function worker(abs) {
        const rel = path.relative(imagesDir, abs).split(path.sep).join('/');
        const publicId = toPublicId(rel, folderPrefix);
        if (dryRun) {
            return {
                key: `/content/images/${rel}`,
                // Synthetic URL for planning only — real upload returns the
                // canonical secure_url with the correct version + extension.
                url: `cloudinary://<dry>/${publicId}`
            };
        }
        const url = await uploadOne(abs, publicId);
        return {key: `/content/images/${rel}`, url};
    }

    let progress = 0;
    await poolRun(todo, worker, concurrency, (r) => {
        progress++;
        if (r.error) {
            failed++;
            failures.push({file: r.value, error: r.error.message || String(r.error)});
            console.error(`[upload:fail] ${path.relative(imagesDir, r.value)}: ${r.error.message || r.error}`);
        } else {
            uploaded++;
            urlMap.set(r.result.key, r.result.url);
        }
        if (progress % 10 === 0 || progress === todo.length) {
            console.log(`[upload] ${progress}/${todo.length} processed (ok=${uploaded} fail=${failed})`);
        }
    });

    return {urlMap, uploaded, skipped, failed, failures};
}

function dbTargets() {
    // Every (table, column) where Ghost stores image URLs. Schema as of Ghost
    // 6.x: pages merged into `posts` (WHERE type='page') and post metadata
    // split into the `posts_meta` table.
    return [
        {table: 'posts',      columns: ['mobiledoc', 'lexical', 'html', 'plaintext', 'feature_image', 'codeinjection_head', 'codeinjection_foot']},
        {table: 'posts_meta', columns: ['og_image', 'twitter_image']},
        {table: 'users',      columns: ['profile_image', 'cover_image']},
        {table: 'tags',       columns: ['feature_image', 'og_image', 'twitter_image']},
        {table: 'newsletters', columns: ['header_image']},
        {
            table: 'settings',
            columns: ['value'],
            where: "`key` IN ('icon','logo','cover_image','og_image','twitter_image','portal_button_icon','accent_color_image')"
        }
    ];
}

function replacementPatterns(siteUrl) {
    // Ghost stores image URLs in two forms:
    //   1. __GHOST_URL__/content/images/...  — canonical placeholder (mobiledoc,
    //      lexical, feature_image, etc.)
    //   2. https://<site>/content/images/... — materialised absolute URL that
    //      appears in rendered `html`/`plaintext` output and occasionally in
    //      imported content.
    // Both need to be rewritten so rendered posts and cached HTML survive.
    return [
        {label: 'ghost-placeholder', prefix: '__GHOST_URL__'},
        {label: 'absolute',          prefix: siteUrl.replace(/\/$/, '')}
    ];
}

async function phaseRewrite({conn, urlMap, siteUrl, dryRun}) {
    const targets = dbTargets();
    const patterns = replacementPatterns(siteUrl);

    // Precompute a single flat map of every literal prefix+path → cloudinary URL
    // so the in-memory rewrite is one pass per row instead of O(URLs × patterns).
    const flatMap = new Map();
    for (const [oldPath, newUrl] of urlMap) {
        for (const pat of patterns) {
            flatMap.set(`${pat.prefix}${oldPath}`, newUrl);
        }
    }

    // Pre-flight: per-column row counts so we can skip columns with 0 hits
    // instead of issuing one query per URL × per column like the naïve version.
    console.log('[db] pre-flight row counts:');
    const workList = []; // {table, column, where, primaryKey, rowCount}
    for (const t of targets) {
        const pk = t.primaryKey || 'id';
        for (const col of t.columns) {
            const w = t.where ? ` AND ${t.where}` : '';
            const [rows] = await conn.query(
                `SELECT COUNT(*) AS c FROM \`${t.table}\` WHERE (\`${col}\` LIKE ? OR \`${col}\` LIKE ?)${w}`,
                [`%__GHOST_URL__/content/images/%`, `%${siteUrl}/content/images/%`]
            );
            if (rows[0].c > 0) {
                console.log(`  ${t.table}.${col}: ${rows[0].c} rows reference /content/images/`);
                workList.push({table: t.table, column: col, where: t.where, primaryKey: pk, rowCount: rows[0].c});
            }
        }
    }

    if (workList.length === 0) {
        console.log('[db] nothing to do — no rows reference /content/images/ in any target column');
        return 0;
    }

    const totalRowsToFetch = workList.reduce((s, w) => s + w.rowCount, 0);
    console.log(`[db] rewriting ${totalRowsToFetch} rows across ${workList.length} columns…`);

    let totalUpdates = 0;
    for (const job of workList) {
        const w = job.where ? ` AND ${job.where}` : '';
        const [rows] = await conn.query(
            `SELECT \`${job.primaryKey}\` AS pk, \`${job.column}\` AS old FROM \`${job.table}\` WHERE (\`${job.column}\` LIKE ? OR \`${job.column}\` LIKE ?)${w}`,
            [`%__GHOST_URL__/content/images/%`, `%${siteUrl}/content/images/%`]
        );

        let rowUpdates = 0;
        for (const row of rows) {
            if (row.old == null) continue;
            let fresh = row.old;
            // Short-circuit per-URL substring check — fresh.includes is a linear
            // scan but V8 ships it as a native boyer-moore-ish implementation,
            // faster than split+join on the full string.
            for (const [oldFull, newUrl] of flatMap) {
                if (fresh.indexOf(oldFull) >= 0) {
                    fresh = fresh.split(oldFull).join(newUrl);
                }
            }
            if (fresh !== row.old) {
                if (dryRun) {
                    console.log(`[dry] ${job.table}.${job.column}[pk=${String(row.pk).slice(0, 10)}…] would change (delta ${fresh.length - row.old.length} chars)`);
                } else {
                    await conn.query(
                        `UPDATE \`${job.table}\` SET \`${job.column}\` = ? WHERE \`${job.primaryKey}\` = ?`,
                        [fresh, row.pk]
                    );
                }
                rowUpdates++;
            }
        }
        console.log(`[db] ${job.table}.${job.column}: ${rowUpdates}/${rows.length} rows ${dryRun ? 'would be' : ''} updated`);
        totalUpdates += rowUpdates;
    }

    // Post-flight: any rows still referencing the local prefix? These are
    // stragglers (srcset /size/wN/ paths, broken links, files missing from
    // images/). Only meaningful after a real run, not dry.
    if (!dryRun) {
        console.log('[db] post-flight leftover counts:');
        let leftovers = 0;
        for (const t of targets) {
            for (const col of t.columns) {
                const wClause = t.where ? ` AND ${t.where}` : '';
                const [rows] = await conn.query(
                    `SELECT COUNT(*) AS c FROM \`${t.table}\` WHERE (\`${col}\` LIKE ? OR \`${col}\` LIKE ?)${wClause}`,
                    [`%__GHOST_URL__/content/images/%`, `%${siteUrl}/content/images/%`]
                );
                if (rows[0].c > 0) {
                    console.log(`  ⚠ ${t.table}.${col}: ${rows[0].c} rows still reference /content/images/`);
                    leftovers += rows[0].c;
                }
            }
        }
        if (leftovers === 0) console.log('  ✓ no leftovers — every /content/images/ reference was rewritten');
    }

    return totalUpdates;
}

async function main() {
    requireEnv(['CLOUDINARY_URL', 'DB_URL', 'CONTENT_DIR', 'SITE_URL']);

    const DRY_RUN = process.env.DRY_RUN === '1';
    const CONTENT_DIR = process.env.CONTENT_DIR;
    const SITE_URL = process.env.SITE_URL;
    const FOLDER = process.env.CLOUDINARY_FOLDER || 'migrated';
    const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10));
    const IMAGES_DIR = path.join(CONTENT_DIR, 'images');

    if (!fs.existsSync(IMAGES_DIR)) die(`not found: ${IMAGES_DIR}`);

    console.log(`[config] site=${SITE_URL}`);
    console.log(`[config] content=${IMAGES_DIR}`);
    console.log(`[config] folder=${FOLDER}`);
    console.log(`[config] cloud=${cloudinary.config().cloud_name}`);
    console.log(`[config] concurrency=${CONCURRENCY}`);
    console.log(`[config] dry-run=${DRY_RUN}`);

    // Optional: resume from a previous run's map file.
    let resumeMap = [];
    if (process.env.RESUME_MAP) {
        resumeMap = JSON.parse(fs.readFileSync(process.env.RESUME_MAP, 'utf8'));
        console.log(`[resume] loaded ${resumeMap.length} entries from ${process.env.RESUME_MAP}`);
    }

    const files = walkImages(IMAGES_DIR);
    console.log(`[scan] ${files.length} image files under ${IMAGES_DIR} (size/ cache excluded)`);

    const {urlMap, uploaded, skipped, failed, failures} = await phaseUpload({
        imagesDir: IMAGES_DIR,
        files,
        folderPrefix: FOLDER,
        concurrency: CONCURRENCY,
        resumeMap,
        dryRun: DRY_RUN
    });
    console.log(`[upload complete] uploaded=${uploaded} skipped=${skipped} failed=${failed}`);

    // Persist the URL map so a crashed DB phase can be re-run without
    // re-uploading. Always write, even in dry-run — inspecting the mapping is
    // itself useful pre-flight output.
    const mapPath = `/tmp/ghost-cloudinary-migration-${Date.now()}.json`;
    fs.writeFileSync(mapPath, JSON.stringify([...urlMap], null, 2));
    console.log(`[map] saved ${urlMap.size} entries to ${mapPath}`);

    if (failed > 0) {
        fs.writeFileSync(mapPath + '.failures.json', JSON.stringify(failures, null, 2));
        console.error(`[upload] ${failed} failures saved alongside map — resolve before DB phase`);
        if (!DRY_RUN) {
            die('aborting before DB writes because uploads had failures; re-run with RESUME_MAP=' + mapPath);
        }
    }

    const dbHost = (process.env.DB_URL.match(/@([^/]+)/) || [])[1] || '<unknown>';
    console.log(`[db] connecting to ${dbHost}…`);
    const conn = await mysql.createConnection({
        uri: process.env.DB_URL,
        multipleStatements: false,
        charset: 'utf8mb4',
        connectTimeout: 15000
    });
    console.log('[db] connected');

    try {
        const n = await phaseRewrite({conn, urlMap, siteUrl: SITE_URL, dryRun: DRY_RUN});
        console.log(`[db] total row-field updates: ${n}`);
    } finally {
        await conn.end();
    }

    console.log(DRY_RUN ? '[done] dry-run — no side effects' : '[done]');
}

main().catch((err) => {
    console.error('fatal:', err.stack || err);
    process.exit(1);
});
