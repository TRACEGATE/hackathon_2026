export type EntityType = "ORG" | "PERSON" | "AMOUNT";

export interface TokenMapping {
  token: string;
  type: EntityType;
  original: string;
}

export interface TokenizeResult {
  tokenizedText: string;
  mappings: TokenMapping[];
}

export type Priority = "P1" | "P2" | "P3";

export type TaskStatus = "open" | "done";

/** 백엔드 /api/process-meeting이 생성하고, 할일 대시보드가 그대로 다루는 액션아이템. */
export interface Task {
  id: string;
  text: string;
  ownerToken: string | null;
  ownerReason: string;
  priority: Priority;
  priorityReason: string;
  dueOffsetDays: number | null;
  dueReason: string;
  status: TaskStatus;
  source: "meeting";
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
  completedAt: string | null;
}

export interface Correction {
  before: string;
  after: string;
}

/** POST /api/process-meeting의 응답. 모든 문자열 필드는 토큰 상태 그대로 온다. */
export interface MeetingProcessResult {
  corrections: Correction[];
  summary: string;
  decisions: string[];
  tasks: Task[];
  _meta?: {
    model?: string;
    stopReason?: string;
    usage?: unknown;
  };
}

export type Screen = "home" | "input" | "processing" | "result";

export type View = "flow" | "dashboard";

/** 회의 1건의 처리 결과를 브라우저(localStorage)에 누적 저장하기 위한 레코드. */
export interface MeetingRecord {
  id: string;
  createdAt: string;
  summary: string;
  decisions: string[];
  tasks: Task[];
}
