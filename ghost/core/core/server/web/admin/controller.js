const debug = require("@tryghost/debug")("web:admin:controller");
const errors = require("@tryghost/errors");
const tpl = require("@tryghost/tpl");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const config = require("../../../shared/config");
const updateCheck = require("../../services/update-check");

const messages = {
    templateError: {
        message: "Unable to find admin template file {templatePath}",
        context:
            "These template files are generated as part of the build process",
        help: "Please see {link}",
    },
};

/**
 * @description Admin controller to handle /ghost/ requests.
 *
 * Every request to the admin panel will re-trigger the update check service.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports = function adminController(req, res) {
    debug("index called");

    // CASE: trigger update check unit and let it run in background, don't block the admin rendering
    updateCheck();

    const templatePath = path.resolve(
        config.get("paths").adminAssets,
        "index.html"
    );
    const headers = {};

    try {
        // Generate our own ETag header
        //   `sendFile` by default uses filesize+lastmod date to generate an etag.
        //   That doesn't work for admin templates because the filesize doesn't change between versions
        //   and `npm pack` sets a fixed lastmod date for every file meaning the default etag never changes
        const fileBuffer = fs.readFileSync(templatePath);
        const hashSum = crypto.createHash("md5");
        hashSum.update(fileBuffer);
        headers.ETag = hashSum.digest("hex");

        // In production, only allow iframing from allowed domains.
        // In development, no restrictions (iframe from anywhere).
        if (process.env.NODE_ENV === 'production') {
            const allowedPatterns = [
                /^https?:\/\/[a-z0-9-]+\.atlas-cms\.rest$/i,
                /^https?:\/\/[a-z0-9-]+\.iliad\.dev$/i,
                /^https?:\/\/[a-z0-9-]+\.[a-z0-9-]+\.atlas-cms\.rest$/i,
                /^https?:\/\/[a-z0-9-]+\.[a-z0-9-]+\.iliad\.dev$/i,
                /^https?:\/\/localhost(:\d+)?$/i
            ];
            // Browsers send Origin for CORS/fetch requests but NOT for iframe navigational GETs.
            // Fall back to parsing Referer, which browsers do send for cross-origin navigations.
            let effectiveOrigin = req.headers.origin || '';
            if (!effectiveOrigin && req.headers['referer']) {
                try {
                    effectiveOrigin = new URL(req.headers['referer']).origin;
                } catch (e) {
                    effectiveOrigin = '';
                }
            }
            const isAllowed = effectiveOrigin && allowedPatterns.some(p => p.test(effectiveOrigin));
            if (isAllowed) {
                headers['Content-Security-Policy'] = `frame-ancestors 'self' ${effectiveOrigin}`;
            } else {
                headers['X-Frame-Options'] = 'SAMEORIGIN';
            }
        }

        res.sendFile(templatePath, { headers, lastModified: false });
    } catch (err) {
        if (err.code === "ENOENT") {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.templateError.message, { templatePath }),
                context: tpl(messages.templateError.context),
                help: tpl(messages.templateError.help, {
                    link: "https://ghost.org/docs/install/source/",
                }),
                err,
            });
        }
        throw err;
    }
};
