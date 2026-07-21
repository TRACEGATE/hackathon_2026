// VeilNote 백엔드 서버 (Express)
//
// 역할: "비식별화된 토큰 텍스트"를 받아 LLM으로 팀 요약 + 개인 STAR를 생성하는 프록시.
//
// 보안 정책(프로토타입):
// - /api/process 는 tokenizedTranscript(토큰만)만 받는다. 원문/매핑테이블은 받지 않는다.
// - 전송 직전 서버측 유출 게이트(leakGuard)를 통과해야만 LLM으로 넘어간다.
// - 요청·응답을 디스크에 저장하지 않고, 본문 내용은 로그에도 남기지 않는다.

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { generateMeetingOutputs, llmConfig } from './llm.js';
import { tokenize, restore, buildDetections } from './shared/tokenizer.js';
import { scanResidualPII, summarizeFindings } from './shared/leakGuard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const app = express();
app.use(express.json({ limit: '1mb' }));

// 정적 파일: 브라우저 참조 구현(public) + 공용 순수모듈(src/shared)
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.use(express.static(path.join(rootDir, 'public')));

// 요청 로깅 (본문 내용은 남기지 않음 — 프라이버시)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'veilnote-backend',
    model: llmConfig.MODEL,
    effort: llmConfig.EFFORT,
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

/**
 * POST /api/process
 * 핵심 엔드포인트. 토큰화된 회의 텍스트 → 팀 요약 + 개인 STAR.
 *
 * body: {
 *   tokenizedTranscript: string,   // 필수. 이미 토큰화된 회의 내용 (토큰만)
 *   selfToken?: string,            // 선택. "나"에 해당하는 사람 토큰 (예: "[PERSON_1]")
 *   meetingTitle?: string          // 선택
 * }
 *
 * 서버측 유출 게이트: 토큰화됐다고 주장하는 텍스트에 원문 PII(이메일/전화/주민번호/카드)가
 * 남아 있으면 422로 차단하고 LLM을 호출하지 않는다.
 */
app.post('/api/process', async (req, res) => {
  const { tokenizedTranscript, selfToken, meetingTitle } = req.body || {};

  if (typeof tokenizedTranscript !== 'string' || !tokenizedTranscript.trim()) {
    return res
      .status(400)
      .json({ error: 'tokenizedTranscript(문자열)가 필요합니다.' });
  }

  // 레이어 ③(B) — 서버측 잔여 PII 게이트
  const scan = scanResidualPII(tokenizedTranscript);
  if (!scan.clean) {
    console.warn(
      `전송 차단(RESIDUAL_PII_BLOCKED): ${scan.blocking.map((f) => f.type).join(', ')}`
    );
    return res.status(422).json({
      error: '전송 차단: 토큰화되지 않은 개인정보가 남아 있습니다.',
      code: 'RESIDUAL_PII_BLOCKED',
      findings: summarizeFindings(scan.blocking), // 원문은 마스킹되어 노출 안 됨
    });
  }

  try {
    const result = await generateMeetingOutputs({
      tokenizedTranscript,
      selfToken,
      meetingTitle,
    });
    return res.json(result);
  } catch (err) {
    console.error('process 오류:', err.message);
    return res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/demo/detect   ⚠️ 데모 전용
 * 규칙(+사전) 기반 자동 탐지 결과를 반환. (브라우저는 여기에 NER를 추가)
 * body: { rawText: string, dictionary?: object }
 */
app.post('/api/demo/detect', (req, res) => {
  const { rawText, dictionary } = req.body || {};
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText(문자열)가 필요합니다.' });
  }
  const detections = buildDetections(rawText, { dictionary: dictionary || {} });
  return res.json({ detections });
});

/**
 * POST /api/demo/tokenize   ⚠️ 데모 전용
 * 실서비스에서는 브라우저가 담당하는 토큰화. 매핑 테이블을 반환하지만 서버는 저장하지 않는다.
 * body: { rawText: string, dictionary?: object }
 */
app.post('/api/demo/tokenize', (req, res) => {
  const { rawText, dictionary } = req.body || {};
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText(문자열)가 필요합니다.' });
  }
  const { tokenized, mapping } = tokenize(rawText, dictionary || {});
  return res.json({ tokenized, mapping });
});

/**
 * POST /api/demo/restore   ⚠️ 데모 전용
 * body: { data: any, mapping: object }
 */
app.post('/api/demo/restore', (req, res) => {
  const { data, mapping } = req.body || {};
  if (!mapping || typeof mapping !== 'object') {
    return res.status(400).json({ error: 'mapping(객체)이 필요합니다.' });
  }
  return res.json({ restored: restore(data, mapping) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VeilNote 백엔드가 http://localhost:${PORT} 에서 실행 중`);
  console.log(`  브라우저 데모: http://localhost:${PORT}/`);
  console.log(`  모델: ${llmConfig.MODEL} / effort: ${llmConfig.EFFORT}`);
  console.log(
    `  API 키: ${process.env.ANTHROPIC_API_KEY ? '설정됨' : '없음 (LLM 호출 불가)'}`
  );
});
