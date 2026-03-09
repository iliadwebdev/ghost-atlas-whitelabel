const SSOBase = require("./SSOBase");
const jwt = require("jsonwebtoken");
const security = require("@tryghost/security");
const models = require("../../models");
const logging = require("@tryghost/logging");

const VALID_ROLES = ["Administrator", "Editor", "Author", "Contributor"];

module.exports = class JwtSSOAdapter extends SSOBase {
    constructor(config) {
        super();
        this.secret = config.secret;
        this.issuer = config.issuer || undefined;
        this.audience = config.audience || undefined;
        this.algorithm = config.algorithm || "HS256";
        this.defaultRole = config.defaultRole || "Author";
        this.allowedDomains = config.allowedDomains || [];
        this.autoProvision = config.autoProvision !== false;

        logging.info(
            `JWT SSO: JwtSSOAdapter instantiated (secret set: ${!!this
                .secret}, allowedDomains: [${
                this.allowedDomains
            }], defaultRole: ${this.defaultRole})`
        );
    }

    /**
     * Extract JWT token from request query parameter.
     * Returns null if no token present, allowing normal auth flow.
     */
    async getRequestCredentials(req) {
        logging.info(
            `JWT SSO: getRequestCredentials called for ${req.method} ${req.originalUrl}`
        );
        const token = req.query && req.query.token;
        if (!token) {
            return null;
        }
        logging.info(
            `JWT SSO: Token found, length=${
                typeof token === "string" ? token.length : JSON.stringify(token)
            }, value=${
                typeof token === "string"
                    ? token.substring(0, 20) + "..."
                    : JSON.stringify(token)
            }`
        );
        return { token };
    }

    /**
     * Validate JWT and extract user identity.
     * Returns null if validation fails.
     */
    async getIdentityFromCredentials(credentials) {
        logging.info("JWT SSO: getIdentityFromCredentials called");
        if (!credentials || !credentials.token) {
            logging.warn("JWT SSO: No credentials or token provided");
            return null;
        }

        console.log("JWT SSO: Verifying token with secret:", this.secret);
        console.log(
            "JWT SSO: Token payload (before verification):",
            credentials.token
        );

        try {
            const verifyOptions = {
                algorithms: [this.algorithm],
                maxAge: "5m",
            };

            if (this.issuer) {
                verifyOptions.issuer = this.issuer;
            }
            if (this.audience) {
                verifyOptions.audience = this.audience;
            }

            const decoded = jwt.verify(
                credentials.token,
                this.secret,
                verifyOptions
            );

            if (!decoded.email) {
                logging.warn("JWT SSO: Token missing required email claim");
                return null;
            }
            // // I AM TEMPORARILY DISABLING DOMAIN RESTRICTION CHECKS TO ALLOW TESTING WITH PUBLIC EMAILS
            // if (this.allowedDomains.length > 0) {
            //     const emailDomain = decoded.email.split("@")[1];
            //     if (!this.allowedDomains.includes(emailDomain)) {
            //         logging.warn(
            //             `JWT SSO: Email domain ${emailDomain} not in allowed list`
            //         );
            //         return null;
            //     }
            // }

            return {
                name: decoded.name || decoded.email.split("@")[0],
                role: decoded.role || this.defaultRole,
                email: decoded.email,
            };
        } catch (err) {
            logging.warn("JWT SSO: Token validation failed: " + err.message);
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
            logging.warn(
                `JWT SSO: No user found for ${identity.email} and auto-provisioning disabled`
            );
            return null;
        }

        const roleName = VALID_ROLES.includes(identity.role)
            ? identity.role
            : this.defaultRole;

        try {
            user = await models.User.add(
                {
                    name: identity.name,
                    email: identity.email,
                    password: security.identifier.uid(50),
                    roles: [roleName],
                    status: "active",
                },
                {
                    context: { internal: true },
                }
            );

            logging.info(
                `JWT SSO: Auto-provisioned user ${identity.email} with role ${roleName}`
            );
            return user;
        } catch (err) {
            logging.error(
                "JWT SSO: Failed to auto-provision user: " + err.message
            );
            return null;
        }
    }
};
