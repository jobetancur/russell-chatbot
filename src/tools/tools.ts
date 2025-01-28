import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { saveClientData } from '../utils/functions';
import { searchVectors } from "../utils/retrievers";

export const retrieverTool = tool(
    async ({ query }: { query: string }) => {
      const results = await searchVectors(query);
      return results;
    },
    {
      name: "retriever",
      description: "Eres una herramienta de consulta de información sobre Russell Beford. Tu tarea es buscar y extraer solo la información relevante de la base de datos, respondiendo a las consultas de los clientes. Siempre entrega el resultado bien formateado para que sea facil de leer. Usa esta herramienta para responder preguntas específicas sobre los servicios de Revisoría Fiscal y Servicios Contables que ofrece Russell Bedford Colombia.",    
      schema: z.object({
        query: z.string(),
      }),
    }
  );

export const saveClientDataTool = tool(
    async ({ name, phone, email, service, message, schedule  }: { name: string, phone: string, email: string, service: string, message: string, schedule: string  }) => {
        const saveCliente = await saveClientData(name, phone, email, service, message, schedule);
        return saveCliente;
    },
    {
        name: 'guardar_datos_del_cliente',
        description: 'Guarda los datos del cliente en la base de datos. Esto lo debes hacer para garantizar un futuro contacto con el cliente por parte de un asesor real. Importante, esta tool solo se debe ejecutar cuando tengas el nombre, teléfono, correo del cliente, servicio en el que está interesado y el horario en que desea ser contactado. No la ejecutes si no tienes todos los datos completos.',
        schema: z.object({
            name: z.string(),
            phone: z.string(),
            email: z.string(),
            service: z.string(),
            message: z.string(),
            schedule: z.string(),
        }),
    }
);