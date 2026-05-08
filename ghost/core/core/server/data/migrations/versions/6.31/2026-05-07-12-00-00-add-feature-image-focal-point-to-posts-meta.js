const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'feature_image_focal_point', {
    type: 'text',
    maxlength: 100,
    nullable: true
});
