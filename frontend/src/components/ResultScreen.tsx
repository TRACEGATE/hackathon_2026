import { useState } from "react";
import type { MeetingProcessResult, Task, TokenizeResult } from "../types";
import { buildOriginalSegments, buildTokenSegments } from "../lib/highlight";
import HighlightedText from "./HighlightedText";
import ActionChecklist from "./ActionChecklist";

interface ResultScreenProps {
  originalText: string;
  tokenizeResult: TokenizeResult;
  aiRawResult: MeetingProcessResult;
  aiRestoredResult: MeetingProcessResult;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onReset: () => void;
}

export default function ResultScreen({
  originalText,
  tokenizeResult,
  aiRawResult,
  aiRestoredResult,
  tasks,
  onToggleTask,
  onReset,
}: ResultScreenProps) {
  const [showRaw, setShowRaw] = useState(false);

  const originalSegments = buildOriginalSegments(originalText, tokenizeResult.mappings);
  const tokenSegments = buildTokenSegments(tokenizeResult.tokenizedText);

  return (
    <div className="screen result-screen">
      <div className="page-header">
        <p className="eyebrow">결과 비교</p>
        <h1>원문 → 보호 처리 → AI 처리 → 복원까지 한 번에</h1>
        <p className="page-description">
          아래는 실제로 일어난 3단계를 그대로 보여줍니다. AI에는 가운데 단계(보호 처리본)만 전달되었고, 결과는 이 브라우저에서 다시 복원되었습니다.
        </p>
      </div>

      <section className="card">
        <h2 className="section-title">1단계 · 민감정보 보호 처리</h2>
        <div className="compare-grid">
          <div className="compare-col">
            <span className="compare-label">원문</span>
            <HighlightedText segments={originalSegments} />
          </div>
          <div className="compare-arrow" aria-hidden="true">→</div>
          <div className="compare-col">
            <span className="compare-label">보호 처리본 (AI가 실제로 받은 텍스트)</span>
            <HighlightedText segments={tokenSegments} />
          </div>
        </div>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--org" /> 회사·고객사
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--person" /> 인명
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--amount" /> 금액
          </span>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">2단계 · AI 처리 결과 (복원 완료)</h2>

        <h3 className="tab-panel-title">회의 요약</h3>
        <p className="body-text">{aiRestoredResult.summary}</p>

        <h3 className="tab-panel-title">결정 사항</h3>
        {aiRestoredResult.decisions.length > 0 ? (
          <ul className="action-item-list">
            {aiRestoredResult.decisions.map((decision, index) => (
              <li key={index} className="action-item">
                <span className="action-item-task">{decision}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="body-text body-text--muted">회의에서 확정된 결정 사항이 없습니다.</p>
        )}

        <h3 className="tab-panel-title">액션 아이템 (할일)</h3>
        <ActionChecklist items={tasks} onToggle={onToggleTask} />

        <button type="button" className="btn-link" onClick={() => setShowRaw((prev) => !prev)}>
          {showRaw ? "AI 원본 응답 숨기기" : "AI가 실제로 생성한 보호 처리된 내용 보기"}
        </button>
        {showRaw && (
          <div className="raw-preview">
            <p className="body-text body-text--muted">{aiRawResult.summary}</p>
            <ul className="action-item-list">
              {aiRawResult.decisions.map((decision, index) => (
                <li key={index} className="action-item action-item--muted">
                  <span className="action-item-task">{decision}</span>
                </li>
              ))}
              {aiRawResult.tasks.map((task) => (
                <li key={task.id} className="action-item action-item--muted">
                  <span className="action-item-task">{task.text}</span>
                  <span className="action-item-owner">담당 제안: {task.ownerToken ?? "미배정"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="result-footer">
        <button type="button" className="btn-secondary" onClick={onReset}>
          새 메모 입력하기
        </button>
      </div>
    </div>
  );
}
