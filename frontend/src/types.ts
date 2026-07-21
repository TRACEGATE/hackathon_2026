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

export interface ActionItem {
  task: string;
  owner: string;
  done: boolean;
}

export interface TeamSummary {
  summary: string;
  actionItems: ActionItem[];
}

export interface StarStory {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface AiResult {
  teamSummary: TeamSummary;
  starStory: StarStory;
}

export type Screen = "home" | "input" | "processing" | "result";

export type View = "flow" | "dashboard";

/** 회의 1건의 액션아이템을 브라우저(localStorage)에 누적 저장하기 위한 레코드. */
export interface MeetingRecord {
  id: string;
  createdAt: string;
  summary: string;
  actionItems: ActionItem[];
}
