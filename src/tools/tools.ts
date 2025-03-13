import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { saveClientData, contactCustomerService, validateCity, updateNotifications, jobOpportunities, fetchUserName } from '../utils/functions';
import { searchVectors } from "../utils/retrievers";
import { setAvailableForAudio } from "../utils/setAvailableForAudio";

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
  async ({ name, phone, email, city, service, message, schedule, appointment_type }: { name: string, phone: string, email: string, city: string, service: string, message: string, schedule: string, appointment_type: string  }) => {
    const saveCliente = await saveClientData(name, phone, email, city, service, message, schedule, appointment_type);
    return saveCliente;
  },
  {
    name: 'guardar_datos_del_cliente',
    description: 'Guarda los datos del cliente en la base de datos. Esto lo debes hacer para garantizar un futuro contacto con el cliente por parte de un asesor real. Importante, esta tool solo se debe ejecutar cuando tengas el nombre, celular, correo del cliente, ciudad en donde requiere el servicio, servicio en el que está interesado y la fecha junto con la hora en que desea ser contactado. No la ejecutes si no tienes todos los datos completos.',
    schema: z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string(),
      city: z.string(),
      service: z.string(),
      message: z.string(),
      schedule: z.string(),
      appointment_type: z.string(),
    }),
  }
);

export const contactTool = tool(
  async () => {
    const contact = contactCustomerService();
    return contact;
  },
  {
    name: 'contacto_servicio_cliente',
    description: 'Brinda el canal de contacto para otros servicios diferentes a los servicios contables y de revisoría fiscal ofrecidos por Russell Bedford Medellín. Esta tool se debe ejecutar cuando el cliente solicita información sobre otros servicios diferentes a los mencionados anteriormente.',
    schema: z.object({}),
  }
);

export const setAvailableForAudioTool = tool(
  async ({ isAvailableForAudio }: { isAvailableForAudio: boolean }) => {
    const preferences = setAvailableForAudio(isAvailableForAudio);
    return preferences;
  },
  {
    name: "can_the_client_answer_audios",
    description: "si el cliente manifiesta una preferencia por recibir la informacion por audio o por texto o que no puede escuchar audios, si el usuario no peude escuchar audios setea en la base de datos FALSE, si puede escuchar audios setea en la base de datos TRUE. Además, debes enviar nuevamente al cliente el último mensaje que recibió en texto para que lo pueda leer en caso de no poder recibir audios.",
    schema: z.object({
      isAvailableForAudio: z.boolean(),
    }),
  }
);

export const validateCityTool = tool(
  async ({ city }: { city: string }) => {
    const cityValidation = validateCity(city);
    return cityValidation;
  },
  {
    name: "validate_city",
    description: "Valida si la ciudad ingresada por el cliente es una ciudad en la que Russell Bedford tiene presencia. Si la ciudad no esta en los departamentos de Antioquia, Córdoba, Chocó, Norte de Santander, Guainía, Boyacá o Arauca, redirige al cliente a la línea de atención correspondiente. Si la ciudad es pertenece a uno de estos departamentos, pregunta si desea agendar una reunión.",
    schema: z.object({
      city: z.string(),
    }),
  }
);

export const updateNotificationsTool = tool(
  async () => {
    const notificationsUpdated = await updateNotifications();
    return notificationsUpdated;
  },
  {
    name: "update_notifications",
    description: "Actualiza el campo notifications en la base de datos de Supabase en la tabla chat_history a FALSE. Esta tool se debe ejecutar cuando el cliente manifieste de manera clara que no está interesado en los servicios de Russell o que no quiera recibir mas notificaciones. ",
    schema: z.object({}),
  }
);

export const jobOpportunitiesTool = tool(
  async () => {
    const jobOpportunitiesData = jobOpportunities();
    return jobOpportunitiesData;
  },
  {
    name: "job_opportunities",
    description: "Brinda información sobre las oportunidades laborales en Russell Bedford. Esta tool se debe ejecutar cuando el cliente solicita información sobre las oportunidades laborales en la firma. Retorna los correos de contacto para enviar la hoja de vida.",
    schema: z.object({}),
  }
);

//Tool para consultar el nombre del cliente por su número de celular.
export const fetchUserNameTool = tool(
  async ({ phoneNumber }: { phoneNumber: string }) => {
    const userName = await fetchUserName(phoneNumber);
    return userName;
  },
  {
    name: "fetch_user_name",
    description: "Obtiene el nombre del cliente. Esto se hace para personalizar la conversación y hacerla más amigable. Ejecuta esta tool para obtener su nombre y dirigirte a él de manera más personalizada. Siempre ejecuta esta tool en el saludo inicial para validar si tenemos el nombre del cliente y el servicio que necesita. Si no tenemos información, continua con la conversación de manera normal.",
    schema: z.object({
      phoneNumber: z.string(),
    }),
  }
);