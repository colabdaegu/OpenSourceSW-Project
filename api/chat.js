// api/chat.js — OpenAI(일반) 사용
// 로컬에서 .env 쓰려면 주석 해제: import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // sk-... 일반 OpenAI 키
});

// 인텐트 분류
async function classifyIntent(msg) {
  const prompt =
`Your job is to classify intent.
Choose one of: professor_lecture, Major_support, Scholarship_support.
User: ${msg}
Intent:`;
  const r = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });
  const intent = (r.choices?.[0]?.message?.content || "").trim();
  return ["professor_lecture","Major_support","Scholarship_support"].includes(intent)
    ? intent : "professor_lecture";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const { message, temperature = 1.0 } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ message: "message is required" });

    const intent = await classifyIntent(message);

    if (intent === "Major_support")
      return res.json({ message: "Here is Department Support number: 1234567890", intent });

    if (intent === "Scholarship_support")
      return res.json({ message: "Here is Scholarship Support number: 0987654321", intent });

    const SYSTEM_MSG = "You are a programming professor, Your name is Jaehoon, 25 years old";
    const r = await client.chat.completions.create({
      model: "gpt-4.1-mini", // 필요시 "gpt-4.1"로 변경
      messages: [
        { role: "system", content: SYSTEM_MSG },
        { role: "user",   content: message },
      ],
      temperature,
    });

    const reply = r.choices?.[0]?.message?.content ?? "(no content)";
    return res.json({ message: reply, intent });
  } catch (e) {
    console.error("[/api/chat] error:", e);
    return res.status(500).json({ message: `[server-error] ${e.name||"Error"}: ${e.message||String(e)}` });
  }
}
