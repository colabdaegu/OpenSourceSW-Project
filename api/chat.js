// api/chat.js
// Vercel 서버리스 함수 - 프롬프트 오케스트레이션 (Azure OpenAI)

// 로컬에서 직접 Node로 테스트할 거면 아래 주석을 풀고 .env 사용 가능
// import 'dotenv/config';

const apiKey     = process.env.OPENAI_API_KEY;
const endpointRaw = process.env.ENDPOINT_URL;      // 예: https://xxx.openai.azure.com/
const deployment = process.env.DEPLOYMENT_NAME;    // 예: gpt-4o-mini
const apiVersion = process.env.API_VERSION;        // 예: 2025-01-01-preview

// endpoint 뒤에 /가 없으면 붙여서 사용
const endpoint = endpointRaw
  ? (endpointRaw.endsWith('/') ? endpointRaw : endpointRaw + '/')
  : undefined;

// 필수 환경변수 체크 (없으면 콘솔 경고 + 이후 호출에서 에러 남)
if (!apiKey || !endpoint || !deployment || !apiVersion) {
  console.error("[api/chat] 환경변수 부족:", {
    hasKey: !!apiKey,
    hasEndpoint: !!endpoint,
    hasDeployment: !!deployment,
    hasApiVersion: !!apiVersion,
  });
}

// ---------- Azure OpenAI REST 호출 헬퍼 ----------
async function callChatAzure(messages, temperature = 1.0) {
  if (!apiKey || !endpoint || !deployment || !apiVersion) {
    throw new Error("환경변수(OPENAI_API_KEY, ENDPOINT_URL, DEPLOYMENT_NAME, API_VERSION)가 설정되지 않았습니다.");
  }

  const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Azure OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

// ---------- 1단계: intent 분류 ----------
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
    const intentRaw = await callChatAzure(
      [{ role: "user", content: clsPrompt }],
      0 // temperature=0: 결정적
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

// ---------- 2단계: /api/chat 핸들러 ----------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};
    const message = body.message ?? "";
    const temperature = typeof body.temperature === "number" ? body.temperature : 1.0;

    if (!message.trim()) {
      return res.status(400).json({ message: "[bad-request] message is required" });
    }

    // 1) intent 분류
    const intent = await classifyIntent(message);
    console.log("[/api/chat] intent =", intent);

    // 2) intent별 분기
    if (intent === "professor_lecture") {
      const SYSTEM_MSG = "You are a programming professor, Your name is Jaehoon, 25 years old";

      const reply = await callChatAzure(
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

    // 혹시 모를 기타 intent
    return res.status(200).json({ message: `[fallback] intent=${intent}`, intent });
  } catch (e) {
    console.error("[/api/chat] server error:", e);
    return res
      .status(500)
      .json({ message: `[server-error] ${e.name || "Error"}: ${e.message || String(e)}` });
  }
}
