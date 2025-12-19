if (
  window.location.pathname.startsWith("/webxr/")
) {
  
  // =======================
  //  두두 TTS (Web Speech)
  // =======================
  const synth = window.speechSynthesis || null;
  let duduVoice = null;

  function pickKoreanVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    // lang 이 ko 로 시작하는 음성 찾기
    duduVoice =
      voices.find(v => v.lang && v.lang.startsWith("ko")) ||
      voices.find(v => v.lang && v.lang.toLowerCase().includes("ko"));
    console.log("🎙 선택된 두두 음성:", duduVoice?.name, duduVoice?.lang);
  }

  // 크롬은 비동기로 로드됨
  if (synth) {
    pickKoreanVoice();
    synth.onvoiceschanged = pickKoreanVoice;
  }

  // listening / listeningOn 변수는 아래에서 이미 선언되니,
  // 함수 안에서만 사용(호이스팅으로 접근 가능)
  function speakDudu(text) {
    if (!synth) return;          // 지원 안 하는 브라우저
    if (typeof text !== "string" || !text.trim()) return;           // 입력되지 않음
    if (typeof listeningOn !== "undefined" && !listeningOn) return; // 음소거 버튼으로 끔
    if (typeof listening !== "undefined" && listening) return;      // 내가 말하는 동안은 읽지 않기

    synth.cancel(); // 이전 말 끊기

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    if (duduVoice) utter.voice = duduVoice;

    // 말투 세부 조절
    utter.rate = 1.0;   // 말속도 (0.1 ~ 10)
    utter.pitch = 1.05; // 톤
    utter.volume = 1.0; // 볼륨

    synth.speak(utter);
  }


  // 공용 BGM 설정
  const SOUND_FILES = {
    1: "../media/sound/click.ogg",   // 기본 클릭음
    2: "../media/sound/click-2.ogg",
    3: "../media/sound/enter.ogg",
    5: "../media/sound/entrance.ogg",
  };

  const soundPlayers = {};

  // Audio 객체
  Object.keys(SOUND_FILES).forEach((id) => {
    const audio = new Audio(SOUND_FILES[id]);
    audio.preload = "auto";
    soundPlayers[id] = audio;
  });

  // 번호로 사운드 재생
  function playUiSound(id) {
    const audio = soundPlayers[id];
    if (!audio) return;

    try {
      audio.currentTime = 0;
      audio.play();
    } catch (e) {
      console.warn("UI sound play error:", e);
    }
  }



  // =======================
  // 프롬프트 로드 (프론트에서 읽기)
  // =======================
  const PROMPT_URLS = {
    base: "/media/prompt/dudu-system-prompt.txt",
    college: "/media/prompt/college-info.txt",
    dept: "/media/prompt/dept-info.txt",
  };

  const promptCache = {
    base: null,
    college: null,
    dept: null,
  };

  async function loadPrompt(kind) {
    if (promptCache[kind]) return promptCache[kind];

    const url = PROMPT_URLS[kind];
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`Prompt load failed: ${kind} (${resp.status})`);
    }
    const text = await resp.text();
    promptCache[kind] = text;
    return text;
  }

  // 페이지 진입 시 base 프롬프트 미리 로드
  loadPrompt("base").catch((e) => console.warn("base prompt preload failed:", e));



  // =======================
  // 설정 값
  // =======================

  // 화면에 유지할 최대 메시지 수
  const MAX_LOG_MESSAGES = 6;

  // 학과 소개 버튼이 보낼 숨겨진 질문
  // IT·공과대학 소개 요약 요청용 프롬프트 (2~3줄)
  const COLLEGE_SUMMARY_PROMPT =
    "대구대학교 IT·공과대학에 대해 1~2문장으로 아주 짧게 요약해서 소개해줘.\n\n" +
    "이것은 단순한 설명을 위한 프롬포트이므로, 더 궁금한 것이 있으면 알려주세요와 같은 필요없는 말은 절대로 하지 말 것.";

  const DEPT_SUMMARY_PROMPT =
    "대구대학교의 컴퓨터소프트웨어전공에 대해 1~2문장으로 아주 짧게 소개해줘. 무엇을 배우는지와 졸업 후 진로 중심으로.\n\n" +
    "이것은 단순한 설명을 위한 프롬포트이므로, 더 궁금한 것이 있으면 알려주세요와 같은 필요없는 말은 절대로 하지 말 것.";


  // =======================
  // DOM 요소 가져오기
  // =======================
  const log  = document.getElementById("log");
  const msg  = document.getElementById("msg");
  const send = document.getElementById("send");
  const mic  = document.getElementById("mic");
  const deptBtn = document.getElementById("deptInfoBtn");
  const chatToggle = document.getElementById("chatToggle");
  const listeningBtn = document.getElementById("listeningBtn");
  const guitarBtn = document.getElementById("guitarBtn");
  const duduLabel = document.getElementById("dudu-label");

  let currentCharNum = 0;
  const char1Toggle = document.getElementById("char1Toggle");
  const char2Toggle = document.getElementById("char2Toggle");
  const char3Toggle = document.getElementById("char3Toggle");
  const charButtons = [char1Toggle, char2Toggle, char3Toggle];

  const collegeDescriptionBtn = document.getElementById("collegeDescriptionBtn");
  const departmentDescriptionBtn = document.getElementById("departmentDescriptionBtn");

  // 어떤 버튼이 선택됐는지 UI 반영
  function updateCharButtonUI(activeIndex) {
    charButtons.forEach((btn, i) => {
      if (!btn) return;
      if (i === activeIndex) {
        btn.classList.add("is-active");
      } else {
        btn.classList.remove("is-active");
      }
    });
  }

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
      p.textContent = "🎓 " + text;
      p.classList.add("msg-user");
    } else {
      p.textContent = "🟢 두두: " + text;
      p.classList.add("msg-bot");
    }

    log.appendChild(p);

    // 🔹 오래된 메시지 지우기 (최신 MAX_LOG_MESSAGES개만 유지)
    while (log.children.length > MAX_LOG_MESSAGES) {
      log.removeChild(log.firstChild);
    }

    log.scrollTop = log.scrollHeight;
  }

  // 로컬 기본 응답 (서버 실패 시)
  function localBotReply(text) {
    const t = (text || "").toLowerCase();
    if (!t) return "무슨 말을 해야 할지 모르겠어요 😅";
    return "API에 문제가 있거나 설정이 완료되지 않았습니다! .env 환경 변수 파일을 확인해주세요 🙂";
  }

  // =======================
  // 백엔드 API 주소 (ngrok)
  // =======================
  if (!window.NGROK_CONFIG || !window.NGROK_CONFIG.NGROK_ADDRESS) {
    throw new Error("ngrok-address.js의 NGROK_CONFIG.NGROK_ADDRESS가 설정되지 않았습니다.");
  }
  const MY_NGROK_ADDRESS = window.NGROK_CONFIG.NGROK_ADDRESS;

  // =======================
  // 메시지 전송 로직
  // =======================
  // overrideText : 버튼 등에서 강제로 보낼 텍스트 (null이면 입력창 내용 사용)
  // options.skipUserLog  : true면 유저 메시지를 로그에 표시하지 않음
  // options.ignoreARTarget : true면 AR 대상 정보 붙이지 않음
  async function sendMessage(overrideText = null, options = {}) {
    const {
      skipUserLog = false,
      ignoreARTarget = false,
      promptExtraKind = null,
    } = options;

    const text = (overrideText !== null && overrideText !== undefined)
      ? String(overrideText).trim()
      : msg.value.trim();

    if (!text) return;

    // 사용자 메세지 로그에 추가
    if (!skipUserLog) {
      append("user", text);
    }

    // 입력창에서 보낸 경우에만 입력창 비우기
    if (overrideText === null || overrideText === undefined) {
      msg.value = "";
      // 모바일 키보드 닫기 위해 포커스 제거
      if (document.activeElement === msg) {
        msg.blur();
      }
    }

    // 전송 버튼 잠깐 비활성화
    send.disabled = true;
    mic.disabled  = true;

    // 서버로 보낼 실제 메시지 구성 (AR 대상 포함 여부 선택)
    let messageForServer = text;
    const artTarget = window.currentARTarget;

    if (!ignoreARTarget && artTarget) {
      messageForServer =
        `지금 AR에서 인식된 대상은 "${artTarget}"이야.\n` +
        `대구대학교 마스코트 두두가 이 대상을 중심으로 학생에게 친근하게 설명해 줘.\n` +
        `학생 질문: ${text}`;
    }



    // =======================
    // system prompt 구성
    // =======================
    let basePrompt = "";
    try {
      basePrompt = await loadPrompt("base");
    } catch (e) {
      console.warn("base prompt load failed, sending without system:", e);
      basePrompt = "";
    }

    let extraPrompt = "";
    if (promptExtraKind) {
      try {
        extraPrompt = await loadPrompt(promptExtraKind);
      } catch (e) {
        console.warn(`${promptExtraKind} prompt load failed:`, e);
        extraPrompt = "";
      }
    }

    const systemContent = [basePrompt, extraPrompt].filter(Boolean).join("\n\n");

    const messagesToSend = [];
    if (systemContent.trim().length > 0) {
      messagesToSend.push({ role: "system", content: systemContent });
    }
    messagesToSend.push({ role: "user", content: messageForServer });




    try {
      const resp = await fetch(MY_NGROK_ADDRESS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend,
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


      // 두두가 말해주기
      if (window.hasDuduPlaced && typeof speakDudu === "function") {
        speakDudu(reply);
      }
      
      // !!!!! 두두 머리 위 말풍선에도 같은 텍스트 표시
      if (duduLabel) {
        if (window.hasDuduPlaced) {
          duduLabel.textContent = reply;
          duduLabel.style.display = "block";
        } else {
          // 두두가 없으면 중앙에 뜨지 않도록 강제 숨김
          duduLabel.style.display = "none";
        }
      }
    } catch (err) {
      console.error("Chat API error:", err);
      // 실패 시 로컬 기본 답변 (두두 버전)
      append("bot", localBotReply(text));
    } finally {
      send.disabled = false;
      mic.disabled  = false;
    }
  }

  // 버튼/엔터키 바인딩 (텍스트 입력용)
  send.addEventListener("click", () => {
    if (msg.value.trim().length > 0) {
      playUiSound(3);
      sendMessage();
    }

    if (duduLabel) duduLabel.style.display = "none";
  });

  msg.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
    if (msg.value.trim().length > 0) {
      playUiSound(3);
      sendMessage();
    }

      if (duduLabel) duduLabel.style.display = "none";
    }
  });

  // 왼쪽 위 '채팅창 열고닫기' 버튼 → 로그만 숨기기/보이기
  if (chatToggle) {
    chatToggle.addEventListener("click", () => {
      playUiSound(1);
      const logEl = document.getElementById("log");
      if (!logEl) return;

      // 현재 상태 판단
      const isHidden = logEl.style.display === "none";

      if (isHidden) {
        // 로그 보이기
        logEl.style.display = "block";
      } else {
        // 로그 숨기기
        logEl.style.display = "none";
      }
    });
  }

  // 오른쪽 위 '학과 소개' 버튼 → 숨겨진 질문으로 학과 설명 받기
  if (deptBtn) {
    deptBtn.addEventListener("click", () => {
      playUiSound(1);
      sendMessage(DEPT_SUMMARY_PROMPT, {
        skipUserLog: true,      // 유저 질문은 로그에 안 보이게
        ignoreARTarget: true,   // AR 마커 문구도 붙이지 않게
      });
    });
  }

  // =======================
  // 음성 인식
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
    mic.title = "이 브라우저는 음성 인식을 지원하지 않습니다!";
  } else {
    rec = new SR();
    rec.lang = "ko-KR";          // 한국어
    rec.interimResults = true;   // 말하는 동안 중간 결과도 받기
    rec.maxAlternatives = 1;
    rec.continuous = false;      // 한 번에 한 문장

    // 음성 인식 시작 (토글: 듣기 시작)
    const startListen = (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      if (!rec) return;

      // 다른 입력에 포커스 있으면 먼저 blur (모바일 키보드 내리기)
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

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

    // 음성 인식 중지 (토글: 듣기 종료)
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

    // 한 번 누르면 시작, 다시 누르면 종료 (PC+모바일 공통)
    mic.addEventListener("pointerdown", (ev) => {
      // TTS 중단
      if (synth) synth.cancel();

      // 마우스면 왼쪽 버튼만 허용
      if (ev.pointerType === "mouse" && ev.button !== 0) return;

      // 마이크 누르면 두두 라벨 숨김
      if (duduLabel) duduLabel.style.display = "none";

      if (!listening) {
        // 듣기 시작
        startListen(ev);
      } else {
        // 듣기 종료
        stopListen(ev);
      }
    });

    // 인식 결과 처리: 말하는 대로 바로 입력창에 반영
    rec.onresult = (e) => {
      let stable = "";
      let temp   = "";

      // 전체 결과 다시 조합 (구글 번역 스타일)
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

      // 말하는 대로 바로 입력칸에 표시
      msg.value = combined;
      // 경고) focus를 주지 않아야 모바일 키보드가 튀어나오지 않음
    };

    // 인식이 끝났을 때(조용해지거나 stopListen 호출 후)
    rec.onend = () => {
      console.log("rec.onend");

      const combined = (finalText + " " + tempText).trim();
      if (combined) {
        // 최종 텍스트를 입력칸에 그대로 둠 (사용자는 직접 전송 버튼/엔터를 눌러야 함)
        msg.value = combined;
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


  // 음성 듣기 설정
  let listeningOn = true;

  if (listeningBtn) {
      listeningBtn.addEventListener("click", () => {
        // 아직 한 번도 안 틀었거나, 정지 상태라면 → 랜덤 트랙 선택 후 재생
        if (listeningOn) {
          synth.cancel();

          listeningBtn.textContent = "🔈";
          listeningOn = false;
          playUiSound(1);
        } else {
          listeningBtn.textContent = "🔊";
          listeningOn = true;
          playUiSound(2);
        }
      });
    }



  // 오디오 플레이어 하나 생성
  const bgm = new Audio();
  bgm.loop = true; // 계속 반복 재생

  window.duBgm = bgm;

  // 재생 가능한 기타 사운드 목록
  const backgroundMusics = [
    "../media/sound/guitar.ogg",
    "../media/sound/drums.ogg",
    "../media/sound/perc.ogg",
  ];

  // 현재 선택된 트랙 인덱스 (원하면 나중에 사용)
  let currentTrackIndex = -1;

  if (guitarBtn) {
    guitarBtn.addEventListener("click", () => {
      // 아직 한 번도 안 틀었거나, 정지 상태라면 → 랜덤 트랙 선택 후 재생
      if (bgm.paused) {
        // 랜덤 인덱스 선택
        const randomIndex = Math.floor(Math.random() * backgroundMusics.length);
        currentTrackIndex = randomIndex;

        bgm.src = backgroundMusics[randomIndex];
        bgm.currentTime = 0;
        bgm
          .play()
          .then(() => {
            // 재생 성공하면 버튼 아이콘 바꾸기
            guitarBtn.textContent = "🟥";
          })
          .catch((err) => {
            console.error("BGM 재생 실패:", err);
          });
      } else {
        // 재생 중이면 → 일시정지
        playUiSound(1);
        bgm.pause();
        guitarBtn.textContent = "🎵"; // 다시 기타 아이콘
      }
    });
  }



  updateCharButtonUI(currentCharNum);

  function setChar(index) {
    if (index === currentCharNum) {
      console.log("같은 캐릭터라 스킵:", index);
      return;
    }
    currentCharNum = index;
    updateCharButtonUI(index);      // 버튼 색/상태 변경

    // 클릭 사운드
    playUiSound(1);

    // TTS도 중지
    if (synth) synth.cancel();

    // 말풍선 완전히 닫기
    if (duduLabel) {
      duduLabel.style.display = "none";
      duduLabel.textContent = "";
    }

    // 실제 3D 캐릭터 교체 (AR 모듈에서 정의)
    if (typeof window.switchDuduCharacter === "function") {
      window.switchDuduCharacter(index);
    } else {
      console.warn("switchDuduCharacter 가 아직 준비되지 않았습니다.");
    }
  }

  if (char1Toggle) {
    char1Toggle.addEventListener("click", () => setChar(0));
  }
  if (char2Toggle) {
    char2Toggle.addEventListener("click", () => setChar(1));
  }
  if (char3Toggle) {
    char3Toggle.addEventListener("click", () => setChar(2));
  }


  // 상태 & 타이머 ID
  let collegeBtnOpened = false;
  let deptBtnOpened = false;
  let collegeBtnTimeoutId = null;
  let deptBtnTimeoutId = null;

  // 5초 후 자동으로 숨기는 함수들
  function scheduleHideCollegeBtn() {
    if (collegeBtnTimeoutId) clearTimeout(collegeBtnTimeoutId);
    collegeBtnTimeoutId = setTimeout(() => {
      collegeBtnOpened = false;
      if (collegeDescriptionBtn) {
        collegeDescriptionBtn.style.right = "-170px";  // 다시 숨기기
      }
    }, 3000); // 3초
  }

  function scheduleHideDeptBtn() {
    if (deptBtnTimeoutId) clearTimeout(deptBtnTimeoutId);
    deptBtnTimeoutId = setTimeout(() => {
      deptBtnOpened = false;
      if (departmentDescriptionBtn) {
        departmentDescriptionBtn.style.right = "-170px";
      }
    }, 3000);
  }

  // 단대 소개 버튼
  if (collegeDescriptionBtn) {
    collegeDescriptionBtn.addEventListener("click", () => {
      // 아직 안 열렸으면 → 슬라이드 아웃만 하고 타이머 시작
      if (!collegeBtnOpened) {
        collegeBtnOpened = true;
        collegeDescriptionBtn.style.right = "-10px";   // 화면 안쪽으로
        scheduleHideCollegeBtn();                     // 3초 뒤 자동 복귀
        return;
      }


      playUiSound(2);
      scheduleHideCollegeBtn();

      // AI 호출 추가
      sendMessage(COLLEGE_SUMMARY_PROMPT, {
        skipUserLog: true,
        ignoreARTarget: true,
        promptExtraKind: "college",
      });
    });
  }

  // 학과 소개 버튼
  if (departmentDescriptionBtn) {
    departmentDescriptionBtn.addEventListener("click", () => {
      if (!deptBtnOpened) {
        deptBtnOpened = true;
        departmentDescriptionBtn.style.right = "-10px";
        scheduleHideDeptBtn();
        return;
      }

      playUiSound(2);
      scheduleHideDeptBtn();

      // AI 호출 추가
      sendMessage(DEPT_SUMMARY_PROMPT, {
        skipUserLog: true,
        ignoreARTarget: true,
        promptExtraKind: "dept",
      });
    });
  }
}