export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "message is required" });
  const reply = `(${new Date().toLocaleTimeString()}) 당신이 말한 것: ${message}`;
  return res.status(200).json({ reply });
}
