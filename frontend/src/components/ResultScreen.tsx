import { useState } from "react";
import type { ActionItem, AiResult, TokenizeResult } from "../types";
import { buildOriginalSegments, buildTokenSegments } from "../lib/highlight";
import HighlightedText from "./HighlightedText";
import ActionChecklist from "./ActionChecklist";

interface ResultScreenProps {
  originalText: string;
  tokenizeResult: TokenizeResult;
  aiRawResult: AiResult;
  aiRestoredResult: AiResult;
  actionItems: ActionItem[];
  onToggleActionItem: (index: number) => void;
  onReset: () => void;
}

type ResultTab = "team" | "star";

export default function ResultScreen({
  originalText,
  tokenizeResult,
  aiRawResult,
  aiRestoredResult,
  actionItems,
  onToggleActionItem,
  onReset,
}: ResultScreenProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>("team");
  const [showRaw, setShowRaw] = useState<Record<ResultTab, boolean>>({ team: false, star: false });

  const originalSegments = buildOriginalSegments(originalText, tokenizeResult.mappings);
  const tokenSegments = buildTokenSegments(tokenizeResult.tokenizedText);

  const toggleRaw = (tab: ResultTab) => setShowRaw((prev) => ({ ...prev, [tab]: !prev[tab] }));

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
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "team"}
            className={`tab ${activeTab === "team" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            A. 팀 공유용 회의 요약
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "star"}
            className={`tab ${activeTab === "star" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("star")}
          >
            B. 개인 성과 STAR 문장
          </button>
        </div>

        {activeTab === "team" ? (
          <div className="tab-panel">
            <h3 className="tab-panel-title">회의 요약</h3>
            <p className="body-text">{aiRestoredResult.teamSummary.summary}</p>

            <h3 className="tab-panel-title">액션 아이템</h3>
            <ActionChecklist items={actionItems} onToggle={onToggleActionItem} />

            <button type="button" className="btn-link" onClick={() => toggleRaw("team")}>
              {showRaw.team ? "AI 원본 응답 숨기기" : "AI가 실제로 생성한 보호 처리된 내용 보기"}
            </button>
            {showRaw.team && (
              <div className="raw-preview">
                <p className="body-text body-text--muted">{aiRawResult.teamSummary.summary}</p>
                <ul className="action-item-list">
                  {aiRawResult.teamSummary.actionItems.map((item, index) => (
                    <li key={index} className="action-item action-item--muted">
                      <span className="action-item-task">{item.task}</span>
                      <span className="action-item-owner">담당 제안: {item.owner}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="tab-panel">
            <div className="star-grid">
              <div className="star-block">
                <span className="star-label">S · 상황</span>
                <p className="body-text">{aiRestoredResult.starStory.situation}</p>
              </div>
              <div className="star-block">
                <span className="star-label">T · 과제</span>
                <p className="body-text">{aiRestoredResult.starStory.task}</p>
              </div>
              <div className="star-block">
                <span className="star-label">A · 행동</span>
                <p className="body-text">{aiRestoredResult.starStory.action}</p>
              </div>
              <div className="star-block">
                <span className="star-label">R · 결과</span>
                <p className="body-text">{aiRestoredResult.starStory.result}</p>
              </div>
            </div>

            <button type="button" className="btn-link" onClick={() => toggleRaw("star")}>
              {showRaw.star ? "AI 원본 응답 숨기기" : "AI가 실제로 생성한 보호 처리된 내용 보기"}
            </button>
            {showRaw.star && (
              <div className="raw-preview star-grid">
                <div className="star-block">
                  <span className="star-label">S · 상황</span>
                  <p className="body-text body-text--muted">{aiRawResult.starStory.situation}</p>
                </div>
                <div className="star-block">
                  <span className="star-label">T · 과제</span>
                  <p className="body-text body-text--muted">{aiRawResult.starStory.task}</p>
                </div>
                <div className="star-block">
                  <span className="star-label">A · 행동</span>
                  <p className="body-text body-text--muted">{aiRawResult.starStory.action}</p>
                </div>
                <div className="star-block">
                  <span className="star-label">R · 결과</span>
                  <p className="body-text body-text--muted">{aiRawResult.starStory.result}</p>
                </div>
              </div>
            )}
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
