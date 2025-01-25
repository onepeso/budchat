//import {invoke} from '@tauri-apps/api/tauri';
//
//export async function querySupabase(data: any) {
//    try {
//        const result = await invoke('supabase_query', {data: JSON.stringify(data)});
//        return JSON.parse(result); // Parse the response if needed
//    } catch (error) {
//        console.error('Error querying Supabase:', error);
//        throw error;
//    }
//}