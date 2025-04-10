// supabaseClient.js
// IMPORTANT: This file exposes your Supabase URL and Anon Key.
// Make sure this is acceptable for your security model.
// Anon keys are generally safe to expose in browser contexts.
// Service Role keys should NEVER be exposed client-side.

// Check if running in a browser environment
if (typeof window !== 'undefined') {
  const SUPABASE_URL = 'https://vkrvffwmfuwtxhztklmn.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnZmZndtZnV3dHhoenRrbG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMDcwMDMsImV4cCI6MjA1OTg4MzAwM30.t9hfH6JINtFeMP2LX6JVal-8sPXHHVKp_dlOlMINVOk';

  // Ensure the Supabase client library is loaded (assuming it's included via CDN or script tag)
  if (window.supabase) {
    console.log('Initializing Supabase client...');
    // Initialize the Supabase client
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized.');
  } else {
    console.error('Supabase client library not found. Make sure it is included in your HTML before supabaseClient.js');
  }
} else {
  console.warn('Supabase client initialization skipped: Not running in a browser environment.');
  // For Node.js environments (like Vercel functions), you'd typically use process.env
  // Example (would require dotenv or Vercel env vars):
  // const { createClient } = require('@supabase/supabase-js');
  // const supabaseUrl = process.env.SUPABASE_URL;
  // const supabaseKey = process.env.SUPABASE_ANON_KEY; // Or SERVICE_ROLE_KEY if needed
  // const _supabase = createClient(supabaseUrl, supabaseKey);
  // module.exports = _supabase; // Export for Node.js
}
