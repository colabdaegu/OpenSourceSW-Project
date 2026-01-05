if (
  window.location.pathname.startsWith("/webxr/")
) {

    // "네비게이션바 수치 안 맞는 브라우저"만 true 되는 플래그
    let KB_NEEDS_NAV_FIX = false;
    // 키보드 열기 전 innerHeight 기준(키보드 닫힘 상태에서 갱신)
    let KB_BASE_IH = window.innerHeight;


    /* Viewport 사이즈 변경 감지 -> 채팅 관련 오버레이 bottom 재설정 */
    visualViewport.addEventListener("resize", () => {
        const root = document.documentElement;

        // 키보드 닫힘(=vv가 거의 full)일 때 기준 갱신 + 플래그 리셋
        const looksClosed = Math.abs(visualViewport.height - window.innerHeight) < 5;
        if (looksClosed) {
            KB_BASE_IH = window.innerHeight;
            KB_NEEDS_NAV_FIX = false;
        } else {
            // 키보드 열림으로 보일 때 "정상/비정상" 판별
            KB_NEEDS_NAV_FIX = (window.innerHeight === KB_BASE_IH);
        }

        const offset = window.innerHeight - visualViewport.height;

        document.documentElement.style.setProperty(
            "--keyboard-offset",
            `${Math.max(offset, 0)}px`
        );


        /* 키보드 활성화 동안에는 log 숨기기 */
        const vvh = window.visualViewport.height;
        const shouldHideLog =
            offset > 0 && offset > vvh * 0.1;

        root.classList.toggle("kb-hide-log", shouldHideLog);
    });

    /* 브라우저별 Focus 차이점으로 인한 키보드 버그들 보완 */
    (() => {
        const root = document.documentElement;
        const vv = window.visualViewport;
        const msg = document.getElementById("msg");

        if (!vv) return; // visualViewport 없으면 여기선 패스

const TEST_NAV_BAR_HEIGHT = 24; // 🔥 테스트용 하단바 높이

        let baseVVHeight = vv.height; // 키보드 없을 때 기준

        function vhToPx(vh) {
            return (window.innerHeight * vh) / 100;
        }

        function setOffset(px) {
            const minus = vhToPx(2.25);          // + 2.25%
            const adjusted = px - minus;
            root.style.setProperty("--keyboard-offset", `${Math.max(0, Math.round(adjusted))}px`);
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


// 테스트용 하단바 높이 합산
if (offset > 0 && KB_NEEDS_NAV_FIX) {
    offset += TEST_NAV_BAR_HEIGHT;
}

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
        msg.addEventListener("focus", () => {
            measureSoon();

            root.classList.add("kb-hide-log");
        });
        msg.addEventListener("blur", () => {
            reset();
            measureSoon();

            root.classList.remove("kb-hide-log");
        });

        setOffset(0);
        measureSoon();
    })();
}