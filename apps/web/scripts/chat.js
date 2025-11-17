const log = document.getElementById("log");
const msg = document.getElementById("msg");
const send = document.getElementById("send");
const mic  = document.getElementById("mic");

function append(role, text){
  const p = document.createElement("p");
  p.textContent = (role==="user" ? "🧑 " : "🤖 ") + text;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

async function callBot(userText){
  try {
    const r = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message: userText })
    });

    let data = {};
    try {
      data = await r.json();
    } catch (e) {
      console.error("JSON 파싱 오류", e);
    }

    // 상태 코드가 200이 아니면 에러 내용 보여주기
    if (!r.ok) {
      console.error("API 에러", r.status, data);
      return `[오류 ${r.status}] ${data.message || "서버 응답 오류"}`;
    }

    // 서버에서는 { message: "..." } 형태로 응답함
    // (혹시 reply로 오는 경우도 대비)
    return data.message || data.reply || "(응답 없음)";
  } catch(e){
    console.error("fetch 실패", e);
    return "서버 연결 실패(fetch 에러)";
  }
}

send.onclick = async ()=>{
  const q = msg.value.trim(); 
  if(!q) return;

  append("user", q); 
  msg.value="";

  const a = await callBot(q);
  append("bot", a);
};

// (선택) 음성 입력
let rec;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  rec = new SR(); 
  rec.lang="ko-KR"; 
  rec.interimResults=false;

  mic.onclick = ()=> rec.start();
  rec.onresult = (e)=>{
    msg.value = e.results[0][0].transcript;
    send.onclick();
  };
}else{
  mic.disabled = true; 
  mic.title = "이 브라우저는 음성 인식을 지원하지 않습니다.";
}