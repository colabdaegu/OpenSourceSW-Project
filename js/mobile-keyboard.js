visualViewport.addEventListener("resize", () => {
  const offset = window.innerHeight - visualViewport.height;

  document.documentElement.style.setProperty(
    "--keyboard-offset",
    `${Math.max(offset, 0)}px`
  );
});


(() => {
const root = document.documentElement;
const vv = window.visualViewport;

// “키보드가 없을 때” 기준 높이를 기억해두면 삼성 브라우저에서 더 안정적입니다.
let baseVVHeight = vv ? vv.height : window.innerHeight;

function setOffset(px) {
    root.style.setProperty("--keyboard-offset", `${Math.max(0, Math.round(px))}px`);
}

function isTextInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    // contenteditable 포함
    if (el.isContentEditable) return true;
    return false;
}

function measureAndApply() {
    // 1) visualViewport 기반(지원 브라우저)
    if (vv) {
    // 삼성 인터넷에서 offsetTop이 남는 경우가 있어서 같이 빼줍니다.
    // (키보드가 올라오면 vv.height가 줄고, vv.offsetTop이 변하는 경우가 있음)
    const currentVVHeight = vv.height;
    const offsetTop = vv.offsetTop || 0;

    // baseVVHeight는 “키보드가 없을 때”에만 갱신
    // (키보드 올라온 상태에서 base를 갱신하면 복귀 판단이 꼬입니다)
    if (!isTextInputFocused()) {
        baseVVHeight = Math.max(baseVVHeight, currentVVHeight);
    }

    // 키보드 오프셋 계산
    // - 정상: window.innerHeight - vv.height - vv.offsetTop  (대부분 이 공식이 잘 맞습니다)
    // - 삼성 버그 대비: 값이 말이 안 되면(너무 크거나 음수) 0 처리
    let offset = (window.innerHeight - currentVVHeight - offsetTop);

    // 삼성에서 “키보드 닫혔는데 vv.height가 안 돌아오는” 경우 대비:
    // 포커스가 없으면 키보드가 내려갔다고 보고 강제로 0 복귀
    if (!isTextInputFocused()) {
        offset = 0;
    }

    // 혹시라도 미세하게 남는 경우(1~2px) 제거
    if (offset < 8) offset = 0;

    setOffset(offset);
    return;
    }

    // 2) visualViewport 미지원 fallback: innerHeight 변화로 감지
    //    (삼성 인터넷 구버전/특정 모드 대비)
    let offset = 0;
    if (isTextInputFocused()) {
    // 키보드가 올라오면 innerHeight가 줄어드는 경우가 많음
    offset = Math.max(0, (baseVVHeight - window.innerHeight));
    if (offset < 8) offset = 0;
    } else {
    offset = 0;
    baseVVHeight = Math.max(baseVVHeight, window.innerHeight);
    }
    setOffset(offset);
}

// 삼성 인터넷은 “키보드 닫힘 직후” 측정이 한 프레임 늦게 반영되는 경우가 있어
// rAF + setTimeout으로 한 번 더 재측정해줍니다.
function measureSoon() {
    measureAndApply();
    requestAnimationFrame(measureAndApply);
    setTimeout(measureAndApply, 50);
    setTimeout(measureAndApply, 250);
}

// 이벤트 바인딩
if (vv) {
    vv.addEventListener("resize", measureSoon);
    vv.addEventListener("scroll", measureSoon); // 주소창/뷰포트 변동도 같이 잡기
}
window.addEventListener("resize", measureSoon);
window.addEventListener("orientationchange", () => {
    // 회전 시 기준 재설정
    setTimeout(() => {
    baseVVHeight = vv ? vv.height : window.innerHeight;
    setOffset(0);
    measureSoon();
    }, 300);
});

// ✅ 핵심: 키보드 “닫힘”을 확실히 잡는 트리거들
window.addEventListener("focusin", measureSoon, true);
window.addEventListener("focusout", () => {
    // 포커스가 빠지면 키보드가 내려갈 확률이 매우 높으므로 0으로 강제 복귀
    setOffset(0);
    measureSoon();
}, true);

// 초기 1회
setOffset(0);
measureSoon();
})();