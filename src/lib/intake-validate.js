// Pure validation for the advisory intake form. No network, no secrets.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s\-.]{7,20}$/;
export const LIMITS = { name: 100, email: 254, phone: 20, city: 100, stage: 100, budget: 100, source: 100, group: 100, interest: 100, message: 2000 };

export function validateIntake(get) {
  const val = (k) => (get(k)?.toString().trim() || '');
  const data = {
    name: val('name'), email: val('email'), phone: val('phone'), city: val('city'),
    stage: val('stage') || val('interest'), budget: val('budget') || val('budget_range'), message: val('message'),
    consent: ['on', 'yes', 'true'].includes(get('consent')?.toString()),
    source: val('source'), group: val('ml_group'), interest: val('interest'),
    honeypot: val('company_website') || val('website'),
  };
  const errors = {};
  if (!data.name) errors.name = 'Please enter your name.';
  if (!EMAIL.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (!PHONE.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
  if (!data.consent) errors.consent = 'Please tick the consent box so we may contact you.';
  for (const [k, max] of Object.entries(LIMITS)) {
    if (data[k].length > max) errors[k] = `Please keep this under ${max} characters.`;
  }
  return { ok: Object.keys(errors).length === 0, errors, data };
}
