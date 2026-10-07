import test from 'node:test';
import assert from 'node:assert/strict';
import { apiErrorMessage } from './api-error-message.ts';

test('apiErrorMessage reads the standard envelope', () => {
  const body = { error: { code: 'not_found', message: 'Entry not found.', requestId: 'r1' } };
  assert.equal(apiErrorMessage(body, 'fallback'), 'Entry not found.');
});

test('apiErrorMessage reads the older plain-string shape', () => {
  assert.equal(apiErrorMessage({ error: 'Link expired.' }, 'fallback'), 'Link expired.');
});

test('apiErrorMessage falls back when there is no usable message', () => {
  assert.equal(apiErrorMessage(null, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage(undefined, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage({}, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage({ error: '' }, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage({ error: { code: 'x' } }, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage({ error: { message: 42 } }, 'fallback'), 'fallback');
});
