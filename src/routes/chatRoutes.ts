import express from "express";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { appWithMemory } from "../agents/mainAgent";
import { HumanMessage } from "@langchain/core/messages";
import twilio from "twilio";
import { saveChatHistory } from "../utils/saveChatHistory";
import { initializeApp } from "firebase/app";
import { OpenAI, toFile } from 'openai';
import fetch from 'node-fetch';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { ElevenLabsClient } from 'elevenlabs';
import { getAvailableForAudio } from "../utils/getAvailableForAudio";

dotenv.config();

const router = express.Router();

const MessagingResponse = twilio.twiml.MessagingResponse; // mandar un texto simple
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken); // mandar un texto con media
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// ElevenLabs Client
const elevenlabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const createAudioStreamFromText = async (text: string): Promise<Buffer> => {
  const audioStream = await elevenlabsClient.generate({
    voice: "Andrea",
    model_id: "eleven_flash_v2_5",
    text,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  
  const content = Buffer.concat(chunks);
  return content;
};

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage();

let exportedFromNumber: string | undefined;

// Ruta para enviar mensajes de WhatsApp
router.post("/russell/send-message", async (req, res) => {
  const { to, body } = req.body;

  console.log(req.body);

  try {
    const message = await client.messages.create({
      from: "whatsapp:+5745012081",
      to: `whatsapp:${to}`,
      body: body,
    });

    res
      .status(200)
      .json({ success: true, message: "Mensaje enviado", sid: message.sid });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al enviar el mensaje",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// chat endpoint para recibir mensajes con twilio
router.post("/russell/receive-message", async (req, res) => {

  const twiml = new MessagingResponse();
  // console.log('Mensaje recibido:', req.body);
  const from = req.body.From;
  const to = req.body.To;

  console.log('from:', from, 'to:', to);

  // Parseo de numeros de telefono
  const fromColonIndex = from.indexOf(":");
  const toColonIndex = to.indexOf(":");
  // Numero de telefono que pasa de "whatsapp:+57XXXXXXXXX" a "+57XXXXXXXXX"
  const fromNumber = from.slice(fromColonIndex + 1);
  const toNumber = to.slice(toColonIndex + 1);

  exportedFromNumber = fromNumber

  try {
    let incomingMessage

    if ( req.body.MediaContentType0 && req.body.MediaContentType0.includes('audio') ) {
      try {
        const mediaUrl = await req.body.MediaUrl0;

        const response = await fetch(mediaUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
          }
        });

        const file = await toFile(response.body, 'recording.wav');

        const transcription = await openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          prompt: "Por favor, transcribe el audio y asegúrate de escribir los números exactamente como se pronuncian, sin espacios, comas, ni puntos. Por ejemplo, un número de documento   debe ser transcrito como 1143939192."
        });

        const { text } = transcription;
        incomingMessage = text;
      } catch (error) {
        console.error('Error transcribing audio:', error);
        twiml.message("En este momento no puedo transcribir audios, por favor intenta con un mensaje de texto. O prueba grabando el audio nuevamente.");
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
      }
    } else {
      incomingMessage = req.body.Body;
    }

    const config = {
      configurable: {
        thread_id: from,
      },
    };

    await saveChatHistory(fromNumber, req.body.Body, true);

    const agentOutput = await appWithMemory.invoke(
      {
        messages: [new HumanMessage(incomingMessage)],
      },
      config
    );

    const responseMessage = agentOutput.messages[
      agentOutput.messages.length - 1
    ].content as string;

    console.log("Respuesta IA:", responseMessage);

    await saveChatHistory(fromNumber, responseMessage, false);

    const isAvailableForAudio = await getAvailableForAudio(fromNumber);

    // Si la respuesta es menor a 600 caracteres && no contiene números, hacer TTS y enviar el audio
    if ( 
      responseMessage.length <= 600 && // Menor a 600 caracteres
      !/\d/.test(responseMessage) && // No contiene números
      !/\b(?:[A-Z]{2,}|\b(?:[A-Z]\.){2,}[A-Z]?)\b/.test(responseMessage) && // No contiene siglas
      isAvailableForAudio // El cliente puede recibir audios
    ) {
      console.log('Entró a enviar audio');
      try {
        const audioBuffer = await createAudioStreamFromText(responseMessage);
        const audioName = `${uuidv4()}.wav`;
        // Subir el archivo de audio a Firebase Storage
        const storageRef = ref(storage, `audios/${audioName}`);
        const metadata = {
          contentType: 'audio/mpeg',
        };
        const uploadTask = uploadBytesResumable(storageRef, audioBuffer, metadata);
        // Esperar a que la subida complete y obtener la URL pública
        uploadTask.on('state_changed',
          (snapshot) => {
            // Progreso de la subida (opcional)
            console.log('Upload is in progress...');
          },
          (error) => {
            throw new Error(`Upload failed: ${error.message}`);
          },
          async () => {
            // Subida completada
            const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
            // Envía el archivo de audio a través de Twilio
            await client.messages.create({
              body: "Audio message",
              from: to,
              to: from,
              mediaUrl: [audioUrl],
            });
            console.log('Audio message sent successfully');
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml.toString());
          }
        );
      } catch (error) {
        console.error('Error sending audio message:', error);
        twiml.message(responseMessage);
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
      }
    } else {
      // Responder con el texto si es mayor de 400 caracteres
      try {
        const message = await client.messages.create({
          body: responseMessage,
          from: 'whatsapp:+5745012081',
          to: from,
        });
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }

  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).send({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Ruta principal
router.get("/russell/chat-test", (req, res) => {
  res.send(
    "Servidor de Russell Bedford funcionando correctamente con Typescript y Express."
  );
});

export default router;

export {exportedFromNumber};