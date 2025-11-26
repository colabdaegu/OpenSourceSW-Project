// =======================
// DOM 요소 가져오기
// =======================
const log  = document.getElementById("log");
const msg  = document.getElementById("msg");
const send = document.getElementById("send");
const mic  = document.getElementById("mic");

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
    // FastAPI/Node 백엔드로 POST
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
// 음성 인식: 구글 번역처럼 "꾹 누르고 말하기"
// =======================

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let listening = false;
let finalText = "";
let tempText  = "";

// 브라우저에서 음성 인식 객체 지원 확인
if (!SR) {
  // 지원 안 하면 마이크 비활성화
  mic.disabled = true;
  mic.title = "이 브라우저는 음성 인식을 지원하지 않습니다 😢";
} else {
  rec = new SR();
  rec.lang = "ko-KR";          // 한국어
  rec.interimResults = true;   // 말하는 동안 중간 결과도 받기
  rec.maxAlternatives = 1;

  // 음성 인식 시작 (버튼 누를 때)
  const startListen = (ev) => {
    ev.preventDefault();
    if (!rec || listening) return;

    listening = true;
    finalText = "";
    tempText  = "";

    mic.classList.add("recording");
    mic.textContent = "🎙️ 말하는 중…";

    try {
      rec.start();
    } catch (e) {
      console.warn("rec.start error:", e);
    }
  };

  // 음성 인식 중지 (버튼에서 손 뗄 때)
  const stopListen = (ev) => {
    ev.preventDefault();
    if (!rec || !listening) return;

    listening = false;

    try {
      rec.stop();
    } catch (e) {
      console.warn("rec.stop error:", e);
    }
  };

  // PC 마우스 + 모바일 터치 둘 다 지원
  mic.addEventListener("mousedown", startListen);
  mic.addEventListener("touchstart", startListen);
  mic.addEventListener("mouseup", stopListen);
  mic.addEventListener("mouseleave", stopListen);
  mic.addEventListener("touchend", stopListen);
  mic.addEventListener("touchcancel", stopListen);

  // 인식 결과 처리
  rec.onresult = (e) => {
    let stable = "";
    let temp   = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) stable += t;
      else temp += t;
    }

    finalText += stable;
    tempText   = temp;
  };

  // 인식이 끝났을 때(손 뗀 후 + 처리 완료)
  rec.onend = () => {
    mic.classList.remove("recording");
    mic.textContent = "🎤";

    const text = (finalText + " " + tempText).trim();
    if (text) {
      // 👉 인식된 문장을 바로 채팅 입력칸에 적용
      msg.value = text;
      msg.focus();
    }

    listening = false;
    finalText = "";
    tempText  = "";
  };

  rec.onerror = (e) => {
    console.error("Speech error:", e);
    mic.classList.remove("recording");
    mic.textContent = "🎤";
    listening = false;
  };
}
