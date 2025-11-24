// server.js — 로컬 API 프록시 (브라우저에서 키 안 노출)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 의도 분류(간단) + 답변 생성
async function callChat(messages, temperature = 0.7, model = 'gpt-4o-mini') {
  const r = await client.chat.completions.create({ model, temperature, messages });
  return r.choices?.[0]?.message?.content?.trim() || '(no-content)';
}

async function classifyIntent(msg) {
  const prompt = `
Your job is to classify intent.

Choose one of the following intents:
- professor_lecture
- Major_support
- Scholarship_support

User: ${msg}
Intent:`.trim();

  try {
    const raw = await callChat([{ role: 'user', content: prompt }], 0);
    const intent = raw.split(/\s+/)[0].trim();
    return ['professor_lecture','Major_support','Scholarship_support'].includes(intent)
      ? intent : 'professor_lecture';
  } catch {
    return 'professor_lecture';
  }
}

app.post('/chat', async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : 0.7;
    if (!message) return res.status(400).json({ message: '[bad-request] message is required' });

    const intent = await classifyIntent(message);

    if (intent === 'professor_lecture') {
      const SYSTEM = 'You are a programming professor. Your name is Jaehoon, 25 years old.';
      const reply = await callChat(
        [{ role: 'system', content: SYSTEM }, { role: 'user', content: message }],
        temperature
      );
      return res.json({ message: reply, intent });
    }
    if (intent === 'Major_support') {
      return res.json({ message: 'Here is Department Support number: 1234567890', intent });
    }
    if (intent === 'Scholarship_support') {
      return res.json({ message: 'Here is Scholarship Support number: 0987654321', intent });
    }
    return res.json({ message: `[fallback] intent=${intent}`, intent });
  } catch (e) {
    return res.status(500).json({ message: `[server-error] ${e.name||'Error'}: ${e.message||e}` });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`✅ Local API on http://localhost:${PORT}`));
