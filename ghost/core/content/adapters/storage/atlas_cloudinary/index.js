'use strict';

// Thin alias over ghost-storage-cloudinary so `storage.active` can be a shell-safe
// identifier (no hyphens). Env vars like storage__atlas_cloudinary__auth__cloud_name
// then work on every platform; the hyphenated package name would be rejected by
// POSIX shells. See .claude/whitelabel-changes.md §20 for context.
module.exports = require('ghost-storage-cloudinary');
