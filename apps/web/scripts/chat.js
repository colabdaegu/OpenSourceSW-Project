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
  try{
    const r = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message: userText })
    });
    if(!r.ok) throw new Error("Bad response");
    const data = await r.json();
    return data.reply || "(응답 없음)";
  }catch(e){
    return "데모 모드: API 프록시가 없어요. Vercel로 올리면 실제 LLM 응답을 받을 수 있어요.";
  }
}

send.onclick = async ()=>{
  const q = msg.value.trim(); if(!q) return;
  append("user", q); msg.value="";
  const a = await callBot(q);
  append("bot", a);
};

// (선택) 음성 입력
let rec;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  rec = new SR(); rec.lang="ko-KR"; rec.interimResults=false;
  mic.onclick = ()=> rec.start();
  rec.onresult = (e)=>{ msg.value = e.results[0][0].transcript; send.onclick(); };
}else{
  mic.disabled = true; mic.title = "이 브라우저는 음성 인식을 지원하지 않습니다.";
}
