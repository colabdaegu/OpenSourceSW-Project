if (
  window.location.pathname.startsWith("/webxr/") || window.location.pathname.startsWith("/webxr-samples/")
) {

    // "네비게이션바 수치 안 맞는 브라우저"만 true 되는 플래그
    let KB_NEEDS_NAV_FIX = false;
    // 키보드 열기 전 innerHeight 기준(키보드 닫힘 상태에서 갱신)
    let KB_BASE_IH = window.innerHeight;

    // 키보드 배치 버그 제어용
    let duplicateOperationGuard = 0;

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

        // 로그 메시지 스크롤 최신화
        const logEl = document.getElementById("log");
        if (logEl) {
            logEl.scrollTop = logEl.scrollHeight;
            requestAnimationFrame(() => {
                logEl.scrollTop = logEl.scrollHeight;
            });
        }
    });


    /* 브라우저별 Focus 차이점으로 인한 키보드 버그들 보완 */
    (() => {
        const root = document.documentElement;
        const vv = window.visualViewport;
        const msg = document.getElementById("msg");

        if (!vv) return; // visualViewport 없으면 여기선 패스



        // ========================================
        // 네비게이션바 - 모바일 기기 크기 비례 임의값
        // ========================================
        // 테스트용 하단바 높이(px) - focus 때마다 자동 계산해서 갱신됨
        let TEST_NAV_BAR_HEIGHT = 24;

        // baseW/baseH로 화면비 매칭해서 nav height 결정
        function pickNavBarHeightByAspect(baseW, baseH) {
        // 가로/세로 비율 (예: 418/975 ≈ 0.4287)
        const r = baseW / baseH;

        // 상대 오차(%) = |r - target| / target * 100
        const relErrPct = (target) => Math.abs(r - target) / target * 100;

        // ----------
        // 후보 테이블
        // ----------
        const CANDIDATES = [
            // ======= 스마트폰(긴 화면) =======
            { name: "9:21",   ratio: 9 / 21,   navPx: 24 },
            { name: "9:20.5", ratio: 9 / 20.5, navPx: 22 },
            { name: "9:20",   ratio: 9 / 20,   navPx: 21 },
            { name: "9:19.5", ratio: 9 / 19.5, navPx: 19 },
            { name: "9:19",   ratio: 9 / 19,   navPx: 18 },
            { name: "9:18.5", ratio: 9 / 18.5, navPx: 15 },
            { name: "9:18",   ratio: 9 / 18,   navPx: 14 },
            { name: "9:17.5", ratio: 9 / 17.5, navPx: 13 },
            { name: "9:17",   ratio: 9 / 17,   navPx: 12 },
            { name: "9:16",   ratio: 9 / 16,   navPx: 48 },

            // ======= 태블릿(기본값들) =======
            { name: "10:16 (≈ 16:10)", ratio: 10 / 16, navPx: 0 },
            { name: "3:4",             ratio: 3 / 4,   navPx: 0 },
            { name: "2:3",             ratio: 2 / 3,   navPx: 0 },
        ];

        const PHONE_TOL_PCT = 0.50;
        const TABLET_TOL_PCT = 1.00;

        // 1) 가장 가까운 후보 찾기
        let best = null;
        for (const c of CANDIDATES) {
            const e = relErrPct(c.ratio);
            if (!best || e < best.errPct) {
            best = { ...c, errPct: e };
            }
        }

        // 2) 폰/태블릿 분류(대충)
        // r = W/H 이니까, 값이 작을수록 세로로 긴 화면(폰)임.
        // - 9:16의 ratio = 0.5625
        // - 3:4의 ratio = 0.75 (태블릿에 가까움)
        const looksTablet = r >= 0.62; // 0.62 이상이면 태블릿/가로에 가까운 비율로 판단

        const tol = looksTablet ? TABLET_TOL_PCT : PHONE_TOL_PCT;

        // 3) 허용오차 안이면 best 채택, 아니면 fallback
        if (best && best.errPct <= tol) {
            return {
            navPx: best.navPx,
            matchedName: best.name,
            errPct: best.errPct,
            ratio: r,
            baseW,
            baseH,
            looksTablet,
            };
        }

        // 4) 매칭 실패 fallback
        const fallbackNav = looksTablet ? TEST_NAV_BAR_HEIGHT : 15;
            return {
                navPx: fallbackNav,
                matchedName: looksTablet ? "fallback-tablet" : "fallback-phone",
                errPct: best ? best.errPct : 999,
                ratio: r,
                baseW,
                baseH,
                looksTablet,
            };
        }

        // focus 때마다 baseW/baseH로 TEST_NAV_BAR_HEIGHT 갱신
        function updateNavBarHeightFromBase() {
            const baseW = window.visualViewport.width;
            const baseH = window.visualViewport.height;

            const picked = pickNavBarHeightByAspect(baseW, baseH);
            TEST_NAV_BAR_HEIGHT = picked.navPx;
        }
        // ===========
        // 네비게이션바
        // ===========



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


            /* 하단바 높이 합산 */
            if ((offset > 0 && KB_NEEDS_NAV_FIX)  && duplicateOperationGuard < 20) {
                offset += TEST_NAV_BAR_HEIGHT;

                // 키보드 높이 이탈 억제
                duplicateOperationGuard = duplicateOperationGuard + 1;
                setTimeout(() => {
                    duplicateOperationGuard = 0;
                }, 500);
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
            updateNavBarHeightFromBase();

            measureSoon();

            root.classList.add("kb-hide-log");
        });
        msg.addEventListener("blur", () => {
            reset();
            measureSoon();

            root.classList.remove("kb-hide-log");

            // 로그 메시지 스크롤 최신화
            const logEl = document.getElementById("log");
            if (logEl) {
                logEl.scrollTop = logEl.scrollHeight;
                requestAnimationFrame(() => {
                    logEl.scrollTop = logEl.scrollHeight;
                });
            }
        });

        setOffset(0);
        measureSoon();
    })();
}