import { submitQuestion } from "@/lib/langgraph";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import {
  ChatRequestBody,
  StreamMessage,
  StreamMessageType,
  SSE_DATA_PREFIX,
  SSE_LINE_DELIMITER,
} from "@/lib/types";

export const runtime = "nodejs";

function sendSSEMessage(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) {
  const encoder = new TextEncoder();
  const message = `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`;
  console.log('[SSE] Sending message:', message);
  return writer.write(encoder.encode(message));
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, chatId } =
      (await req.json()) as ChatRequestBody;

    // Create stream with larger queue strategy for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();

    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
      },
    });

    // Handle the streaming response
    (async () => {
      try {
        // Send initial connection established message
        console.log('[SSE] Sending connection message');
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });

        // No need to send user message to Convex here since it's already stored in the frontend
        // and included in the messages array

        // Convert messages to LangChain format
        const langChainMessages = messages.map((msg) =>
          msg.role === "user"
            ? new HumanMessage({ content: msg.content })
            : new AIMessage({ content: msg.content })
        );

        try {
          // Create the event stream
          const eventStream = await submitQuestion(langChainMessages, chatId);

          let tokensSent = false;
          let lastModelContent = null;

          // Process the events
          for await (const event of eventStream) {
            console.log('[SSE] Processing event:', event);
            if (event.event === "on_chat_model_stream") {
              const token = event.data.chunk;
              if (token) {
                const text = token.content;
                if (text) {
                  console.log('[SSE] Sending token:', text);
                  await sendSSEMessage(writer, {
                    type: StreamMessageType.Token,
                    token: text,
                  });
                  tokensSent = true;
                  lastModelContent = text;
                }
              }
            } else if (event.event === "on_tool_start") {
              console.log('[SSE] Tool started:', event.name);
              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolStart,
                tool: event.name || "unknown",
                input: event.data.input,
              });
            } else if (event.event === "on_tool_end") {
              console.log('[SSE] Tool ended:', event.name);
              const toolMessage = new ToolMessage(event.data.output);
              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolEnd,
                tool: toolMessage.lc_kwargs.name || "unknown",
                output: event.data.output,
              });
            }
          }

          // If no tokens were sent, emit the last model content as a token
          if (!tokensSent && lastModelContent) {
            console.log('[SSE] Sending fallback token:', lastModelContent);
            await sendSSEMessage(writer, {
              type: StreamMessageType.Token,
              token: lastModelContent,
            });
          }

          // Send completion message
          console.log('[SSE] Sending completion message');
          await sendSSEMessage(writer, { type: StreamMessageType.Done });
        } catch (streamError) {
          console.error('[SSE] Error in event stream:', streamError);
          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error:
              streamError instanceof Error
                ? streamError.message
                : "Stream processing failed",
          });
        }
      } catch (error) {
        console.error('[SSE] Error in stream:', error);
        await sendSSEMessage(writer, {
          type: StreamMessageType.Error,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        try {
          await writer.close();
        } catch (closeError) {
          console.error('[SSE] Error closing writer:', closeError);
        }
      }
    })();

    return response;
  } catch (error) {
    console.error('[SSE] Error in chat API:', error);
    return NextResponse.json(
      { error: "Failed to process chat request" } as const,
      { status: 500 }
    );
  }
}
