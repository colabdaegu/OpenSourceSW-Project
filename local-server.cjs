// local-server.cjs
// 대구대학교 마스코트 '두두' AR 설명용 로컬 서버

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");
const path = require("path");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

app.use("/docs", express.static(path.join(__dirname, "docs")));

app.get("/webxr/:page", (req, res, next) => {
  const fs = require("fs");
  const file = path.join(__dirname, "webxr", req.params.page + ".html");
  if (fs.existsSync(file)) {
    return res.sendFile(req.params.page + ".html", { root: path.join(__dirname, "webxr") });
  }
  next();
});

app.get("/webxr-samples/:page", (req, res, next) => {
  const fs = require("fs");
  const file = path.join(__dirname, "webxr-samples", req.params.page + ".html");
  if (fs.existsSync(file)) {
    return res.sendFile(req.params.page + ".html", { root: path.join(__dirname, "webxr-samples") });
  }
  next();
});

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

// =======================
// Chat 엔드포인트
//  - 프론트가 messages를 보내면 그대로 사용
//  - 아니면 message만 user로 처리 (샘플용 기본 동작)
// =======================
app.post("/chat", async (req, res) => {
  try {
    const {
      message: userMessage,
      messages, // ✅ 새로 추가: [{role, content}, ...]
      model = "gpt-4.1-mini",
      max_tokens = 200,
      temperature = 0.7,
    } = req.body || {};

    let finalMessages = null;

    if (Array.isArray(messages) && messages.length > 0) {
      finalMessages = messages;
    } else {
      if (!userMessage || typeof userMessage !== "string") {
        return res
          .status(400)
          .json({ message: "message 필드는 문자열로 꼭 보내야 합니다." });
      }
      finalMessages = [{ role: "user", content: userMessage }];
    }

    const completion = await client.chat.completions.create({
      model,
      messages: finalMessages,
      max_completion_tokens: Math.min(Number(max_tokens) || 120, 200),
      temperature,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "두두가 뭐라고 할지 잘 모르겠어… 다시 물어봐 줄래?";

    return res.json({ message: reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ message: "[server-error] " + (err.message || "알 수 없는 오류") });
  }
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`🚀 Local chat server running on port ${PORT}`);
});