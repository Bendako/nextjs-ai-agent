import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import SYSTEM_MESSAGE from "@/constants/systemMessage";
import { ChatOllama } from "@langchain/ollama";

// Trim the messages to manage conversation history
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

// Connect to the LLM provider
const initialiseModel = () => {
  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: "mistral",
    temperature: 0.7,
    streaming: true,
  });

  return model;
};

// Define a new graph
const createWorkflow = () => {
  const model = initialiseModel();

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      // Create the system message content
      const systemContent = SYSTEM_MESSAGE;

      // Create the prompt template with system message and messages placeholder
      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent, {
          cache_control: { type: "ephemeral" },
        }),
        new MessagesPlaceholder("messages"),
      ]);

      // Trim the messages to manage conversation history
      const trimmedMessages = await trimmer.invoke(state.messages);

      // Format the prompt with the current messages
      const prompt = await promptTemplate.invoke({ messages: trimmedMessages });

      console.log("[Agent Node] Prompt to model:", JSON.stringify(prompt, null, 2));
      let response;
      try {
        response = await model.invoke(prompt);
        console.log("[Agent Node] Model response:", response);
      } catch (err) {
        console.error("[Agent Node] Error from model.invoke:", err);
        throw err;
      }

      return { messages: [response] };
    })
    .addEdge(START, "agent")
    .addEdge("agent", END);
};

function addCachingHeaders(messages: BaseMessage[]): BaseMessage[] {
  if (!messages.length) return messages;

  // Create a copy of messages to avoid mutating the original
  const cachedMessages = [...messages];

  // Helper to add cache control
  const addCache = (message: BaseMessage) => {
    message.content = [
      {
        type: "text",
        text: message.content as string,
        cache_control: { type: "ephemeral" },
      },
    ];
  };

  // Cache the last message
  addCache(cachedMessages.at(-1)!);

  // Find and cache the second-to-last human message
  let humanCount = 0;
  for (let i = cachedMessages.length - 1; i >= 0; i--) {
    if (cachedMessages[i] instanceof HumanMessage) {
      humanCount++;
      if (humanCount === 2) {
        addCache(cachedMessages[i]);
        break;
      }
    }
  }

  return cachedMessages;
}

export async function submitQuestion(messages: BaseMessage[], chatId: string) {
  // Add caching headers to messages
  const cachedMessages = addCachingHeaders(messages);

  // Create workflow with chatId and onToken callback
  const workflow = createWorkflow();

  // Create a checkpoint to save the state of the conversation
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });

  try {
    const stream = await app.streamEvents(
      { messages: cachedMessages },
      {
        version: "v2",
        configurable: { thread_id: chatId },
        streamMode: "messages",
        runId: chatId,
      }
    );
    
    // Return the stream without trying to add event listeners
    return stream;
  } catch (error) {
    console.error('Error creating stream:', error);
    throw error;
  }
}
