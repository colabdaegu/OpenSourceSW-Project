// local-server.cjs
// 깃허브 Pages + ngrok 전용 로컬 서버 (CommonJS 버전)

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

// JSON 바디 파싱
app.use(express.json());

// CORS (개발용: 전부 허용, 나중엔 특정 도메인만 허용해도 됨)
app.use(
  cors({
    origin: "*", // 나중에 "https://USERNAME.github.io" 로 바꿔도 됨
  })
);

// /chat 엔드포인트
app.post("/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const userMessage = body.message || "";

    if (!userMessage) {
      return res.status(400).json({ message: "message 가 비어 있습니다." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "너는 친절한 AR 안내 챗봇이야." },
        { role: "user", content: userMessage },
      ],
      max_tokens: 256,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    return res.json({ message: reply });
  } catch (err) {
    console.error("[server-error]", err);
    return res
      .status(500)
      .json({ message: "[server-error] " + (err.message || "알 수 없는 오류") });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Local chat server running at http://localhost:${PORT}/chat`);
});
