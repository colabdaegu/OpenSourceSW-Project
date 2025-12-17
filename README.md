# OpenSourceSW-Project
오픈소스SW - 팀 프로젝트<br>
<br>
OpenAr : DU AR-CHAT<br>
<br>
-------------------------------------------
## 사용 절차(https://nobeoka.tistory.com/4) <br>
① 파일의 root 경로에 node_modules 폴더와 .env 환경 변수 붙여넣기<br>
https://drive.google.com/file/d/1nNF0q5fWuMKazcR4vQYky8q-mGDSwk_n/view?usp=sharing <br>
<br>
② ngrok 회원가입 및 Your Authtoken 발급<br>
https://dashboard.ngrok.com/get-started/your-authtoken <br>
<br>
③-1 컴퓨터 환경에 ngrok.yml 세팅<br>
.예시 - Visual Studio Code 터미널에 아래의 명령어를 순서대로 입력(362k... 은 ngrok 가입시 발급 받은 Your Authtoken 40~50자리)<br>
<br>
ngrok config add-authtoken 362k...<br>
ngrok http 8000<br>
<br>
③-2 터미널에 ngrok 서버가 정상적으로 실행된 경우 → Forwarding 줄의 ngrok-free 도메인 주소 복사<br>
(https://wilson-unscented-dissidently.ngrok-free.dev) <- 본인 ngrok-free 주소로 하셔야 됩니다.<br>
<br>
③-3 프로젝트 파일의 루트에 있는 ngrok-address.js 내부의 BASE_URL에 ngrok-free 도메인 주소 붙여넣기<br>
const BASE_URL = "https://wilson-unscented-dissidently.ngrok-free.dev";<br>
<br>
④ 2개의 터미널(Bash) 실행 - 백엔드 서버와 ngrok 서버 각각 열기<br>
node local-server.cjs<br>
ngrok http 8000<br>
<br>
⑤ 본인의 ngrok 사이트 접속 테스트<br>
https://wilson-unscented-dissidently.ngrok-free.dev<br>
<br>
-------------------------------------------
[자세한 사용 가이드는 블로그 참고]<br>
https://nobeoka.tistory.com/4 