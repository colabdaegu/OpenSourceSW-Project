// =======================
// DOM 요소 가져오기
// =======================
const log  = document.getElementById("log");
const msg  = document.getElementById("msg");
const send = document.getElementById("send");
const mic  = document.getElementById("mic");

// 지금 인식된 AR 대상(마커) 이름/설명
// 나중에 index.html 쪽에서 window.currentARTarget 에 값을 넣어주면 됨.
if (!("currentARTarget" in window)) {
  window.currentARTarget = null;
}

// =======================
// 공용 UI 함수
// =======================
function append(role, text) {
  const p = document.createElement("p");

  if (role === "user") {
    p.textContent = "🧑 " + text;
    p.classList.add("msg-user");
  } else {
    p.textContent = "🟢 두두: " + text;
    p.classList.add("msg-bot");
  }

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
    return "카메라로 마커를 비추면서 궁금한 걸 물어보면 두두가 설명해 줄게요!";
  }
  return "지금은 로컬 기본응답 모드예요. 서버가 연결되면 두두가 더 똑똑해져요 🙂";
}

// =======================
// 백엔드 API 주소 (ngrok)
// =======================
const CHAT_API = "https://largando-conner-unprecedented.ngrok-free.dev/chat"; 
// ↑ ngrok 주소 바뀌면 여기만 새 주소로 교체 + /chat 붙이기

// =======================
// 메시지 전송 로직
// =======================
async function sendMessage() {
  const text = msg.value.trim();
  if (!text) return;

  // 🔹 새 질문 보낼 때마다 이전 로그 지우기 (항상 최신 대화만 보이게)
  log.innerHTML = "";

  // 사용자 메세지 로그에 추가
  append("user", text);
  msg.value = "";
  msg.focus();

  // 전송 버튼 잠깐 비활성화
  send.disabled = true;
  mic.disabled  = true;

  // 👇 서버로 보낼 실제 메시지 구성 (AR 대상 포함)
  let messageForServer = text;

  const artTarget = window.currentARTarget;
  if (artTarget) {
    // AR에서 인식된 대상이 있으면, 두두에게 그걸 중심으로 설명해 달라고 요청
    messageForServer =
      `지금 AR에서 인식된 대상은 "${artTarget}"이야.\n` +
      `대구대학교 마스코트 두두가 이 대상을 중심으로 학생에게 친근하게 설명해 줘.\n` +
      `학생 질문: ${text}`;
  }

  try {
    const resp = await fetch(CHAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageForServer,
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
    // 실패 시 로컬 기본 답변 (두두 버전)
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

// 공통: 마이크 버튼 UI 리셋
function resetMicUI() {
  mic.classList.remove("recording");
  mic.textContent = "🎤";
}

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
  rec.continuous = false;      // 한 번에 한 문장

  // 음성 인식 시작 (버튼 누를 때)
  const startListen = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!rec) return;

    // 이미 듣는 중이면 무시
    if (listening) {
      console.log("이미 듣는 중이라 start 무시");
      return;
    }

    finalText = "";
    tempText  = "";

    mic.classList.add("recording");
    mic.textContent = "🎙️ 말하는 중…";

    try {
      rec.start();
      listening = true; // start 성공했다고 가정
    } catch (e) {
      console.warn("rec.start error:", e);
      listening = false;
      resetMicUI();
    }
  };

  // 음성 인식 중지 (버튼에서 손 뗄 때)
  const stopListen = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!rec) return;

    // UI는 항상 먼저 복구
    resetMicUI();

    if (!listening) return;

    listening = false;

    try {
      rec.stop();
    } catch (e) {
      console.warn("rec.stop error:", e);
    }
  };

  // PC + 모바일 공통: Pointer 이벤트로 통합
  mic.addEventListener("pointerdown", (ev) => {
    // 마우스면 왼쪽 버튼만 허용
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    startListen(ev);
  });

  mic.addEventListener("pointerup", (ev) => {
    stopListen(ev);
  });

  mic.addEventListener("pointercancel", (ev) => {
    stopListen(ev);
  });

  mic.addEventListener("pointerleave", (ev) => {
    if (listening) stopListen(ev);
  });

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
    console.log("rec.onend");
    const text = (finalText + " " + tempText).trim();
    if (text) {
      // 👉 인식된 문장을 바로 채팅 입력칸에 적용
      msg.value = text;
      msg.focus();
    }

    listening = false;
    finalText = "";
    tempText  = "";
    resetMicUI();  // 혹시 모를 상태 꼬임 방지
  };

  rec.onerror = (e) => {
    console.error("Speech error:", e);
    listening = false;
    resetMicUI();
  };
}
