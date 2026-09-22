import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './passwordService.js';
import { bearerToken, createToken, hashToken } from './tokenService.js';

test('password hashes are salted, verifiable, and do not contain plaintext', async () => {
    const password = 'correct horse battery staple';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    assert.notEqual(first, second);
    assert.equal(first.includes(password), false);
    assert.equal(await verifyPassword(password, first), true);
    assert.equal(await verifyPassword('incorrect password', first), false);
    assert.equal(await verifyPassword(password, 'malformed'), false);
});

test('opaque bearer tokens use strict syntax and deterministic hashes', () => {
    const token = createToken();
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(bearerToken(`Bearer ${token}`), token);
    assert.equal(bearerToken(`bearer ${token}`), null);
    assert.equal(bearerToken(`Bearer ${token} extra`), null);
    assert.match(hashToken(token), /^[a-f0-9]{64}$/);
    assert.notEqual(hashToken(token), token);
});
