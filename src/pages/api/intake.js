
export const POST = async ({ request }) => {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || '';
    const city = formData.get('city')?.toString().trim() || '';
    const stage = formData.get('stage')?.toString().trim() || '';
    const budget = formData.get('budget')?.toString().trim() || '';
    const message = formData.get('message')?.toString().trim() || '';
    const consent = formData.get('consent') === 'on';

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

