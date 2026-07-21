import type { MeetingRecord } from "../types";
import ActionChecklist from "./ActionChecklist";

interface DashboardScreenProps {
  meetings: MeetingRecord[];
  onToggle: (meetingId: string, index: number) => void;
}

export default function DashboardScreen({ meetings, onToggle }: DashboardScreenProps) {
  const totalItems = meetings.reduce((sum, m) => sum + m.actionItems.length, 0);
  const doneItems = meetings.reduce(
    (sum, m) => sum + m.actionItems.filter((item) => item.done).length,
    0,
  );

  return (
    <div className="screen dashboard-screen">
      <div className="page-header">
        <p className="eyebrow">액션아이템 대시보드</p>
        <h1>회의별 액션아이템 현황</h1>
        <p className="page-description">
          지금까지 분석한 회의의 액션아이템을 모아봤습니다. 완료한 항목을 체크하면 이 브라우저에 저장되어
          다음에 다시 열어도 유지됩니다.
        </p>
      </div>

      {meetings.length === 0 ? (
        <div className="card">
          <p className="body-text body-text--muted">
            아직 저장된 회의가 없습니다. 메모를 입력해서 첫 회의를 분석해보세요.
          </p>
        </div>
      ) : (
        <>
          <div className="dashboard-stats">
            <span className="dashboard-stat">
              전체 <strong>{totalItems}</strong>건
            </span>
            <span className="dashboard-stat">
              완료 <strong>{doneItems}</strong>건
            </span>
            <span className="dashboard-stat">
              남음 <strong>{totalItems - doneItems}</strong>건
            </span>
          </div>

          <div className="dashboard-list">
            {meetings.map((meeting) => (
              <section key={meeting.id} className="card dashboard-meeting-card">
                <div className="dashboard-meeting-header">
                  <span className="dashboard-meeting-date">
                    {new Date(meeting.createdAt).toLocaleString("ko-KR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="body-text dashboard-meeting-summary">{meeting.summary}</p>
                <ActionChecklist
                  items={meeting.actionItems}
                  onToggle={(index) => onToggle(meeting.id, index)}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
