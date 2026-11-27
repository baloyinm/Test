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

import { createLimiter, clientKey } from '../src/lib/rate-limit.js';
import { buildFields } from '../src/lib/airtable-fields.js';

test('rate limiter: 6th post in a window is refused, window then resets', () => {
  let t = 0;
  const l = createLimiter({ max: 5, windowMs: 60000, now: () => t });
  for (let i = 0; i < 5; i++) assert.equal(l.check('1.1.1.1').allowed, true);
  const r = l.check('1.1.1.1');
  assert.equal(r.allowed, false);
  assert.ok(r.retryAfter > 0);
  assert.equal(l.check('2.2.2.2').allowed, true);
  t = 61000;
  assert.equal(l.check('1.1.1.1').allowed, true);
});
test('clientKey takes the first forwarded address', () => {
  assert.equal(clientKey(new Headers({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8' })), '9.9.9.9');
  assert.equal(clientKey(new Headers()), 'unknown');
});
test('extra Airtable columns are only sent when configured', () => {
  const d = validateIntake(form({ ...good, interest: 'Advisory', source: 'contact_page', ml_group: 'General Enquiries' })).data;
  const plain = buildFields(d, {});
  assert.equal(plain.Name, 'Test Person');
  assert.equal(Object.keys(plain).includes('Area of interest'), false);
  const withCols = buildFields(d, { AIRTABLE_INTEREST_FIELD: 'Area of interest', AIRTABLE_SOURCE_FIELD: 'Source' });
  assert.equal(withCols['Area of interest'], 'Advisory');
  assert.equal(withCols.Source, 'contact_page');
});
