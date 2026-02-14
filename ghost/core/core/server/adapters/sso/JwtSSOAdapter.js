const SSOBase = require('./SSOBase');
const jwt = require('jsonwebtoken');
const security = require('@tryghost/security');
const models = require('../../models');
const logging = require('@tryghost/logging');

const VALID_ROLES = ['Administrator', 'Editor', 'Author', 'Contributor'];

module.exports = class JwtSSOAdapter extends SSOBase {
    constructor(config) {
        super();
        this.secret = config.secret;
        this.issuer = config.issuer || undefined;
        this.audience = config.audience || undefined;
        this.algorithm = config.algorithm || 'HS256';
        this.defaultRole = config.defaultRole || 'Author';
        this.allowedDomains = config.allowedDomains || [];
        this.autoProvision = config.autoProvision !== false;
    }

    /**
     * Extract JWT token from request query parameter.
     * Returns null if no token present, allowing normal auth flow.
     */
    async getRequestCredentials(req) {
        const token = req.query && req.query.token;
        if (!token) {
            return null;
        }
        return {token};
    }

    /**
     * Validate JWT and extract user identity.
     * Returns null if validation fails.
     */
    async getIdentityFromCredentials(credentials) {
        if (!credentials || !credentials.token) {
            return null;
        }

        try {
            const verifyOptions = {
                algorithms: [this.algorithm],
                maxAge: '5m'
            };

            if (this.issuer) {
                verifyOptions.issuer = this.issuer;
            }
            if (this.audience) {
                verifyOptions.audience = this.audience;
            }

            const decoded = jwt.verify(credentials.token, this.secret, verifyOptions);

            if (!decoded.email) {
                logging.warn('JWT SSO: Token missing required email claim');
                return null;
            }

            if (this.allowedDomains.length > 0) {
                const emailDomain = decoded.email.split('@')[1];
                if (!this.allowedDomains.includes(emailDomain)) {
                    logging.warn(`JWT SSO: Email domain ${emailDomain} not in allowed list`);
                    return null;
                }
            }

            return {
                email: decoded.email,
                name: decoded.name || decoded.email.split('@')[0],
                role: decoded.role || this.defaultRole
            };
        } catch (err) {
            logging.warn('JWT SSO: Token validation failed: ' + err.message);
            return null;
        }
    }

    /**
     * Look up or auto-provision Ghost user for the given identity.
     * Returns null if user not found and auto-provisioning is disabled.
     */
    async getUserForIdentity(identity) {
        if (!identity || !identity.email) {
            return null;
        }

        let user = await models.User.getByEmail(identity.email);

        if (user) {
            return user;
        }

        if (!this.autoProvision) {
            logging.warn(`JWT SSO: No user found for ${identity.email} and auto-provisioning disabled`);
            return null;
        }

        const roleName = VALID_ROLES.includes(identity.role)
            ? identity.role
            : this.defaultRole;

        try {
            user = await models.User.add({
                name: identity.name,
                email: identity.email,
                password: security.identifier.uid(50),
                roles: [roleName],
                status: 'active'
            }, {
                context: {internal: true}
            });

            logging.info(`JWT SSO: Auto-provisioned user ${identity.email} with role ${roleName}`);
            return user;
        } catch (err) {
            logging.error('JWT SSO: Failed to auto-provision user: ' + err.message);
            return null;
        }
    }
};
