const debug = require('@tryghost/debug')('web:backend');
const express = require('../../../shared/express');
const {BASE_API_PATH} = require('../../../shared/url-utils');

/**
 *
 * @returns {import('express').Application}
 */
module.exports = () => {
    debug('BackendApp setup start');
    // BACKEND
    // Wrap the admin and API apps into a single express app for use with vhost
    const backendApp = express('backend');

    backendApp.lazyUse(BASE_API_PATH, require('../api'));
    backendApp.lazyUse('/ghost/.well-known', require('../well-known'));

    backendApp.use('/ghost',
        require('../../services/auth/session').createSessionFromToken(),
        function redirectAfterTokenExchange(req, res, next) {
            // After SSO token exchange, redirect to strip the token from the URL
            // to prevent leakage in browser history, Referer headers, and logs
            if (req.query && req.query.token && req.session && req.session.user_id) {
                const cleanUrl = req.originalUrl.split('?')[0];
                return res.redirect(302, cleanUrl);
            }
            next();
        },
        require('../admin')()
    );

    return backendApp;
};
