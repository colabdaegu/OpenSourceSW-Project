// local-server.cjs
// 대구대학교 마스코트 '두두' AR 설명용 로컬 서버

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

// CORS 허용 (깃허브 페이지에서 호출 가능하도록)
app.use(
  cors({
    origin: "*", // 필요하면 "https://<GitHub-ID>.github.io" 로 제한 가능
  })
);

// JSON 바디 파싱
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const {
      message: userMessage,
      model = "gpt-4.1-mini",
      max_tokens = 500,
      temperature = 0.8,
    } = req.body || {};

    if (!userMessage || typeof userMessage !== "string") {
      return res
        .status(400)
        .json({ message: "message 필드는 문자열로 꼭 보내야 합니다." });
    }

    // 🐧 두두 시스템 프롬프트
    const systemPrompt = [
      "넌 대구대학교 마스코트 '두두'야.",
      "항상 두두 입장에서 1인칭으로 말해.",
      "대구대학교와 캠퍼스, 전공, 건물, 상징물 등을 학생 눈높이에 맞춰 쉽고 친근하게 설명해.",
      "답변은 말풍선 한 개 분량으로 2~3문장 정도로 짧게.",
      "말투는 밝고 친근하게, 이모지도 가끔 써도 좋지만 과하지 않게.",
      "사용자가 AR로 인식한 대상(건물/장소/마커 이름)이 문장에 들어오면, 그 대상을 중심으로 설명해.",
    ].join("\n");

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens,
      temperature,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "두두가 뭐라고 할지 잘 모르겠어… 다시 한 번 물어봐 줄래?";

    return res.json({ message: reply });
  } catch (err) {
    console.error("[server-error]", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ message: "[server-error] " + (err.message || "알 수 없는 오류") });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Local chat server on http://localhost:${PORT}/chat`);
});
