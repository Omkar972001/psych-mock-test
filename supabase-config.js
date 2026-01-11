// Supabase Configuration
// Replace these with your project's URL and Anon Key from the Supabase Dashboard
const SUPABASE_URL = 'https://pndmpltwibwyakigfbso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZG1wbHR3aWJ3eWFraWdmYnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDQ4OTksImV4cCI6MjA4MzY4MDg5OX0.aVStWX7scNouVY8_cvYGOiaAkMT9utO_u9MqaDdqdHc';

window.supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!window.supabase) {
    console.error("Supabase client failed to initialize. Check if the CDN script is loaded.");
} else {
    console.log("Supabase initialized successfully.");
}
