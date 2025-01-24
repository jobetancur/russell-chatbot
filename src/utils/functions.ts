import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Guardar los datos del cliente, nombre, telefono y correo
export async function saveClientData(name: string, phone: string, email: string) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([
        { name: name, phone: phone, email: email }
        ]);
    
    console.log('Datos guardados en Supabase:', name, phone, email);
    sendEmailNotification(name, phone, email);

    if (error) {
        // Mostrar error en consola si no se guardan los datos
        console.error("Error al guardar los datos del cliente:", error);
        throw error;
        }
    return "Datos del cliente guardados correctamente.";
    } catch (error) {
        console.log("Error al guardar los datos del cliente:", error);
        throw error;
    }
}

async function sendEmailNotification(name: string, phone: string, email: string) {
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
    to: 'margarita.d@ultimmarketing.com',
    cc: ['david@ultimmarketing.com,', 'elizabeth@ultimmarketing.com', 'anamaria.posada@csdental.com', 'isabella@ultimmarketing.com', 'intakes@ultimmarketing.com'],
    subject: 'Carestream Dental - Nuevo cliente registrado de WhatsApp',
    text: `Nombre: ${name}\nTeléfono: ${phone}\nCorreo: ${email}\nDatos recopilados por AI Carestream Dental.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return "Email enviado correctamente.";
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Prueba de Mail
// sendEmailNotification("Alejandro", "3045655669", "alejandro@gmail.com");