use serde::Deserialize;
use std::fs;
use tauri::command;

// Define the SupabaseConfig struct
#[derive(Deserialize)]
struct SupabaseConfig {
    url: String,
    key: String,
}

// Define the Config struct
#[derive(Deserialize)]
struct Config {
    supabase: SupabaseConfig,
}

// Function to load the config from config.json
fn load_config() -> Config {
    // Read the config file
    let config_file = fs::read_to_string("config.json").expect("Failed to read config.json");
    // Parse the JSON into the Config struct
    serde_json::from_str(&config_file).expect("Failed to parse config.json")
}

// Tauri command to expose the Supabase config to the frontend
#[tauri::command]
fn get_supabase_credentials() -> Result<(String, String), String> {
    let config = load_config();
    Ok((config.supabase.url, config.supabase.key))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init()) // Keep other plugins
        .invoke_handler(tauri::generate_handler![get_supabase_credentials]) // Register the command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
