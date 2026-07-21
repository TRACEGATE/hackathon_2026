// Claude API 연동 — 토큰화된 회의 텍스트 → 팀 요약 + 개인 STAR (동시 생성)
//
// 보안 원칙:
// - 이 모듈은 이미 비식별화된 토큰 텍스트만 받는다. 원문/매핑테이블은 취급하지 않는다.
// - API 키는 환경변수(ANTHROPIC_API_KEY)로만 주입되며, 백엔드 경유로만 사용된다.
// - 요청/응답 어느 것도 디스크에 저장하지 않는다 (프로토타입 정책).

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserPrompt, OUTPUT_SCHEMA } from './prompts.js';

const MODEL = process.env.VEILNOTE_MODEL || 'claude-opus-4-8';
const EFFORT = process.env.VEILNOTE_EFFORT || 'medium';

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env를 확인하세요.'
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

/**
 * 토큰화된 회의 텍스트로부터 이중 산출물을 생성한다.
 * @param {{ tokenizedTranscript: string, selfToken?: string, meetingTitle?: string }} input
 * @returns {Promise<{ teamSummary: object, personalStar: object[], _meta: object }>}
 */
export async function generateMeetingOutputs(input) {
  const { tokenizedTranscript } = input;
  if (!tokenizedTranscript || !tokenizedTranscript.trim()) {
    throw new Error('tokenizedTranscript가 비어 있습니다.');
  }

  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: EFFORT,
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  });

  // 안전 차단(refusal) 등 비정상 종료 처리
  if (response.stop_reason === 'refusal') {
    const cat = response.stop_details?.category ?? 'unknown';
    throw new Error(`모델이 요청을 거절했습니다 (category: ${cat}).`);
  }

  // structured outputs 사용 시 첫 text 블록에 유효한 JSON이 담긴다.
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('모델 응답에서 텍스트 결과를 찾지 못했습니다.');
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (e) {
    throw new Error(`모델 응답 JSON 파싱 실패: ${e.message}`);
  }

  return {
    ...parsed,
    _meta: {
      model: response.model,
      stopReason: response.stop_reason,
      usage: response.usage,
    },
  };
}

export const llmConfig = { MODEL, EFFORT };
