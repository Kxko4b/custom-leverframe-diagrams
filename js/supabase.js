const SUPABASE_URL = "https://ggewdpazpeoielbqrcgm.supabase.co";

const SUPABASE_KEY = "YOUR_PUBLISHABLE_KEY_HERE";


const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
