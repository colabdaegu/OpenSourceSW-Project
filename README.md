# OpenSourceSW-Project
오픈소스SW - 팀 프로젝트

OpenAr : DU AR-CHAT

-------------------------------------------
= 사용 절차(https://nobeoka.tistory.com/4) =
① 파일의 root 경로에 node_modules 폴더와 .env 환경 변수 붙여넣기
https://drive.google.com/file/d/1nNF0q5fWuMKazcR4vQYky8q-mGDSwk_n/view?usp=sharing 

② ngrok 회원가입 및 Your Authtoken 발급
https://dashboard.ngrok.com/get-started/your-authtoken 

③-1 컴퓨터 환경에 ngrok.yml 세팅
.예시 - Visual Studio Code 터미널에 아래의 명령어를 순서대로 입력(362k... 은 ngrok 가입시 발급 받은 Your Authtoken 40~50자리)

ngrok config add-authtoken 362k...
ngrok http 8000

③-2 터미널에 ngrok 서버가 정상적으로 실행된 경우 → Forwarding 줄의 ngrok-free 도메인 주소 복사
(https://wilson-unscented-dissidently.ngrok-free.dev) <- 본인 ngrok-free 주소로 하셔야 됩니다.

③-3 프로젝트 파일의 루트에 있는 ngrok-address.js 내부의 BASE_URL에 ngrok-free 도메인 주소 붙여넣기
const BASE_URL = "https://wilson-unscented-dissidently.ngrok-free.dev";

④ 2개의 터미널(Bash) 실행 - 백엔드 서버와 ngrok 서버 각각 열기
node local-server.cjs
ngrok http 8000

⑤ 본인의 ngrok 사이트 접속 테스트
https://wilson-unscented-dissidently.ngrok-free.dev

-------------------------------------------
[자세한 사용 가이드는 블로그 참고]
https://nobeoka.tistory.com/4 