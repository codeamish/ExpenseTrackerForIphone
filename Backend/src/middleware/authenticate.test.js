import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser } from './authenticate.js';
import { createToken, hashToken } from '../services/tokenService.js';

function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }

test('session authentication attaches only the matching user', async () => {
    const token = createToken();
    const db = { async query(sql, values) {
        assert.match(sql, /user_sessions/);
        assert.equal(values[0], hashToken(token));
        return { rows: [{ id: 'user-1', email: 'one@example.com' }] };
    } };
    const req = { get: () => `Bearer ${token}` };
    let nextCalled = false;
    await requireUser({ db })(req, response(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 'user-1');
});

test('missing, expired and import-only credentials are rejected for reads', async () => {
    for (const header of [undefined, 'Basic abc', `Bearer ${createToken()}`]) {
        const res = response();
        const db = { async query() { return { rows: [] }; } };
        await requireUser({ db })({ get: () => header }, res, () => assert.fail('next called'));
        assert.equal(res.code, 401);
    }
});

test('import endpoint can authenticate a dedicated import token', async () => {
    const token = createToken();
    let calls = 0;
    const db = { async query(sql) {
        calls++;
        return { rows: calls === 1 ? [] : [{ id: 'user-2', email: 'two@example.com' }] };
    } };
    const req = { get: () => `Bearer ${token}` };
    await requireUser({ db, allowImportToken: true })(req, response(), () => {});
    assert.equal(req.user.id, 'user-2');
    assert.equal(calls, 2);
});
