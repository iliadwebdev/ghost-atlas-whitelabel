const adapterManager = require('../../adapter-manager');
const createSessionService = require('./session-service');
const sessionFromToken = require('./session-from-token');
const createSessionMiddleware = require('./middleware');
const settingsCache = require('../../../../shared/settings-cache');
const {GhostMailer} = require('../../mail');
const {t} = require('../../i18n');

const expressSession = require('./express-session');

const models = require('../../../models');
const urlUtils = require('../../../../shared/url-utils');
const config = require('../../../../shared/config');
const {blogIcon} = require('../../../lib/image');
const url = require('url');

// TODO: We have too many lines here, should move functions out into a utils module
/* eslint-disable max-lines */

function getOriginOfRequest(req) {
    const origin = req.get('origin');
    const referrer = req.get('referrer') || urlUtils.getAdminUrl() || urlUtils.getSiteUrl();

    if (!origin && !referrer || origin === 'null') {
        return null;
    }

    if (origin) {
        return origin;
    }

    const {protocol, host} = url.parse(referrer);
    if (protocol && host) {
        return `${protocol}//${host}`;
    }
    return null;
}

const mailer = new GhostMailer();

const sessionService = createSessionService({
    getOriginOfRequest,
    getSession: expressSession.getSession,
    findUserById({id}) {
        return models.User.findOne({id, status: 'active'});
    },
    getSettingsCache(key) {
        return settingsCache.get(key);
    },
    isStaffDeviceVerificationDisabled() {
        // This config flag is set to true by default, so we need to check for false
        return config.get('security:staffDeviceVerification') !== true;
    },
    getBlogLogo() {
        return blogIcon.getIconUrl({absolute: true, fallbackToDefault: false})
            || 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png';
    },
    mailer,
    urlUtils,
    t
});

module.exports = createSessionMiddleware({sessionService});

// Looks funky but this is a "custom" piece of middleware
module.exports.createSessionFromToken = () => {
    const ssoAdapter = adapterManager.getAdapter('sso');
    return sessionFromToken({
        callNextWithError: false,
        createSession: async function (req, res, user) {
            // For SSO token exchange (e.g., iframe embedding), the request's
            // Origin/Referer points to the embedding page, not Ghost. Override
            // to Ghost's own URL so the session's stored origin matches
            // subsequent same-origin API requests from the admin client.
            const originalReferer = req.headers.referer;
            const originalOrigin = req.headers.origin;
            req.headers.referer = urlUtils.getAdminUrl() || urlUtils.getSiteUrl();
            req.headers.origin = undefined;
            try {
                await sessionService.createVerifiedSessionForUser(req, res, user);
            } finally {
                req.headers.referer = originalReferer;
                req.headers.origin = originalOrigin;
            }
        },
        findUserByLookup: ssoAdapter.getUserForIdentity.bind(ssoAdapter),
        getLookupFromToken: ssoAdapter.getIdentityFromCredentials.bind(ssoAdapter),
        getTokenFromRequest: ssoAdapter.getRequestCredentials.bind(ssoAdapter)
    });
};

module.exports.sessionService = sessionService;
module.exports.deleteAllSessions = expressSession.deleteAllSessions;
