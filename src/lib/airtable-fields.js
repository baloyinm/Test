// Builds the Airtable record fields from validated intake data. Pure: no network, no secrets.
// Optional extra columns are settings (env var holds the Airtable column name; unset = not sent):
//   AIRTABLE_INTEREST_FIELD, AIRTABLE_SOURCE_FIELD, AIRTABLE_GROUP_FIELD
export function buildFields(d, env = {}) {
  const f = { Name: d.name, Email: d.email, 'Phone Number': d.phone, City: d.city, 'Business Stage': d.stage, Consent: d.consent, Status: 'New' };
  if (d.budget) f['Budget Range'] = d.budget;
  if (d.message) f.Message = d.message;
  if (env.AIRTABLE_INTEREST_FIELD && d.interest) f[env.AIRTABLE_INTEREST_FIELD] = d.interest;
  if (env.AIRTABLE_SOURCE_FIELD && d.source) f[env.AIRTABLE_SOURCE_FIELD] = d.source;
  if (env.AIRTABLE_GROUP_FIELD && d.group) f[env.AIRTABLE_GROUP_FIELD] = d.group;
  return f;
}
