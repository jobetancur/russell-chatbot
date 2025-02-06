import express from "express";
import dotenv from "dotenv";
import { appWithMemory } from "../agents/mainAgent";
import { HumanMessage } from "@langchain/core/messages";
import twilio from "twilio";
import { saveChatHistory } from "../utils/saveChatHistory";
// axios
import axios from "axios";

dotenv.config();

const router = express.Router();

const MessagingResponse = twilio.twiml.MessagingResponse; // mandar un texto simple
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken); // mandar un texto con media

// Ruta para enviar mensajes de WhatsApp
router.post("/russell/send-message", async (req, res) => {
  const { to, body } = req.body;

  console.log(req.body);

  try {
    const message = await client.messages.create({
      from: "whatsapp:+14155238886",
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

  // Parseo de numeros de telefono
  const fromColonIndex = from.indexOf(":");
  const toColonIndex = to.indexOf(":");
  // Numero de telefono que pasa de "whatsapp:+57XXXXXXXXX" a "+57XXXXXXXXX"
  const fromNumber = from.slice(fromColonIndex + 1);
  const toNumber = to.slice(toColonIndex + 1);

  try {
    let incomingMessage = req.body.Body;

    console.log("Mensaje recibido:", incomingMessage);

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

    try {
      const message = await client.messages.create({
        body: responseMessage,
        from: 'whatsapp:+14155238886',
        to: from,
      });

      await saveChatHistory(fromNumber, responseMessage, false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).send({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

router.get("/", (req, res) => {
  res.send(
    "Petición GET de prueba para validar que el servidor está corriendo."
  );
});

// Ruta principal
router.get("/russell", (req, res) => {
  res.send(
    "Servidor de Russell Bedford funcionando correctamente con Typescript y Express."
  );
});

export default router;
