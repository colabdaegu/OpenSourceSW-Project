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
  rec.continuous = false;      // 한 번 누를 때 한 문장만 인식

  // 음성 인식 시작 (버튼 누를 때)
  const startListen = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!rec) return;

    // 이미 듣는 중이면 또 시작하지 않음
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
      // ⬆ start가 성공한 뒤에만 listening = true
      listening = true;
    } catch (e) {
      console.warn("rec.start error:", e);
      listening = false;
      resetMicUI(); // 에러 나면 버튼 상태 복구
    }
  };

  // 음성 인식 중지 (버튼에서 손 뗄 때)
  const stopListen = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!rec) return;

    // 그래도 혹시 모르니 UI는 항상 복구
    resetMicUI();

    if (!listening) {
      return;
    }

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
    resetMicUI();  // 혹시 몰라 한 번 더 복구
  };

  rec.onerror = (e) => {
    console.error("Speech error:", e);
    listening = false;
    resetMicUI();
  };
}
