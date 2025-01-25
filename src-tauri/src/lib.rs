use tauri::command;
use std::env;
use dotenv::dotenv;

#[tauri::command]
fn get_supabase_credentials() -> Result<(String, String), String> {
    // Load .env file
    dotenv().ok();

    // Fetch Supabase URL and API key from environment variables
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not set in .env file".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not set in .env file".to_string())?;

    Ok((supabase_url, supabase_key))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().expect("Failed to load .env file"); // Load .env file

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_supabase_credentials]) // Register the command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}