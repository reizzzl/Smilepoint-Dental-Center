const { createClient } = require('@supabase/supabase-js');

function createDatabase(url, publishableKey) {
  if (!url || !publishableKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in backend/.env');
  }
  if (!URL.canParse(url) || !['http:', 'https:'].includes(new URL(url).protocol)) {
    throw new Error('SUPABASE_URL must be an HTTP or HTTPS URL');
  }
  if (publishableKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must be a public project key');
  }
  // Older Supabase keys store the role inside the JWT.
  const [, payload] = publishableKey.split('.');
  if (payload) {
    try {
      if (JSON.parse(Buffer.from(payload, 'base64url')).role === 'service_role') {
        throw new Error('Service role');
      }
    } catch {
      throw new Error('SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key');
    }
  }

  const auth = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth;

  return {
    getUser: (token) => auth.getUser(token),
    // Forward the staff member's token so Supabase applies their row policies.
    forUser: (token) => createClient(url, publishableKey, { accessToken: async () => token }),
  };
}

module.exports = { createDatabase };
