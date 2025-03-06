// Guardar hustorial de conversación en Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);


// Función para consultar si una persona esta disponible para mandarle audios
export async function getAvailableChatOn(clientNumber: string,) {
    try {
        // Verificar si el cliente ya tiene un chat
        const { data: existingChat, error: fetchError } = await supabase
            .from('chat_history')
            .select('chat_on')
            .eq('client_number', clientNumber)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: No rows found
            throw new Error(`Error fetching data: ${fetchError.message}`);
        }    

        if (existingChat) {
            return existingChat.chat_on;
        } 

    } catch (error) {
        console.error(error);
    }
}

