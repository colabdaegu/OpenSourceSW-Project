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
    const msg = document.getElementById("msg");

    if (!vv) return; // visualViewport 없으면 여기선 패스

    let baseVVHeight = vv.height; // 키보드 없을 때 기준

    function setOffset(px) {
        root.style.setProperty("--keyboard-offset", `${Math.max(0, Math.round(px))}px`);
    }

    function isMsgFocused() {
        return document.activeElement === msg;
    }

    function measure() {
        // 키보드 없을 때만 기준 갱신
        if (!isMsgFocused()) baseVVHeight = Math.max(baseVVHeight, vv.height);

        const offsetTop = vv.offsetTop || 0;

        // 기본
        const byInnerHeight = window.innerHeight - vv.height - offsetTop;
        // 꼬임 대비용 fallback
        const byBaseVV = baseVVHeight - vv.height - offsetTop;

        // 기본값 사용
        let offset = byInnerHeight;

        // 값이 말이 안 되면(너무 크거나 음수) fallback로 전환
        if (offset < 0 || offset > window.innerHeight * 0.7) {
        offset = byBaseVV;
        }

        // 포커스 없으면 무조건 0으로 복귀(닫힘 꼬임 방지)
        if (!isMsgFocused()) offset = 0;

        if (offset < 8) offset = 0;
        setOffset(offset);
    }

    function measureSoon() {
        measure();
        requestAnimationFrame(measure);
        setTimeout(measure, 50);
    }

    vv.addEventListener("resize", measureSoon);
    vv.addEventListener("scroll", measureSoon);
    window.addEventListener("resize", measureSoon);

    /* 포커스 빠질 때 즉시 0으로 */
    function reset() {
        setOffset(0);
        requestAnimationFrame(function () { setOffset(0); });
        setTimeout(function () { setOffset(0); }, 50);
    }
    msg.addEventListener("focus", measureSoon);
    msg.addEventListener("blur", () => {
        reset();
        measureSoon();
    });

    setOffset(0);
    measureSoon();
})();