import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
// Import colombia.json file
import colombia from '../data/colombia.json';
import { setChatHistoryName } from './setChatHistoryName';
import { setChatHistoryService } from './setChatHistoryService';
import { exportedFromNumber } from '../routes/chatRoutes';
dotenv.config();
// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
// Guardar los datos del cliente, nombre, telefono y correo
export async function saveClientData(name, phone, email, city, service, message, schedule, appointment_type) {
    try {
        const { data, error } = await supabase
            .from('clients')
            .insert([
            { name: name, phone: phone, email: email, city: city, service: service, message: message, schedule: schedule, appointment_type: appointment_type },
        ]);
        console.log('Datos guardados en Supabase:', name, phone, city);
        sendEmailNotification(name, phone, email, city, service, message, schedule, appointment_type);
        await setChatHistoryName(name);
        await setChatHistoryService(service);
        if (error) {
            // Mostrar error en consola si no se guardan los datos
            console.error("Error al guardar los datos del cliente:", error);
            throw error;
        }
        return "Datos del cliente guardados correctamente.";
    }
    catch (error) {
        console.log("Error al guardar los datos del cliente:", error);
        throw error;
    }
}
async function sendEmailNotification(name, phone, email, city, service, message, schedule, appointment_type) {
    const transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        auth: {
            user: "apikey",
            pass: process.env.SENDGRID_API_KEY,
        },
    });
    const mailOptions = {
        from: '"¡Nuevo contacto!" <grow@ultimmarketing.com>',
        to: 'saralopez@rbcol.co',
        cc: ['mercadeo.gct@rbcol.co', 'davidlopez@rbcol.co', 'daniel@ultimmarketing.com', 'alejandro.b@ultimmarketing.com'],
        subject: 'Russell Bedford - Nuevo cliente registrado de WhatsApp',
        text: `¡Nuevo cliente registrado de WhatsApp! \n\nNombre: ${name} \nCelular: ${phone} \nCorreo: ${email} \nCiudad: ${city} \nServicio: ${service} \nMensaje: ${message} \nAgenda: ${schedule} \nTipo de cita: ${appointment_type}`,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return "Email enviado correctamente.";
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
;
// Prueba de Mail
// sendEmailNotification('Alejandro', '1234567890', 'alejandro.b@ultimmarketing.com', 'Fiscal', 'Mensaje de prueba', 'Mañana a las 10:00 am');
// Función para brindar canal de contacto de otros servicios diferentes a servicios contables y de revisoría fiscal ofrecidos por Russell Bedford
export function contactCustomerService() {
    const customerServiceData = {
        whatsapp: "https://wa.me/573186925681",
        description: "Linea de atención especializada para otros servicios diferentes a contabilidad y revisoría fiscal.",
    };
    return JSON.stringify(customerServiceData);
}
// Función para eliminar tildes y diéresis
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
// Lista de departamentos permitidos
const allowedDepartments = [
    "Antioquia",
    "Córdoba",
    "Chocó",
    "Norte de Santander",
    "Guainía",
    "Boyacá",
    "Arauca"
];
// Función para validar si el municipio ingresado pertenece a Antioquia, Córdoba, Chocó, Norte de Santander, Guainía, Boyacá o Arauca. Leerlo del archivo colombia.json
export function validateCity(city) {
    const normalizedCity = removeAccents(city.toLowerCase());
    const filteredDepartments = colombia.filter((dept) => allowedDepartments.includes(dept.departamento));
    const cityExists = filteredDepartments.some((dept) => dept.ciudades.some((c) => removeAccents(c.toLowerCase()) === normalizedCity));
    if (cityExists) {
        return "Perfecto, tu ciudad está dentro de nuestra cobertura.";
    }
    return "Lo siento, actualmente no tenemos cobertura en tu ciudad. Puedes comunicarte en el siguiente enlace: https://wa.me/573186925681";
}
// Función para cambiar el campo notifications en la base de datos de Supabase en la tabla chat_history a FALSE.
export async function updateNotifications() {
    try {
        const { data: chatHistory, error } = await supabase
            .from('chat_history')
            .select('id')
            .eq('client_number', exportedFromNumber)
            .single();
        if (error) {
            throw new Error(`Error fetching data: ${error.message}`);
        }
        if (chatHistory) {
            await supabase
                .from("chat_history")
                .update({ notifications: false })
                .eq("id", chatHistory.id);
        }
    }
    catch (error) {
        console.error(error);
    }
}
