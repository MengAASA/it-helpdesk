import { NextResponse } from "next/server";
import { teamFor } from "@/app/lib/categories";
import { getCategories } from "@/app/lib/categoriesServer";

const MODEL = "openai/gpt-oss-20b";

function buildResponseSchema(categoryNames: string[]) {
  return {
    type: "object",
    properties: {
      primary: {
        type: "object",
        properties: {
          category: { type: "string", enum: categoryNames },
          confidence: {
            type: "integer",
            description: "Confidence 0-100 that this is the right category.",
          },
          reason: {
            type: "string",
            description: "One short sentence explaining the match.",
          },
        },
        required: ["category", "confidence", "reason"],
        additionalProperties: false,
      },
      alternates: {
        type: "array",
        description: "Up to 3 other plausible categories, most likely first.",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: categoryNames },
            confidence: { type: "integer" },
          },
          required: ["category", "confidence"],
          additionalProperties: false,
        },
      },
      priority: {
        type: "string",
        enum: ["Low", "Normal", "High"],
        description:
          "High only if the issue sounds urgent or work-blocking. Low if it's a minor, non-urgent request with no real deadline. Normal otherwise.",
      },
    },
    required: ["primary", "alternates", "priority"],
    additionalProperties: false,
  };
}

type ClassifyResponse = {
  primary: { category: string; confidence: number; reason: string };
  alternates: { category: string; confidence: number }[];
  priority: "Low" | "Normal" | "High";
};

export async function POST(req: Request) {
  const { description } = await req.json();

  if (typeof description !== "string" || description.trim().length < 12) {
    return NextResponse.json({ error: "Description too short" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GROQ_API_KEY" },
      { status: 500 }
    );
  }

  const categories = await getCategories();
  const categoryNames = categories.map((c) => c.name);
  const responseSchema = buildResponseSchema(categoryNames);

  const prompt = `You are an IT helpdesk ticket router for PHN. Read the issue description and pick exactly one primary category from the fixed list below, plus up to 3 alternate categories. Flag priority as "High" only if the issue sounds urgent, work-blocking, or affects many people (e.g. production down, cannot work, whole department affected). Flag priority as "Low" if it's a minor, non-urgent request with no real deadline (e.g. a cosmetic issue, a nice-to-have, a request the user says is not time-sensitive). Otherwise use "Normal".

Categories:
${categories.map((c) => `- ${c.name}`).join("\n")}

Issue description: "${description}"`;

  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ticket_classification",
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    });
  } catch (err) {
    console.error("[classify] fetch to Groq failed:", err);
    return NextResponse.json({ error: "Could not reach Groq" }, { status: 502 });
  }

  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const detail = await res.text();
    console.error(`[classify] Groq returned ${res.status} after ${latencyMs}ms:`, detail);
    return NextResponse.json(
      { error: `Groq API error (${res.status}): ${detail}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  console.log(
    `[classify] model=${data.model} latency=${latencyMs}ms tokens(in/out)=${data.usage?.prompt_tokens}/${data.usage?.completion_tokens} id=${data.id}`
  );
  const outputText: string | undefined = data.choices?.[0]?.message?.content;

  if (!outputText) {
    return NextResponse.json(
      { error: "Groq response had no output text" },
      { status: 502 }
    );
  }

  const parsed: ClassifyResponse = JSON.parse(outputText);

  return NextResponse.json({
    category: parsed.primary.category,
    confidence: parsed.primary.confidence,
    reason: parsed.primary.reason,
    team: teamFor(categories, parsed.primary.category),
    priority: parsed.priority,
    alternates: parsed.alternates.slice(0, 3).map((a) => ({
      name: a.category,
      score: a.confidence,
    })),
  });
}
