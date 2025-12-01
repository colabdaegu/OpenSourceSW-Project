// api/chatAPI.js
// Vercel Serverless Function — OpenAI 직결 + 프롬프트 오케스트레이션

import OpenAI from "openai";

// Vercel 대시보드에 OPENAI_API_KEY 등록 필수
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 공통 헬퍼: Chat Completions 호출
async function callChat(messages, temperature = 0.7, model = "gpt-4o-mini") {
  const r = await client.chat.completions.create({
    model,
    temperature,
    messages,
  });
  const content = r?.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

// 1단계: 의도(intent) 분류
async function classifyIntent(msg) {
  const clsPrompt = `
Your job is to classify intent.

Choose one of the following intents:
- professor_lecture
- Major_support
- Scholarship_support

User: ${msg}
Intent:
  `.trim();

  try {
    const intentRaw = await callChat(
      [{ role: "user", content: clsPrompt }],
      0 // deterministic
    );

    const intent = intentRaw.split(/\s+/)[0].trim();
    if (["professor_lecture", "Major_support", "Scholarship_support"].includes(intent)) {
      return intent;
    }
    return "professor_lecture"; // fallback
  } catch (e) {
    console.error("[classifyIntent] error:", e);
    return "professor_lecture";
  }
}

// 2단계: 실제 핸들러
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "[server-error] OPENAI_API_KEY is missing" });
    }

    // 바디 안전 파싱
    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }

    const message = (body.message ?? "").toString();
    const temperature = typeof body.temperature === "number" ? body.temperature : 0.7;

    if (!message.trim()) {
      return res.status(400).json({ message: "[bad-request] message is required" });
    }

    // 의도 분류
    const intent = await classifyIntent(message);
    console.log("[/api/chatAPI] intent =", intent);

    // 의도별 분기
    if (intent === "professor_lecture") {
      const SYSTEM_MSG = "You are a programming professor. Your name is Jaehoon, 25 years old.";
      const reply = await callChat(
        [
          { role: "system", content: SYSTEM_MSG },
          { role: "user", content: message },
        ],
        temperature
      );
      return res.status(200).json({ message: reply, intent });
    }

    if (intent === "Major_support") {
      return res.status(200).json({
        message: "Here is Department Support number: 1234567890",
        intent,
      });
    }

    if (intent === "Scholarship_support") {
      return res.status(200).json({
        message: "Here is Scholarship Support number: 0987654321",
        intent,
      });
    }

    // 기타
    return res.status(200).json({ message: `[fallback] intent=${intent}`, intent });
  } catch (e) {
    console.error("[/api/chatAPI] server error:", e);
    return res
      .status(500)
      .json({ message: `[server-error] ${e.name || "Error"}: ${e.message || String(e)}` });
  }
} 
