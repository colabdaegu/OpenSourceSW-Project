/** ngrok 주소 설정(BASE_URL <-- 본인 주소를 대입) **/
const BASE_URL = "https://diastolic-fieriest-shantae.ngrok-free.dev";

window.NGROK_CONFIG = { 
    NGROK_ADDRESS: BASE_URL.replace(/\/+$/, "") + "/chat" 
};