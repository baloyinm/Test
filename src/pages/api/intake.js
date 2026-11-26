
import { validateIntake } from '../../lib/intake-validate.js';

export const POST = async ({ request }) => {
  try {
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
    const { name, email, phone, city, stage, budget, message, consent } = data;

    const fields = {
      Name: name,
      Email: email,
      "Phone Number": phone,
      City: city,
      "Business Stage": stage,
      Consent: consent,
      Status: "New"
    };

    if (budget) fields["Budget Range"] = budget;
    if (message) fields.Message = message;

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

