'use strict';

// Shell-safe alias over ghost-storage-cloudinary. Lives under
// core/server/adapters/ (not content/adapters/) so it survives Railway's
// content/ volume mount, which shadows the image-baked version of the
// directory. See .claude/whitelabel-changes.md §20.
module.exports = require('ghost-storage-cloudinary');
