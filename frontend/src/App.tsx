import { useState } from "react";
import "./App.css";
import type { AiResult, MeetingRecord, Screen, TokenizeResult, View } from "./types";
import { tokenizeText, restoreDeep } from "./lib/tokenizer";
import { generateSummaryAndStar } from "./lib/claudeApi";
import { loadMeetings, addMeeting, toggleActionItem } from "./lib/meetingStore";
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
  const [aiRawResult, setAiRawResult] = useState<AiResult | null>(null);
  const [aiRestoredResult, setAiRestoredResult] = useState<AiResult | null>(null);

  const [meetings, setMeetings] = useState<MeetingRecord[]>(() => loadMeetings());
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);

  const openItemCount = meetings.reduce(
    (sum, m) => sum + m.actionItems.filter((item) => !item.done).length,
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
      const rawResult = await generateSummaryAndStar(result.tokenizedText);
      const restoredResult: AiResult = restoreDeep(rawResult, result.mappings);
      setAiRawResult(rawResult);
      setAiRestoredResult(restoredResult);

      const nextMeetings = addMeeting(
        meetings,
        restoredResult.teamSummary.summary,
        restoredResult.teamSummary.actionItems,
      );
      setMeetings(nextMeetings);
      setCurrentMeetingId(nextMeetings[0].id);

      setScreen("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setScreen("input");
    }
  };

  const handleToggleActionItem = (meetingId: string, index: number) => {
    setMeetings((prev) => toggleActionItem(prev, meetingId, index));
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

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-brand">
          <span className="app-logo">VeilNote</span>
          <span className="app-tagline">비식별화 회의록 에이전트</span>
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
            액션아이템 대시보드
            {openItemCount > 0 && <span className="app-nav-badge">{openItemCount}</span>}
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === "dashboard" ? (
          <DashboardScreen meetings={meetings} onToggle={handleToggleActionItem} />
        ) : (
          <>
            {screen === "home" && <HomeScreen onStart={() => setScreen("input")} />}
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
                actionItems={currentMeeting.actionItems}
                onToggleActionItem={(index) => handleToggleActionItem(currentMeeting.id, index)}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
