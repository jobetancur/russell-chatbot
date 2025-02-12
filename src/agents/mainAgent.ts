import dotenv from 'dotenv';
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { 
    retrieverTool,
    saveClientDataTool,
    contactTool,
    setAvailableForAudioTool,
} from '../tools/tools';
import { MESSAGES } from '../config/constants';

dotenv.config();

const memory = new MemorySaver();

const llm = new ChatOpenAI({ 
    temperature: 0,
    model: "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: 260,
});

const tools = [
    retrieverTool,
    saveClientDataTool,
    contactTool,
    setAvailableForAudioTool,
];

const modifyMessages = (messages: BaseMessage[]) => {
    return [
      new SystemMessage(MESSAGES.SYSTEM_PROMPT),
      ...messages,
    ];
};

export const appWithMemory = createReactAgent({
    llm,
    tools,
    messageModifier: modifyMessages,
    checkpointSaver: memory,
});