// api.js

// 1. Correct URL extension (.co instead of .com)
const supabaseUrl = 'https://pfzovbdtdhugdsozpxpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmem92YmR0ZGh1Z2Rzb3pweHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDgwMTEsImV4cCI6MjEwODU4NDAxMX0.n6MSQdoMKfTjwHdD5nYOsofenIckYwRSdPNV3d0xIng';

/* REVIEWBOOST - SUPABASE INITIALIZATION */

(function initializeSupabase() {

    // Check that the Supabase CDN loaded
    const library = window.supabase;

    if (
        !library ||
        typeof library.createClient !== "function"
    ) {
        console.error("Supabase library not loaded!");
        return;
    }

    // Create the client using existing credentials
    const client = library.createClient(
        supabaseUrl,
        supabaseKey
    );

    // Make client accessible to all pages
    window.reviewBoostClient = client;

    // Support existing JavaScript files
    window.supabase = client;

    // Verify initialization
    console.log(
        "Supabase initialized:",
        typeof client.auth.signUp === "function"
    );

})();