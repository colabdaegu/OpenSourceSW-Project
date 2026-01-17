# OpenSourceSW-Project
> 오픈소스SW - 팀 프로젝트
> 
> OpenAr : DU AR-CHAT

----------------------
# 시연 영상
[![Play Video](https://img.youtube.com/vi/u2MV_9HZyDw/0.jpg)](https://youtu.be/u2MV_9HZyDw)

----------------------
# 개발 환경 세팅 (https://nobeoka.tistory.com/4)
## 1. 파일의 루트 경로에 node_modules 폴더와 .env 환경 변수(GPT API KEY / KAKAO MAP APP KEY) 넣기
깃에 안 올라가는 파일들에 대해서는 임포트 후에 따로 다운받으셔서 직접 넣으셔야 합니다.
> https://drive.google.com/drive/folders/1O1sjO2N-USdTWfs3iXuIPip0aDR3Nki5?usp=sharing 

## 2. ngrok 회원가입 및 Your Authtoken 발급
> https://dashboard.ngrok.com/get-started/your-authtoken 

## 3. 개인 PC와 ngrok를 연동하는 절차
### 3.1. 컴퓨터 환경에 ngrok.yml 세팅
.예시 - Visual Studio Code 터미널에 아래의 명령어를 순서대로 입력(362k... 은 ngrok 가입시 발급 받은 Your Authtoken 40~50자리)
```
ngrok config add-authtoken 362k...
ngrok http 8000
```
### 3.2. 터미널에 ngrok 서버가 정상적으로 실행된 경우 → Forwarding 줄의 ngrok-free 도메인 주소 복사
> (https://nondeflected-unbeneficial-jimmie.ngrok-free.dev) <- 본인 ngrok-free 주소로 하셔야 됩니다.

### 3.3. 프로젝트 파일의 루트에 있는 ngrok-address.js 내부의 BASE_URL에 ngrok-free 도메인 주소 붙여넣기
```
const BASE_URL = "https://nondeflected-unbeneficial-jimmie.ngrok-free.dev";
```

## 4. 2개의 터미널(Bash) 실행 - 백엔드 서버와 ngrok 서버 각각 열기
```
node local-server.cjs
```
```
ngrok http 8000
```

## 5. 본인의 ngrok 사이트 접속 테스트
> https://nondeflected-unbeneficial-jimmie.ngrok-free.dev


----------------------
### [자세한 사용 가이드는 블로그 참고]
#### https://nobeoka.tistory.com/4 

----------------------
# 주요 경로 설명
- `docs/` — (초안)Chat-Bot 테스트의 디렉터리
- `js/` — WebXR용 모듈
- `media/gltf/` — 3D 모델 리소스
- `media/prompt/` — 챗봇 프롬프트
- `webxr/` — DU AR-CHAT의 디렉터리 [메인]
- `webxr-samples/` — 샘플 캐릭터 AR의 디렉터리
- `index.html` — 엔트리 포인트
- `local-server.cjs` — 백엔드 중앙 관리
- `ngrok-address.js` — ngrok 서버 지정
- `.env` — API 환경 변수