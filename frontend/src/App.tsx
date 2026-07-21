import { useState } from "react";
import "./App.css";
import type { MeetingProcessResult, MeetingRecord, Screen, TokenizeResult, View } from "./types";
import { tokenizeText, restoreDeep } from "./lib/tokenizer";
import { processMeeting, BackendApiError } from "./lib/claudeApi";
import { loadMeetings, addMeeting, toggleTaskStatus } from "./lib/meetingStore";
import HomeScreen from "./components/HomeScreen";
import InputScreen from "./components/InputScreen";
import ProcessingScreen from "./components/ProcessingScreen";
import ResultScreen from "./components/ResultScreen";
import DashboardScreen from "./components/DashboardScreen";

export default function App() {
  const [view, setView] = useState<View>("flow");
  const [screen, setScreen] = useState<Screen>("home");
  const [memoText, setMemoText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [originalText, setOriginalText] = useState("");
  const [tokenizeResult, setTokenizeResult] = useState<TokenizeResult | null>(null);
  const [aiRawResult, setAiRawResult] = useState<MeetingProcessResult | null>(null);
  const [aiRestoredResult, setAiRestoredResult] = useState<MeetingProcessResult | null>(null);

  const [meetings, setMeetings] = useState<MeetingRecord[]>(() => loadMeetings());
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);

  const openItemCount = meetings.reduce(
    (sum, m) => sum + m.tasks.filter((task) => task.status !== "done").length,
    0,
  );

  const handleSubmit = async () => {
    const trimmed = memoText.trim();
    if (!trimmed) {
      setError("회의·업무 메모를 입력해주세요.");
      return;
    }

    setError(null);
    const result = tokenizeText(trimmed);
    setOriginalText(trimmed);
    setTokenizeResult(result);
    setScreen("processing");

    try {
      const rawResult = await processMeeting(result.tokenizedText);
      const restoredResult: MeetingProcessResult = restoreDeep(rawResult, result.mappings);
      setAiRawResult(rawResult);
      setAiRestoredResult(restoredResult);

      const nextMeetings = addMeeting(
        meetings,
        restoredResult.summary,
        restoredResult.decisions,
        restoredResult.tasks,
      );
      setMeetings(nextMeetings);
      setCurrentMeetingId(nextMeetings[0].id);

      setScreen("result");
    } catch (err) {
      if (err instanceof BackendApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      }
      setScreen("input");
    }
  };

  const handleToggleTask = (meetingId: string, taskId: string) => {
    setMeetings((prev) => toggleTaskStatus(prev, meetingId, taskId));
  };

  const handleReset = () => {
    setMemoText("");
    setError(null);
    setOriginalText("");
    setTokenizeResult(null);
    setAiRawResult(null);
    setAiRestoredResult(null);
    setCurrentMeetingId(null);
    setScreen("input");
    setView("flow");
  };

  const currentMeeting = meetings.find((m) => m.id === currentMeetingId) ?? null;

  // 홈 화면은 기존 앱 헤더/탭이 전혀 보이지 않는 완전히 독립적인 첫 페이지라
  // app-shell(헤더+메인) 안에 끼워 넣지 않고 화면 전체를 그대로 대체한다.
  if (view === "flow" && screen === "home") {
    return <HomeScreen onStart={() => setScreen("input")} />;
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-brand">
          <span className="app-logo">VeilNote</span>
        </div>
        <nav className="app-nav">
          <button
            type="button"
            className={`app-nav-link ${view === "flow" ? "app-nav-link--active" : ""}`}
            onClick={() => setView("flow")}
          >
            메모 입력
          </button>
          <button
            type="button"
            className={`app-nav-link ${view === "dashboard" ? "app-nav-link--active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            대시보드
            {openItemCount > 0 && <span className="app-nav-badge">{openItemCount}</span>}
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === "dashboard" ? (
          <DashboardScreen meetings={meetings} onToggle={handleToggleTask} />
        ) : (
          <>
            {screen === "input" && (
              <InputScreen value={memoText} onChange={setMemoText} onSubmit={handleSubmit} error={error} />
            )}
            {screen === "processing" && (
              <ProcessingScreen tokenCount={tokenizeResult?.mappings.length ?? 0} />
            )}
            {screen === "result" && tokenizeResult && aiRawResult && aiRestoredResult && currentMeeting && (
              <ResultScreen
                originalText={originalText}
                tokenizeResult={tokenizeResult}
                aiRawResult={aiRawResult}
                aiRestoredResult={aiRestoredResult}
                tasks={currentMeeting.tasks}
                onToggleTask={(taskId) => handleToggleTask(currentMeeting.id, taskId)}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
