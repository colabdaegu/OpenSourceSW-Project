// =======================
// DOM 요소 가져오기
// =======================
const log  = document.getElementById("log");
const msg  = document.getElementById("msg");
const send = document.getElementById("send");
const mic  = document.getElementById("mic");
const chatPanel = document.getElementById("chat-panel");

// =======================
// 채팅 아이콘 버튼 생성 (좌측 상단 토글 버튼)
// =======================
if (chatPanel) {
  let chatOpen = true;

  const chatToggleBtn = document.createElement("button");
  chatToggleBtn.id = "chat-toggle-btn";
  chatToggleBtn.type = "button";
  chatToggleBtn.textContent = "💬";
  chatToggleBtn.title = "채팅 열기/닫기";

  Object.assign(chatToggleBtn.style, {
    position: "fixed",
    top: "12px",
    left: "12px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    fontSize: "22px",
    cursor: "pointer",
    zIndex: "9999",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    backgroundColor: "white"
  });

  chatToggleBtn.addEventListener("click", () => {
    chatOpen = !chatOpen;
    if (chatOpen) {
      chatPanel.style.display = "";
      chatToggleBtn.title = "채팅 숨기기";
    } else {
      chatPanel.style.display = "none";
      chatToggleBtn.title = "채팅 보이기";
    }
  });

  document.body.appendChild(chatToggleBtn);
}

// 지금 인식된 AR 대상(마커) 이름/설명
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

  // 🔹 최근 N개만 유지 (유저+두두 1세트 = 2개이니까 8개면 최근 4번 대화 정도)
  const MAX_MESSAGES = 8;
  while (log.children.length > MAX_MESSAGES) {
    log.removeChild(log.firstChild);
  }

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

// =======================
// 메시지 전송 로직
// =======================
async function sendMessage() {
  const text = msg.value.trim();
  if (!text) return;

  // 최근 대화 여러 개 유지 (전체 삭제 안 함)
  append("user", text);
  msg.value = "";

  send.disabled = true;
  mic.disabled  = true;

  let messageForServer = text;

  const artTarget = window.currentARTarget;
  if (artTarget) {
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

    const reply =
      data.message ||
      data.reply ||
      data.answer ||
      (typeof data === "string" ? data : JSON.stringify(data));

    append("bot", reply);
  } catch (err) {
    console.error("Chat API error:", err);
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
// 음성 인식: "토글 방식 + 말하는 대로 바로 입력"
// =======================

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let listening = false;
let finalText = "";
let tempText  = "";

function resetMicUI() {
  mic.classList.remove("recording");
  mic.textContent = "🎤";
}

if (!SR) {
  mic.disabled = true;
  mic.title = "이 브라우저는 음성 인식을 지원하지 않습니다 😢";
} else {
  rec = new SR();
  rec.lang = "ko-KR";
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  const startListen = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!rec) return;

    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

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
      listening = true;
    } catch (e) {
      console.warn("rec.start error:", e);
      listening = false;
      resetMicUI();
    }
  };

  const stopListen = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!rec) return;

    resetMicUI();

    if (!listening) return;
    listening = false;

    try {
      rec.stop();
    } catch (e) {
      console.warn("rec.stop error:", e);
    }
  };

  mic.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    if (!listening) {
      startListen(ev);
    } else {
      stopListen(ev);
    }
  });

  rec.onresult = (e) => {
    let stable = "";
    let temp   = "";

    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        stable += t;
      } else {
        temp += t;
      }
    }

    finalText = stable;
    tempText  = temp;

    const combined = (finalText + " " + tempText).trim();
    msg.value = combined; // 실시간으로 입력칸에만 반영 (focus 안 줌)
  };

  rec.onend = () => {
    console.log("rec.onend");

    const combined = (finalText + " " + tempText).trim();
    if (combined) {
      msg.value = combined; // 최종 문장 유지, 전송은 직접 버튼/엔터
    }

    listening = false;
    finalText = "";
    tempText  = "";
    resetMicUI();
  };

  rec.onerror = (e) => {
    console.error("Speech error:", e);
    listening = false;
    resetMicUI();
  };
}
