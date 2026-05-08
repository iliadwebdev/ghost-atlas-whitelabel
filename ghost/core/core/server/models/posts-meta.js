const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');
const {ValidationError} = require('@tryghost/errors');

const FOCAL_POINT_FIELD = 'feature_image_focal_point';

function normalizeFocalPoint(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'string') {
        // Already a stored JSON string (e.g. partial-update round-trip)
        return value;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new ValidationError({
            message: `${FOCAL_POINT_FIELD} must be an object with numeric x and y, or null`
        });
    }

    const {x, y} = value;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
        throw new ValidationError({
            message: `${FOCAL_POINT_FIELD}.x and ${FOCAL_POINT_FIELD}.y must be finite numbers`
        });
    }
    if (x < 0 || x > 100 || y < 0 || y > 100) {
        throw new ValidationError({
            message: `${FOCAL_POINT_FIELD}.x and ${FOCAL_POINT_FIELD}.y must be between 0 and 100`
        });
    }

    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;

    if (rx === 50 && ry === 50) {
        return null;
    }

    return JSON.stringify({x: rx, y: ry});
}

const PostsMeta = ghostBookshelf.Model.extend({
    tableName: 'posts_meta',

    defaults: function defaults() {
        return {
            email_only: false
        };
    },

    formatOnWrite(attrs) {
        ['og_image', 'twitter_image'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.toTransformReady(attrs[attr]);
            }
        });

        if (FOCAL_POINT_FIELD in attrs) {
            attrs[FOCAL_POINT_FIELD] = normalizeFocalPoint(attrs[FOCAL_POINT_FIELD]);
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        ['og_image', 'twitter_image'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        const raw = attrs[FOCAL_POINT_FIELD];
        if (typeof raw === 'string' && raw.length > 0) {
            try {
                attrs[FOCAL_POINT_FIELD] = JSON.parse(raw);
            } catch (e) {
                attrs[FOCAL_POINT_FIELD] = null;
            }
        }

        return attrs;
    }
}, {
    post() {
        return this.belongsTo('Post');
    }
});

module.exports = {
    PostsMeta: ghostBookshelf.model('PostsMeta', PostsMeta)
};
