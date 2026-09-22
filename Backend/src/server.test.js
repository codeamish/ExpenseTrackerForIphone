import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './server.js';

async function withServer(run) {
    const server = createApp().listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try { await run(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise(resolve => server.close(resolve)); }
}

test('transaction routes require authentication before database access', () => withServer(async base => {
    for (const [method, path, body] of [['GET', '/api/transactions'], ['POST', '/api/transactions/import', { message: 'anything' }]]) {
        const response = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Authentication required' });
        assert.equal(response.headers.get('x-powered-by'), null);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
}));

test('invalid signup is rejected without creating a user', () => withServer(async base => {
    const response = await fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'invalid', password: 'short' }) });
    assert.equal(response.status, 400);
}));

test('CORS exposes responses only to configured local origins', () => withServer(async base => {
    const allowed = await fetch(base, { headers: { Origin: 'http://localhost:8081' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    const denied = await fetch(base, { headers: { Origin: 'https://attacker.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
}));
