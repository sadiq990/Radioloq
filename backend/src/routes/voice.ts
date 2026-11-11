import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const audioUploadDir = path.resolve(process.cwd(), 'uploads', 'audio');
fs.mkdirSync(audioUploadDir, { recursive: true });

const upload = multer({
  dest: audioUploadDir,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function hasValidOpenAIKey(): boolean {
  const key = process.env.OPENAI_API_KEY || '';
  return Boolean(key && !key.includes('your-openai-api-key') && key.startsWith('sk-'));
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Deterministic rule-based radiology dictation parser used as a fallback
 * when OpenAI API credentials are not configured in local development.
 */
function fallbackStructureReport(rawText: string) {
  const text = rawText.trim();
  const extractSection = (labels: string[], nextLabels: string[]): string => {
    const startPattern = new RegExp(`(?:^|\\n|\\.)\\s*(?:${labels.join('|')})\\s*[:\\-]\\s*`, 'i');
    const match = startPattern.exec(text);
    if (!match) return '';
    const startIdx = match.index + match[0].length;
    const remaining = text.slice(startIdx);
    const endPattern = new RegExp(`(?:\\n|\\.)\\s*(?:${nextLabels.join('|')})\\s*[:\\-]`, 'i');
    const endMatch = endPattern.exec(remaining);
    return (endMatch ? remaining.slice(0, endMatch.index) : remaining).trim();
  };

  const allLabels = [
    'clinical history',
    'history',
    'indication',
    'technique',
    'findings',
    'impression',
    'conclusion',
    'recommendation',
    'recommendations',
  ];

  const clinicalHistory = extractSection(['clinical history', 'history', 'indication'], allLabels);
  const technique = extractSection(['technique'], allLabels);
  let findings = extractSection(['findings'], allLabels);
  const impression = extractSection(['impression', 'conclusion'], allLabels);
  const recommendation = extractSection(['recommendation', 'recommendations'], allLabels);

  if (!clinicalHistory && !technique && !findings && !impression && !recommendation) {
    findings = text;
  }

  return {
    clinicalHistory,
    technique,
    findings,
    impression,
    recommendation,
    mode: 'local-fallback',
  };
}

// GET /api/voice/status
router.get('/status', (_req: AuthRequest, res: Response) => {
  return res.json({
    aiConfigured: hasValidOpenAIKey(),
    provider: hasValidOpenAIKey() ? 'openai-whisper-gpt4o' : 'local-fallback',
  });
});

// POST /api/voice/transcribe
router.post('/transcribe', upload.single('audio'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const ext = path.extname(req.file.originalname || '') || '.webm';
  const targetPath = req.file.path + ext;
  fs.renameSync(req.file.path, targetPath);

  if (!hasValidOpenAIKey()) {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    return res.status(400).json({
      error:
        'OpenAI API key not configured. Use the built-in browser Live Dictation button or add OPENAI_API_KEY to backend/.env.',
      code: 'OPENAI_NOT_CONFIGURED',
    });
  }

  try {
    const radiologyPrompt =
      'Radiology dictation: T1-weighted, T2-weighted, FLAIR, hypointense, hyperintense, pneumothorax, pleural effusion, consolidation, hepatomegaly, lymphadenopathy, enhancement, metastasis. Sections: Clinical History, Technique, Findings, Impression.';

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(targetPath),
      model: 'whisper-1',
      prompt: radiologyPrompt,
      temperature: 0,
    });

    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    return res.json({ text: transcription.text, mode: 'openai-whisper' });
  } catch (err: any) {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    console.error('Transcription error:', err);
    return res.status(500).json({ error: 'Transcription failed', detail: err.message });
  }
});

// POST /api/voice/structure
router.post('/structure', async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'No text provided' });
  }

  if (!hasValidOpenAIKey()) {
    return res.json(fallbackStructureReport(String(text)));
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a medical report structuring assistant. Parse the following raw radiology dictation into a structured JSON report with these exact keys:
- clinicalHistory: (string) Clinical indication/history
- technique: (string) Imaging technique used
- findings: (string) Detailed imaging findings
- impression: (string) Summary impression/conclusion
- recommendation: (string) Any follow-up recommendations (can be empty string)

Return ONLY valid JSON with these 5 keys. Use empty string for any section not mentioned.`,
        },
        { role: 'user', content: String(text) },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const structured = JSON.parse(completion.choices[0].message.content || '{}');
    return res.json({
      clinicalHistory: structured.clinicalHistory || '',
      technique: structured.technique || '',
      findings: structured.findings || '',
      impression: structured.impression || '',
      recommendation: structured.recommendation || '',
      mode: 'openai-gpt4o',
    });
  } catch (err: any) {
    console.error('Structure error, falling back to local parser:', err.message);
    return res.json(fallbackStructureReport(String(text)));
  }
});

export default router;
