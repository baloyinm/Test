
import { validateIntake } from '../../lib/intake-validate.js';
import { createLimiter, clientKey } from '../../lib/rate-limit.js';
import { buildFields } from '../../lib/airtable-fields.js';

const cfg = (k) => import.meta.env[k] || process.env[k];
const limiter = createLimiter({
  max: Number(cfg('INTAKE_RATE_MAX')) || 5,
  windowMs: (Number(cfg('INTAKE_RATE_WINDOW_SECONDS')) || 60) * 1000,
});
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export const POST = async ({ request }) => {
  try {
    const rl = limiter.check(clientKey(request.headers));
    if (!rl.allowed) return json({ error: 'Too many requests. Please try again shortly.' }, 429, { 'Retry-After': String(rl.retryAfter) });
    const formData = await request.formData();
    
    const { ok, errors, data } = validateIntake((k) => formData.get(k));
    if (data.honeypot) {
      // Bots fill the hidden field: pretend success, save nothing.
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Please check the form', errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Setting: INTAKE_DRY_RUN=1 validates and answers success without saving anything.
    if (cfg('INTAKE_DRY_RUN') === '1') return json({ success: true, message: 'Thank you. We will be in touch soon.', dryRun: true });

    const fields = buildFields(data, {
      AIRTABLE_INTEREST_FIELD: cfg('AIRTABLE_INTEREST_FIELD'),
      AIRTABLE_SOURCE_FIELD: cfg('AIRTABLE_SOURCE_FIELD'),
      AIRTABLE_GROUP_FIELD: cfg('AIRTABLE_GROUP_FIELD'),
    });

    const apiKey = import.meta.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
    const baseId = import.meta.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const tableName = import.meta.env.AIRTABLE_TABLE_NAME || process.env.AIRTABLE_TABLE_NAME || 'Intake';

    if (!apiKey || !baseId) {
      console.error('Missing Airtable configuration (AIRTABLE_API_KEY or AIRTABLE_BASE_ID).');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const airtableResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: [{ fields }] })
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('Airtable error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to save submission' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Thank you. We will be in touch soon.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

