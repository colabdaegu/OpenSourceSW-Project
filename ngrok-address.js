/** ngrok 주소 설정(주소 마지막에 / <- 슬래시 넣지 말 것) **/
const BASE_URL = "https://nondeflected-unbeneficial-jimmie.ngrok-free.dev";

window.NGROK_CONFIG = { 
    NGROK_ADDRESS: BASE_URL + "/chat" 
};