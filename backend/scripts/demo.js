// 엔드투엔드 데모: 원문 → 하이브리드 탐지 → 토큰화 → 유출검사(2겹) → 서버(LLM) → 복원
//
// 실행: node scripts/demo.js
// - ANTHROPIC_API_KEY가 있으면 실제 Claude 호출까지, 없으면 그 전 단계까지 시연.

import 'dotenv/config';
import {
  buildDetections,
  applyTokenization,
  restore,
} from '../src/shared/tokenizer.js';
import {
  checkResidualOriginals,
  scanResidualPII,
  summarizeFindings,
} from '../src/shared/leakGuard.js';
import { generateMeetingOutputs } from '../src/llm.js';

// 원문 회의 메모 (민감정보 포함) — 브라우저를 떠나지 않는다고 가정
const rawTranscript = `
소지윤: 이번 분기 가나다마트 납품 계약 건 논의합니다. 계약 규모는 3억 5천만원 수준이에요. 담당자 연락처는 010-1234-5678, 이메일은 buyer@ganada.co.kr 입니다.
김대리: 테크컴퍼니 쪽 물류 단가가 올라서 마진이 빠듯합니다. 제가 원가 재산정 자료를 만들었어요.
소지윤: 제가 가나다마트 구매팀과 협상해서 납기를 2주 늦추는 대신 단가를 3% 올리는 안을 제안했고, 상대가 수용했습니다.
김대리: 그럼 다음 주 금요일까지 최종 견적서를 가나다마트에 보내면 되겠네요.
소지윤: 네, 견적서 발송은 김대리가 맡아주시고, 계약서 초안은 제가 검토하겠습니다.
`.trim();

// 사전 = 문맥 의존 개체(브라우저 NER가 잡을 부분)를 데모에서 대체
const dictionary = {
  PERSON: ['소지윤', '김대리'],
  CLIENT: ['가나다마트'],
  ORG: ['테크컴퍼니'],
};

function hr(t) {
  console.log(`\n=== ${t} ===`);
}

async function main() {
  hr('1. 원문 (서버로 절대 안 보냄)');
  console.log(rawTranscript);

  // 레이어 ① 하이브리드 탐지 (여기선 규칙 + 사전; 브라우저에선 + 온디바이스 NER)
  hr('2. 탐지 결과 (규칙 + 사전)');
  const detections = buildDetections(rawTranscript, { dictionary });
  for (const d of detections) {
    console.log(`  [${d.type}] "${d.value}"  (${d.source}, conf ${d.confidence})`);
  }

  // 레이어 ② 사람이 확정 — 데모에서는 전부 확정했다고 가정하고 그대로 토큰화
  const { tokenized, mapping } = applyTokenization(rawTranscript, detections);
  hr('3. 토큰화 결과 (이것만 서버로 전송)');
  console.log(tokenized);

  // 레이어 ③(A) 클라이언트 역방향 유출검사 — 원본이 남아있으면 전송 금지
  hr('4. 유출검사 (A) 클라이언트: 원본 대조');
  const client = checkResidualOriginals(tokenized, mapping);
  console.log(client.safe ? '  ✅ 원본 잔존 없음 — 안전' : `  ❌ 유출: ${JSON.stringify(client.leaked)}`);

  // 레이어 ③(B) 서버 게이트 시뮬레이션 — 잔여 PII 패턴 검사
  hr('5. 유출검사 (B) 서버 게이트: 잔여 PII 패턴');
  const server = scanResidualPII(tokenized);
  console.log(server.clean ? '  ✅ 잔여 PII 없음 — LLM 전송 허용' : `  ❌ 차단: ${JSON.stringify(summarizeFindings(server.blocking))}`);

  // 게이트가 진짜 막는지 보여주는 반례: 이메일을 일부러 남겨보기
  hr('6. 안전장치 검증: 이메일을 일부러 안 가린 경우');
  const leaky = tokenized + '\n(참고) 담당자 이메일 leak@ganada.co.kr';
  const leakScan = scanResidualPII(leaky);
  console.log(leakScan.clean ? '  (예상과 다름)' : `  ✅ 서버가 차단함: ${JSON.stringify(summarizeFindings(leakScan.blocking))}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\n⚠️ ANTHROPIC_API_KEY 없음 → LLM 호출 생략. .env 설정 후 다시 실행.');
    return;
  }

  // 서버: LLM 이중 산출물 생성 (토큰만 처리)
  const selfToken = Object.keys(mapping).find((t) => mapping[t] === '소지윤');
  hr('7. LLM 처리 중 (토큰만 전송)...');
  const ai = await generateMeetingOutputs({
    tokenizedTranscript: tokenized,
    selfToken,
    meetingTitle: '분기 납품 계약 논의',
  });
  console.log('토큰 상태 결과:');
  console.log(JSON.stringify({ teamSummary: ai.teamSummary, personalStar: ai.personalStar }, null, 2));
  console.log('사용량:', ai._meta.usage);

  // 클라이언트: 복원
  hr('8. 복원된 최종 결과 (기기에서 재치환)');
  const restored = restore({ teamSummary: ai.teamSummary, personalStar: ai.personalStar }, mapping);
  console.log(JSON.stringify(restored, null, 2));
}

main().catch((e) => {
  console.error('데모 실패:', e.message);
  process.exit(1);
});
