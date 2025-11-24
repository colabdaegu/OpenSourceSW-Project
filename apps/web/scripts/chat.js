const log  = document.getElementById("log");
const msg  = document.getElementById("msg");
const send = document.getElementById("send");
const mic  = document.getElementById("mic");

// ===== 공용 UI =====
function append(role, text){
  const p = document.createElement("p");
  p.textContent = (role==="user" ? "🧑 " : "🤖 ") + text;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

// 로컬 기본응답 (API 실패 시)
function localBotReply(text){
  const t = (text||"").toLowerCase();
  if (!t) return "무슨 말을 해야 할지 모르겠어요 😅";
  if (t.includes("안녕")) return "안녕하세요! 마커를 비추고 질문해 보세요 📷";
  return "지금은 로컬 기본응답 모드예요. 서버가 연결되면 더 똑똑해져요 🙂";
}

// 백엔드 엔드포인트 (api/chatAPI.js → /api/chatAPI)
const CHAT_API = "/api/chatAPI";

// ===== LLM 호출 =====
async function callBot(userText){
  try{
    const r = await fetch(CHAT_API, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ message: userText })
    });

    let data = {};
    try { data = await r.json(); } catch {}

    if (!r.ok) {
      return `[오류 ${r.status}] ${data.message || "서버 응답 오류"}`;
    }
    return data.message ?? data.reply ?? localBotReply(userText);
  }catch(e){
    return localBotReply(userText);
  }
}

// ===== 전송 버튼 =====
send.onclick = async ()=>{
  const q = msg.value.trim();
  if(!q) return;

  append("user", q);
  msg.value = "";

  const waiting = document.createElement("p");
  waiting.textContent = "🤖 생각 중...";
  log.appendChild(waiting);
  log.scrollTop = log.scrollHeight;

  const a = await callBot(q);
  waiting.remove();
  append("bot", a);
};

/* -----------------------------------------------------------
   음성 입력: 모달 UI (시작/중지/적용) — 자동 전송 없음
----------------------------------------------------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

const voiceModal  = document.getElementById("voiceModal");
const voiceText   = document.getElementById("voiceText");
const voiceStatus = document.getElementById("voiceStatus");
const btnVStart   = document.getElementById("voiceStart");
const btnVStop    = document.getElementById("voiceStop");
const btnVApply   = document.getElementById("voiceApply");
const btnVClose   = document.getElementById("voiceClose");

let rec = null;
let listening = false;
let finalText = "";

function openVoiceModal(){
  if (!SR) return; // 미지원 브라우저
  voiceText.value = "";
  finalText = "";
  voiceStatus.textContent = "대기 중";
  btnVStart.disabled = false;
  btnVStop.disabled  = true;
  voiceModal.classList.remove("hidden");
}

function closeVoiceModal(){
  try { rec && rec.stop(); } catch {}
  listening = false;
  voiceModal.classList.add("hidden");
}

if (!SR) {
  mic.disabled = true;
  mic.title = "이 브라우저는 음성 인식을 지원하지 않습니다.";
} else {
  rec = new SR();
  rec.lang = "ko-KR";
  rec.interimResults = true;  // 실시간 문장 보여주기
  rec.maxAlternatives = 1;

  // 마이크 버튼 → 모달 열기
  mic.onclick = openVoiceModal;

  // 모달 내 버튼들
  btnVStart.onclick = () => { try { rec.start(); } catch {} };
  btnVStop.onclick  = () => { try { rec.stop();  } catch {} };
  btnVApply.onclick = () => {
    msg.value = (voiceText.value || finalText || "").trim(); // 입력창에만 반영
    closeVoiceModal();
  };
  btnVClose.onclick = closeVoiceModal;

  // 인식 이벤트
  rec.onstart = () => {
    listening = true;
    voiceStatus.textContent = "🎙️ 듣는 중…";
    btnVStart.disabled = true;
    btnVStop.disabled  = false;
  };
  rec.onend = () => {
    listening = false;
    voiceStatus.textContent = "⏹️ 중지됨";
    btnVStart.disabled = false;
    btnVStop.disabled  = true;
  };
  rec.onerror = (e) => {
    voiceStatus.textContent = `⚠️ 오류: ${e.error || "unknown"}`;
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
}
