
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jjayxlprdgkaxsnacjru.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ekRMDax9RPhch8XXuVy3Xg_ADvdDYxy";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function main() {
    console.log("Fetching profile for store-3...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', 'store-3')
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Profile Data:", data);
        console.log("Owner User ID:", data.user_id);
    }
}

main();
