require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error("Missing Supabase configuration in .env");
}

const supabase = createClient(
  supabaseUrl,
  publishableKey
);

module.exports = supabase;
