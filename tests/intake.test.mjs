import test from 'node:test';
import assert from 'node:assert/strict';
import { validateIntake } from '../src/lib/intake-validate.js';

const form = (o) => (k) => o[k];
const good = { name: 'Test Person', email: 'test@example.com', phone: '+27 11 000 0000', consent: 'on' };

test('accepts a complete submission', () => {
  const r = validateIntake(form(good));
  assert.equal(r.ok, true);
  assert.equal(r.data.consent, true);
});
test('rejects missing consent, bad email, bad phone, empty name', () => {
  const r = validateIntake(form({ name: ' ', email: 'nope', phone: 'abc' }));
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['consent', 'email', 'name', 'phone']);
});
test('rejects over-long message', () => {
  const r = validateIntake(form({ ...good, message: 'x'.repeat(2001) }));
  assert.ok(r.errors.message);
});
test('flags honeypot', () => {
  assert.equal(validateIntake(form({ ...good, website: 'http://spam' })).data.honeypot, 'http://spam');
});
test('trims whitespace', () => {
  assert.equal(validateIntake(form({ ...good, name: '  Ann  ' })).data.name, 'Ann');
});
test('accepts the live contact form field names (consent=yes, budget_range, interest)', () => {
  const r = validateIntake(form({ ...good, consent: 'yes', budget_range: 'Under R5,000', interest: 'Advisory' }));
  assert.equal(r.ok, true);
  assert.equal(r.data.budget, 'Under R5,000');
  assert.equal(r.data.stage, 'Advisory');
});
test('flags the live honeypot field company_website', () => {
  assert.ok(validateIntake(form({ ...good, company_website: 'x' })).data.honeypot);
});
