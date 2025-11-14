import { NextRequest } from "next/server";
import { getWeatherForCity, getWikiSummary } from "@/lib/tools";

export const runtime = "nodejs";

function parseIntent(message: string): { type: string; arg?: string } {
  const m = message.toLowerCase().trim();

  const weatherMatch = m.match(/weather (?:in|at|for)\s+([a-zA-Z\s\-]+)\??/);
  if (weatherMatch) return { type: "weather", arg: weatherMatch[1] };
  if (m.startsWith("weather ")) {
    const rest = m.replace(/^weather\s+/, "").trim();
    if (rest) return { type: "weather", arg: rest };
  }

  const whoMatch = m.match(/^(?:who|what)\s+(?:is|was)\s+(.+?)\??$/);
  if (whoMatch) return { type: "wiki", arg: whoMatch[1] };
  const defineMatch = m.match(/^define\s+(.+?)\??$/);
  if (defineMatch) return { type: "wiki", arg: defineMatch[1] };

  if (/^(?:time|what's the time|current time)/.test(m)) return { type: "time" };

  return { type: "chat" };
}

async function chatWithOpenAI(userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return ""; // signal no-key

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You are Jarvis, a concise, proactive assistant. Be helpful and practical."
        },
        { role: "user", content: userMessage }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const reply = data.choices?.[0]?.message?.content?.trim();
  return reply || "";
}

export async function POST(req: NextRequest) {
  try {
    const { message } = (await req.json()) as { message?: string };
    const userMessage = (message || "").trim();
    if (!userMessage) {
      return Response.json({ reply: "Please provide a message." }, { status: 400 });
    }

    const intent = parseIntent(userMessage);

    if (intent.type === "weather" && intent.arg) {
      const reply = await getWeatherForCity(intent.arg);
      return Response.json({ reply });
    }

    if (intent.type === "wiki" && intent.arg) {
      const reply = await getWikiSummary(intent.arg);
      return Response.json({ reply });
    }

    if (intent.type === "time") {
      const now = new Date();
      const reply = `The current time is ${now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      })}.`;
      return Response.json({ reply });
    }

    // Default: try OpenAI, otherwise fallback
    const ai = await chatWithOpenAI(userMessage);
    if (ai) return Response.json({ reply: ai });

    // Fallback heuristic response
    const fallback =
      "I'm operating in local mode. Try asking for weather, quick facts, or provide an OpenAI key.";
    return Response.json({ reply: fallback });
  } catch (err: any) {
    return Response.json(
      { reply: `I ran into an error: ${err?.message || "unknown"}` },
      { status: 500 }
    );
  }
}
