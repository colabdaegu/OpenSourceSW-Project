// local-server.cjs
// 대구대학교 마스코트 '두두' AR 설명용 로컬 서버

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");

const fs = require("fs");
const path = require("path");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();


app.use(express.static(path.join(__dirname)));

// =======================
// systemPrompt: 파일에서 읽어오기
// =======================

const promptPath = path.join(__dirname, "media", "prompt", "dudu-system-prompt.txt");

let systemPrompt = "";
try {
  systemPrompt = fs.readFileSync(promptPath, "utf8");
  console.log("✅ systemPrompt loaded from:", promptPath);
  console.log("🔎 systemPrompt preview:", systemPrompt.slice(0, 200));
} catch (err) {
  console.error("⚠️ system prompt 파일을 읽지 못했습니다:", err.message);
  // 파일이 없거나 오류 날 때 사용할 기본 프롬프트
  systemPrompt = [
    "넌 대구대학교 마스코트 '두두'야.",
    "항상 두두 입장에서 1인칭으로 말해.",
    "대구대학교와 캠퍼스, 전공, 건물, 상징물 등을 학생 눈높이에 맞춰 쉽고 친근하게 설명해.",
    "답변은 말풍선 한 개 분량으로 1~2문장 정도로 짧게.",
    "말투는 밝고 친근하게, 이모지도 가끔 써도 좋지만 과하지 않게.",
    "사용자가 AR로 인식한 대상(건물/장소/마커 이름)이 문장에 들어오면, 그 대상을 중심으로 설명해.",
  ].join("\n");
}

// =======================
// ✅ AR용 정적 파일 서빙
// =======================

// 1) /docs 폴더의 파일을 정적 서빙
//app.use(express.static("docs"));
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

// docs 폴더는 /docs/... 로만 접근 가능
app.use("/docs", express.static(path.join(__dirname, "docs")));

// webxr-samples 폴더는 /webxr-samples/... 로만 접근 가능
//app.use("/webxr-samples", express.static(path.join(__dirname, "webxr-samples")));
app.get("/webxr-samples/:page", (req, res, next) => {
  const file = path.join(__dirname, "webxr-samples", req.params.page + ".html");
  if (fs.existsSync(file)) {
    return res.sendFile(req.params.page + ".html", { root: path.join(__dirname, "webxr-samples") });
  }
  next();
});



// 그 외 미들웨어
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

// =======================
// Chat 엔드포인트 (프론트에서 /chat 호출)
// =======================
app.post("/chat", async (req, res) => {
  try {
    const {
      message: userMessage,
      model = "gpt-4.1-mini",
      max_tokens = 200,
      temperature = 0.7,
    } = req.body || {};

    if (!userMessage || typeof userMessage !== "string") {
      return res
        .status(400)
        .json({ message: "message 필드는 문자열로 꼭 보내야 합니다." });
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_completion_tokens: Math.min(Number(max_tokens) || 120, 200),
      temperature,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "두두가 뭐라고 할지 잘 모르겠어… 다시 물어봐 줄래? 😅";

    return res.json({ message: reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const status = err.status || 500;
    return res
      .status(status)
      .json({ message: "[server-error] " + (err.message || "알 수 없는 오류") });
  } finally {
    // 버튼 비활성/interim 관련은 프론트에서 처리 → 백엔드는 신경 안써도 됨
  }
});

// =======================
// 서버 PORT 설정 + 실행 ✅
// =======================
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`🚀 Local chat server running on port ${PORT}`);
  console.log(`🌐 ngrok 터널로 접속 후 AR 화면이 보이면 성공입니다!`);
});