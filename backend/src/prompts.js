// VeilNote 프롬프트 & 구조화 출력 스키마
//
// 핵심 원칙: 이 백엔드(및 LLM)는 "비식별화된 토큰"만 다룬다.
// 회사명/고객사/금액/인사정보는 브라우저에서 이미 [ORG_1], [PERSON_2], [MONEY_1]
// 같은 토큰으로 치환된 상태로 들어온다. 모델은 이 토큰을 절대 원문으로 되돌리거나
// 새로운 이름을 지어내면 안 된다 — 토큰은 문자 그대로 보존한다.

export const SYSTEM_PROMPT = `당신은 VeilNote의 회의록 처리 에이전트입니다.

[입력 규칙]
- 입력된 회의 내용은 이미 "비식별화"되어 있습니다. 회사명·고객사명·사람이름·금액·
  인사정보 등 민감정보는 [ORG_1], [CLIENT_2], [PERSON_3], [MONEY_1] 같은 토큰으로
  치환되어 있습니다.
- 당신은 실제 값을 알 수 없으며, 알 필요도 없습니다. 토큰이 무엇을 가리키는지
  추측하지 마십시오.

[출력 규칙 — 매우 중요]
- 입력에 등장한 토큰은 출력에서도 반드시 대괄호 포함 문자 그대로 사용하십시오.
  예: 입력이 [ORG_1]이면 출력도 [ORG_1] (임의로 "우리 회사", "A사" 등으로 바꾸지 말 것).
- 입력에 없던 새 토큰([ORG_9] 등)을 만들어내지 마십시오.
- 액션아이템의 담당자(assignee)는 회의에서 언급된 사람 토큰([PERSON_2] 등) 중에서만
  고르십시오. 적절한 담당자를 특정할 수 없으면 assignee를 "미정"으로 두십시오.
- 결과물은 지정된 JSON 스키마를 정확히 따르며, 그 외 텍스트는 출력하지 마십시오.

[산출물]
하나의 회의 입력에서 서로 공개 범위가 다른 두 결과물을 동시에 생성합니다.
1) teamSummary: 팀 공유용 — 회의 요약, 결정 사항, 담당자가 배정된 액션아이템.
2) personalStar: 개인 커리어용 — 지정된 "나"(selfToken)의 발언·기여만 뽑아
   STAR(Situation-Task-Action-Result) 형식의 성과 문장으로 재구성.
   selfToken이 회의에서 한 기여가 없으면 personalStar는 빈 배열로 두십시오.`;

export function buildUserPrompt({ tokenizedTranscript, selfToken, meetingTitle }) {
  const title = meetingTitle ? `회의 제목: ${meetingTitle}\n` : '';
  const self = selfToken
    ? `개인 성과(STAR)를 추출할 대상("나")의 토큰: ${selfToken}\n`
    : `개인 성과(STAR) 대상 토큰이 지정되지 않았습니다. 화자를 특정하기 어려우면 personalStar는 빈 배열로 두십시오.\n`;

  return `${title}${self}
아래는 비식별화된 회의 내용입니다. 위 규칙에 따라 팀 요약과 개인 STAR 성과 문장을 생성하십시오.

--- 회의 내용 (토큰화됨) ---
${tokenizedTranscript}
--- 끝 ---`;
}

// 구조화 출력(structured outputs) JSON 스키마
export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    teamSummary: {
      type: 'object',
      properties: {
        overview: {
          type: 'string',
          description: '회의 전체를 2~4문장으로 요약. 토큰은 그대로 유지.',
        },
        decisions: {
          type: 'array',
          description: '회의에서 확정된 결정 사항 목록.',
          items: { type: 'string' },
        },
        actionItems: {
          type: 'array',
          description: '후속 액션아이템 목록.',
          items: {
            type: 'object',
            properties: {
              task: { type: 'string', description: '수행할 일.' },
              assignee: {
                type: 'string',
                description:
                  '담당자 토큰([PERSON_2] 등) 또는 특정 불가 시 "미정".',
              },
              dueDate: {
                type: 'string',
                description:
                  '기한. 회의에서 언급된 경우에만 기입, 없으면 빈 문자열.',
              },
            },
            required: ['task', 'assignee', 'dueDate'],
            additionalProperties: false,
          },
        },
      },
      required: ['overview', 'decisions', 'actionItems'],
      additionalProperties: false,
    },
    personalStar: {
      type: 'array',
      description: 'selfToken의 기여를 STAR 형식으로 재구성한 성과 문장들.',
      items: {
        type: 'object',
        properties: {
          situation: { type: 'string', description: '상황/배경.' },
          task: { type: 'string', description: '맡은 과제/목표.' },
          action: { type: 'string', description: '"나"가 실제로 한 행동.' },
          result: { type: 'string', description: '결과/영향.' },
          resumeLine: {
            type: 'string',
            description: '이력서/포트폴리오에 넣을 한 줄 성과 문장.',
          },
        },
        required: ['situation', 'task', 'action', 'result', 'resumeLine'],
        additionalProperties: false,
      },
    },
  },
  required: ['teamSummary', 'personalStar'],
  additionalProperties: false,
};
