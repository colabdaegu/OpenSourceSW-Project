// =======================
// DOM 요소 가져오기
// =======================
const log  = document.getElementById("log");
const msg  = document.getElementById("msg");
const send = document.getElementById("send");
const mic  = document.getElementById("mic");

// 음성 인식 모달 관련
const voiceModal  = document.getElementById("voiceModal");
const voiceStatus = document.getElementById("voiceStatus");
const voiceText   = document.getElementById("voiceText");
const btnVClose   = document.getElementById("voiceClose");
const btnVStart   = document.getElementById("voiceStart");
const btnVStop    = document.getElementById("voiceStop");
const btnVApply   = document.getElementById("voiceApply");

// =======================
// 공용 UI 함수
// =======================
function append(role, text) {
  const p = document.createElement("p");
  p.textContent = (role === "user" ? "🧑 " : "🤖 ") + text;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

// 로컬 기본 응답 (서버 실패 시)
function localBotReply(text) {
  const t = (text || "").toLowerCase();
  if (!t) return "무슨 말을 해야 할지 모르겠어요 😅";
  if (t.includes("안녕") || t.includes("hello")) {
    return "안녕하세요! Hiro 마커를 비추고 질문해 보세요 📷";
  }
  if (t.includes("도움") || t.includes("help")) {
    return "카메라로 마커를 비추면서 궁금한 걸 물어보면 대답해 드릴게요!";
  }
  return "지금은 로컬 기본응답 모드예요. 서버가 연결되면 더 똑똑해져요 🙂";
}

// =======================
// 백엔드 API 주소 (FastAPI + ngrok)
// =======================
// 예시: const CHAT_API = "https://xxxx-xxxx.ngrok-free.dev/chat";
const CHAT_API = "https://largando-conner-unprecedented.ngrok-free.dev/chat"; // <- 여기 본인 주소로 수정 가능

// =======================
// 메시지 전송 로직
// =======================
async function sendMessage() {
  const text = msg.value.trim();
  if (!text) return;

  // 사용자 메세지 로그에 추가
  append("user", text);
  msg.value = "";
  msg.focus();

  // 전송 버튼 잠깐 비활성화
  send.disabled = true;
  mic.disabled  = true;

  try {
    // FastAPI 백엔드로 POST
    const resp = await fetch(CHAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        model: "gpt-4.1-mini",
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!resp.ok) {
      throw new Error("HTTP " + resp.status);
    }

    const data = await resp.json();

    // 서버에서 오는 필드명에 따라 선택
    const reply =
      data.message ||
      data.reply ||
      data.answer ||
      (typeof data === "string" ? data : JSON.stringify(data));

    append("bot", reply);
  } catch (err) {
    console.error("Chat API error:", err);
    // 실패 시 로컬 기본 답변
    append("bot", localBotReply(text));
  } finally {
    send.disabled = false;
    mic.disabled  = false;
  }
}

// 버튼/엔터키 바인딩
send.addEventListener("click", sendMessage);

msg.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// =======================
// 음성 입력 모달 관련
// =======================
let rec = null;
let finalText = "";

// 브라우저에서 음성 인식 객체 지원 확인
function getSpeechRecognition() {
  const SR =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
  return SR ? new SR() : null;
}

// 모달 열기
mic.addEventListener("click", () => {
  voiceModal.classList.remove("hidden");
  voiceStatus.textContent = "대기 중";
  voiceText.value = "";
});

// 모달 닫기
btnVClose.addEventListener("click", () => {
  if (rec) {
    rec.stop();
    rec = null;
  }
  voiceModal.classList.add("hidden");
});

// 음성 -> 텍스트 적용
btnVApply.addEventListener("click", () => {
  msg.value = voiceText.value.trim();
  voiceModal.classList.add("hidden");
  msg.focus();
});

// 음성 인식 시작
btnVStart.addEventListener("click", () => {
  const SR = getSpeechRecognition();
  if (!SR) {
    alert("이 브라우저는 음성 인식을 지원하지 않습니다 😢");
    return;
  }

  if (rec) {
    rec.stop();
    rec = null;
  }

  rec = SR;
  rec.lang = "ko-KR";       // 한국어
  rec.interimResults = true;
  rec.continuous = true;

  finalText = "";
  voiceText.value = "";
  voiceStatus.textContent = "🎙 듣는 중...";

  btnVStart.disabled = true;
  btnVStop.disabled  = false;

  rec.onstart = () => {
    voiceStatus.textContent = "🎙 듣는 중...";
  };

  rec.onerror = (e) => {
    console.error("Speech error:", e);
    voiceStatus.textContent = `⚠️ 오류: ${e.error || "unknown"}`;
    btnVStart.disabled = false;
    btnVStop.disabled  = true;
  };

  rec.onend = () => {
    voiceStatus.textContent = "🛑 중지됨";
    btnVStart.disabled = false;
    btnVStop.disabled  = true;
  };

  rec.onresult = (e) => {
    let temp = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else temp += t;
    }
    voiceText.value = (finalText + (temp ? " " + temp : "")).trim();
  };

  rec.start();
});

// 음성 인식 중지
btnVStop.addEventListener("click", () => {
  if (rec) {
    rec.stop();
    rec = null;
  }
  voiceStatus.textContent = "🛑 중지됨";
  btnVStart.disabled = false;
  btnVStop.disabled  = true;
});
