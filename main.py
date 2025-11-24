from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Live Server(보통 5500 포트)에서 오는 요청 허용 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # 테스트용 전체 허용 (나중에 필요하면 좁혀도 됨)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- 요청/응답 모델 -----
class ChatRequest(BaseModel):
    message: str
    model: str | None = None
    max_tokens: int | None = None
    temperature: float | None = None

class ChatResponse(BaseModel):
    message: str

# ----- /chat 엔드포인트 -----
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # 일단은 테스트용 고정 응답
    return {"message": f"'{req.message}' 라고 보냈네요! (FastAPI 백엔드에서 온 응답)"}
