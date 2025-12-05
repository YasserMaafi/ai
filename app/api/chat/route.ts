import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';

// In-memory store for session histories
const sessionHistories = new Map<string, InMemoryChatMessageHistory>();


export async function POST(req: Request) {
  try {
    const { message, sessionId = "default" } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Get or create InMemoryChatMessageHistory for this session
    let history = sessionHistories.get(sessionId);
    if (!history) {
      history = new InMemoryChatMessageHistory();
      sessionHistories.set(sessionId, history);
    }

    // Add user message to history
    await history.addUserMessage(message);

    // Compose prompt with history
    const historyMessages = await history.getMessages();
    const historyText = historyMessages.map((m: any) => `${m._getType() === 'human' ? 'User' : 'AI'}: ${m.content}`).join('\n');
    const prompt = `You are MiniMind, a friendly educational AI.\nYou ALWAYS answer in JSON with this format:\n\n{\n  \"answer\": \"your response here\",\n  \"explanation\": {\n    \"steps\": [\"step 1: Say what the user asked in simple words\", \"step 2: Look at the chat history and pick out important messages\", \"step 3: Think about how to answer using what you know and the chat history\", \"step 4: Write the answer in a way that's easy to understand\"],\n    \"features_used\": [\"Gemini 2.5 Flash\", \"LangChain memory\", \"Conversation history\"],\n    \"model_logic\": \"Explain in plain, simple language how you figured out the answer. Tell what parts of the chat you used, and why you chose your answer. Pretend you are explaining to someone who is new to AI.\"\n  }\n}\n\nIn the explanation, use easy words and break things down step by step so anyone can understand how you work and think.\n\nUse conversation history:\n${historyText}\n\nUser question: ${message}`;

    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY!,
      model: "gemini-2.5-flash"
    });

    const result = await model.invoke(prompt);
    let text: string;
    if (typeof result.content === "string") {
      text = result.content;
    } else if (Array.isArray(result.content)) {
      text = result.content.map((part: any) => typeof part === "string" ? part : (part.text || "")).join("");
    } else {
      text = String(result.content);
    }

    // Add AI response to history
    await history.addAIMessage(text);

    try {
      // Clean and decode the text
      let cleanText = text.replace(/```json\n?|```/g, '').trim();
      // Decode HTML entities
      cleanText = cleanText
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      const parsed = JSON.parse(cleanText);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.log('JSON parse failed:', parseError, 'Raw text:', text);
      // If JSON parsing fails, return a structured response
      return NextResponse.json({
        answer: text.replace(/```json\n?|```/g, '').trim(),
        explanation: {
          steps: ["Generated response", "Formatted output"],
          features_used: ["Gemini 2.5 Flash"],
          model_logic: "Direct text generation"
        }
      });
    }

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      error: "Failed to process your request. Please try again.",
      details: String(error)
    }, { status: 500 });
  }
}
