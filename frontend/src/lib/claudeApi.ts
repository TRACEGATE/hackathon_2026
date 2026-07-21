import type { AiResult } from "../types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `당신은 회의 메모를 정리하는 어시스턴트입니다.
입력 텍스트는 이미 민감정보가 [ORG_1], [PERSON_1], [AMOUNT_1] 같은 토큰으로 치환되어 있습니다.
이 토큰들은 절대로 실제 값으로 추측하거나 풀어 쓰지 말고, 반드시 원래 형태 그대로 결과에 유지하세요.

아래 두 가지를 동시에 작성해서 순수한 JSON으로만 응답하세요. 마크다운 코드 블록이나 설명 문장은 절대 포함하지 마세요.

{
  "teamSummary": {
    "summary": "팀 공유용 회의 요약 (3~5문장, 한국어)",
    "actionItems": [
      { "task": "실행해야 할 구체적인 액션 아이템", "owner": "담당자로 제안하는 대상(텍스트에 등장한 토큰 또는 역할)", "done": false }
    ]
  },
  "starStory": {
    "situation": "상황(Situation) - 어떤 배경/맥락이었는지",
    "task": "과제(Task) - 무엇을 해결해야 했는지",
    "action": "행동(Action) - 화자가 구체적으로 어떤 행동을 했는지",
    "result": "결과(Result) - 어떤 성과/결과로 이어졌는지"
  }
}

actionItems는 최소 1개, 최대 4개로 작성하세요. done 필드는 아직 아무도 처리하지 않은 새 항목이므로 항상 false로 작성하세요.
STAR 문장은 텍스트에서 화자 본인의 기여로 읽히는 내용을 바탕으로, 개인 성과 기록에 쓸 수 있도록 1인칭 관점으로 작성하세요.`;

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export async function generateSummaryAndStar(tokenizedText: string): Promise<AiResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "API 키가 설정되지 않았습니다. frontend/.env 파일에 VITE_ANTHROPIC_API_KEY 값을 설정한 뒤 다시 시도해주세요.",
    );
  }

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `다음은 토큰화된 회의 메모입니다:\n\n${tokenizedText}`,
          },
        ],
      }),
    });
  } catch {
    throw new Error("네트워크 오류로 AI 서버에 연결하지 못했습니다. 인터넷 연결을 확인해주세요.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json();
      detail = errBody?.error?.message ?? "";
    } catch {
      // 응답 본문을 파싱할 수 없는 경우 무시
    }
    if (response.status === 401) {
      throw new Error("API 키 인증에 실패했습니다. VITE_ANTHROPIC_API_KEY 값을 확인해주세요.");
    }
    if (response.status === 429) {
      throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    }
    throw new Error(`AI 요청이 실패했습니다 (${response.status}). ${detail}`.trim());
  }

  const data = await response.json();
  const rawText: string = data?.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(extractJson(rawText));
    if (!parsed.teamSummary || !parsed.starStory) {
      throw new Error("응답 형식이 올바르지 않습니다.");
    }
    return parsed as AiResult;
  } catch {
    throw new Error("AI 응답을 해석하지 못했습니다. 다시 시도해주세요.");
  }
}
