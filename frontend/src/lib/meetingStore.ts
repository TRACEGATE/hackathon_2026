import type { ActionItem, MeetingRecord } from "../types";

const STORAGE_KEY = "veilnote_meetings_v1";

/** localStorage에서 저장된 회의 기록 목록을 불러온다. 실패 시 빈 배열을 반환한다. */
export function loadMeetings(): MeetingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MeetingRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(records: MeetingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 프라이빗 모드 등 localStorage를 사용할 수 없는 환경 — 저장 실패는 무시하고 진행
  }
}

/** 새 회의 분석 결과를 목록 맨 앞에 추가하고 저장한다. 새로 생성된 배열을 반환한다. */
export function addMeeting(
  records: MeetingRecord[],
  summary: string,
  actionItems: ActionItem[],
): MeetingRecord[] {
  const record: MeetingRecord = {
    id: `meeting_${Date.now()}`,
    createdAt: new Date().toISOString(),
    summary,
    actionItems: actionItems.map((item) => ({ ...item, done: false })),
  };
  const next = [record, ...records];
  persist(next);
  return next;
}

/** 특정 회의의 특정 액션아이템 완료 상태를 토글하고 저장한다. */
export function toggleActionItem(
  records: MeetingRecord[],
  meetingId: string,
  itemIndex: number,
): MeetingRecord[] {
  const next = records.map((record) => {
    if (record.id !== meetingId) return record;
    return {
      ...record,
      actionItems: record.actionItems.map((item, index) =>
        index === itemIndex ? { ...item, done: !item.done } : item,
      ),
    };
  });
  persist(next);
  return next;
}
