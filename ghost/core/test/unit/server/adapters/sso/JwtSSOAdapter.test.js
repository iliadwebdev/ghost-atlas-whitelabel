const assert = require('node:assert/strict');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-key-must-be-long-enough-for-hs256-algorithm';

describe('JwtSSOAdapter', function () {
    let JwtSSOAdapter;
    let adapter;

    before(function () {
        JwtSSOAdapter = require('../../../../../core/server/adapters/sso/JwtSSOAdapter');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('getRequestCredentials', function () {
        beforeEach(function () {
            adapter = new JwtSSOAdapter({secret: SECRET});
        });

        it('returns null when no token in query', async function () {
            const req = {query: {}};
            const result = await adapter.getRequestCredentials(req);
            assert.equal(result, null);
        });

        it('returns null when query is undefined', async function () {
            const req = {};
            const result = await adapter.getRequestCredentials(req);
            assert.equal(result, null);
        });

        it('returns token object when token present', async function () {
            const req = {query: {token: 'some-jwt'}};
            const result = await adapter.getRequestCredentials(req);
            assert.deepEqual(result, {token: 'some-jwt'});
        });
    });

    describe('getIdentityFromCredentials', function () {
        beforeEach(function () {
            adapter = new JwtSSOAdapter({
                secret: SECRET,
                issuer: 'test-app',
                audience: 'ghost-admin',
                defaultRole: 'Author',
                allowedDomains: ['example.com']
            });
        });

        it('returns null for null credentials', async function () {
            const result = await adapter.getIdentityFromCredentials(null);
            assert.equal(result, null);
        });

        it('returns null for credentials without token', async function () {
            const result = await adapter.getIdentityFromCredentials({});
            assert.equal(result, null);
        });

        it('returns null for invalid JWT', async function () {
            const result = await adapter.getIdentityFromCredentials({token: 'garbage'});
            assert.equal(result, null);
        });

        it('returns identity for valid JWT', async function () {
            const token = jwt.sign(
                {email: 'user@example.com', name: 'Test User', role: 'Editor'},
                SECRET,
                {issuer: 'test-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.deepEqual(result, {
                email: 'user@example.com',
                name: 'Test User',
                role: 'Editor'
            });
        });

        it('uses email prefix as name when name not provided', async function () {
            const token = jwt.sign(
                {email: 'user@example.com'},
                SECRET,
                {issuer: 'test-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result.name, 'user');
        });

        it('uses defaultRole when role not in JWT', async function () {
            const token = jwt.sign(
                {email: 'user@example.com'},
                SECRET,
                {issuer: 'test-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result.role, 'Author');
        });

        it('rejects tokens with wrong issuer', async function () {
            const token = jwt.sign(
                {email: 'user@example.com'},
                SECRET,
                {issuer: 'wrong-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result, null);
        });

        it('rejects tokens with wrong audience', async function () {
            const token = jwt.sign(
                {email: 'user@example.com'},
                SECRET,
                {issuer: 'test-app', audience: 'wrong-audience'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result, null);
        });

        it('rejects tokens signed with wrong secret', async function () {
            const token = jwt.sign(
                {email: 'user@example.com'},
                'wrong-secret',
                {issuer: 'test-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result, null);
        });

        it('rejects tokens without email claim', async function () {
            const token = jwt.sign(
                {name: 'No Email'},
                SECRET,
                {issuer: 'test-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result, null);
        });

        it('rejects tokens from disallowed email domains', async function () {
            const token = jwt.sign(
                {email: 'user@hacker.com'},
                SECRET,
                {issuer: 'test-app', audience: 'ghost-admin'}
            );
            const result = await adapter.getIdentityFromCredentials({token});
            assert.equal(result, null);
        });

        it('allows tokens when allowedDomains is empty', async function () {
            const openAdapter = new JwtSSOAdapter({
                secret: SECRET,
                allowedDomains: []
            });
            const token = jwt.sign(
                {email: 'user@anydomain.com'},
                SECRET
            );
            const result = await openAdapter.getIdentityFromCredentials({token});
            assert.equal(result.email, 'user@anydomain.com');
        });

        it('rejects expired tokens (maxAge: 5m)', async function () {
            const token = jwt.sign(
                {email: 'user@example.com'},
                SECRET,
                {issuer: 'test-app', audience: 'ghost-admin'}
            );

            // Stub Date.now to simulate 6 minutes later
            const clock = sinon.useFakeTimers({now: Date.now() + 6 * 60 * 1000});
            try {
                const result = await adapter.getIdentityFromCredentials({token});
                assert.equal(result, null);
            } finally {
                clock.restore();
            }
        });
    });

    describe('getUserForIdentity', function () {
        let models;

        before(function () {
            models = require('../../../../../core/server/models');
            // Provide a minimal User mock - models.init() requires a DB connection
            // but we only need the static methods for stubbing
            models.User = {
                getByEmail: function () {},
                add: function () {}
            };
        });

        beforeEach(function () {
            adapter = new JwtSSOAdapter({
                secret: SECRET,
                defaultRole: 'Author',
                autoProvision: true
            });
        });

        it('returns null for null identity', async function () {
            const result = await adapter.getUserForIdentity(null);
            assert.equal(result, null);
        });

        it('returns null for identity without email', async function () {
            const result = await adapter.getUserForIdentity({name: 'No Email'});
            assert.equal(result, null);
        });

        it('returns existing user when found', async function () {
            const mockUser = {id: '123', get: () => 'user@example.com'};
            sinon.stub(models.User, 'getByEmail').resolves(mockUser);

            const result = await adapter.getUserForIdentity({email: 'user@example.com', name: 'Test', role: 'Author'});
            assert.equal(result, mockUser);
            assert.equal(models.User.getByEmail.calledWith('user@example.com'), true);
        });

        it('auto-provisions new user when not found', async function () {
            const mockUser = {id: '456', get: () => 'new@example.com'};
            sinon.stub(models.User, 'getByEmail').resolves(null);
            sinon.stub(models.User, 'add').resolves(mockUser);

            const result = await adapter.getUserForIdentity({email: 'new@example.com', name: 'New User', role: 'Author'});
            assert.equal(result, mockUser);
            assert.equal(models.User.add.calledOnce, true);

            const addArgs = models.User.add.firstCall.args;
            assert.equal(addArgs[0].email, 'new@example.com');
            assert.equal(addArgs[0].name, 'New User');
            assert.deepEqual(addArgs[0].roles, ['Author']);
            assert.equal(addArgs[0].status, 'active');
            assert.equal(addArgs[1].context.internal, true);
        });

        it('returns null when auto-provision is disabled and user not found', async function () {
            const noProvisionAdapter = new JwtSSOAdapter({
                secret: SECRET,
                autoProvision: false
            });
            sinon.stub(models.User, 'getByEmail').resolves(null);

            const result = await noProvisionAdapter.getUserForIdentity({email: 'new@example.com', name: 'Test', role: 'Author'});
            assert.equal(result, null);
        });

        it('falls back to defaultRole for invalid role', async function () {
            const mockUser = {id: '789'};
            sinon.stub(models.User, 'getByEmail').resolves(null);
            sinon.stub(models.User, 'add').resolves(mockUser);

            await adapter.getUserForIdentity({email: 'new@example.com', name: 'Test', role: 'Owner'});

            const addArgs = models.User.add.firstCall.args;
            assert.deepEqual(addArgs[0].roles, ['Author']);
        });

        it('returns null when auto-provision fails', async function () {
            sinon.stub(models.User, 'getByEmail').resolves(null);
            sinon.stub(models.User, 'add').rejects(new Error('DB error'));

            const result = await adapter.getUserForIdentity({email: 'new@example.com', name: 'Test', role: 'Author'});
            assert.equal(result, null);
        });
    });
});
