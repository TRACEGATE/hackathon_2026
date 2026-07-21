import { useCallback, useRef, useState } from "react";
import { SAMPLE_MEMO } from "../lib/sampleData";
import { isMeetingRecorderSupported, useMeetingRecorder } from "../hooks/useMeetingRecorder";
import ConsentModal from "./ConsentModal";

interface InputScreenProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error: string | null;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatClock(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export default function InputScreen({ value, onChange, onSubmit, error }: InputScreenProps) {
  const [isSupported] = useState(() => isMeetingRecorderSupported());
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);
  const [autoStopNotice, setAutoStopNotice] = useState(false);

  const recordingBaseRef = useRef("");
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSegment = useCallback(
    (chunk: string) => {
      if (!chunk) return;
      recordingBaseRef.current = recordingBaseRef.current
        ? `${recordingBaseRef.current} ${chunk}`
        : chunk;
      onChange(recordingBaseRef.current);
    },
    [onChange],
  );

  const handleAutoStop = useCallback(() => {
    setAutoStopNotice(true);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => setAutoStopNotice(false), 6000);
  }, []);

  const {
    isRecording,
    isModelLoading,
    modelLoadProgress,
    error: speechError,
    start,
    stop,
  } = useMeetingRecorder({
    onSegment: handleSegment,
    onAutoStop: handleAutoStop,
  });

  const handleVoiceButtonClick = () => {
    if (!isSupported) return;
    setShowConsentModal(true);
  };

  const handleConsentCancel = () => setShowConsentModal(false);

  const handleConsentConfirm = () => {
    const now = new Date();
    const formatted = formatClock(now);
    console.log(`[VeilNote] 음성 입력 동의 시각: ${formatted}`);
    setConsentTimestamp(formatted);
    setShowConsentModal(false);
    setAutoStopNotice(false);
    recordingBaseRef.current = value ? `${value}\n` : "";
    start();
  };

  return (
    <div className="screen input-screen">
      <div className="card">
        <div className="card-header-row">
          <label className="field-label" htmlFor="memo-input">
            회의 메모
          </label>
          <div className="input-mode-actions">
            <button type="button" className="btn-link" onClick={() => onChange(SAMPLE_MEMO)}>
              예시 메모 불러오기
            </button>
            <button
              type="button"
              className="btn-voice"
              onClick={handleVoiceButtonClick}
              disabled={!isSupported || isRecording || isModelLoading}
              title={isSupported ? undefined : "이 브라우저에서는 온디바이스 음성 입력을 지원하지 않습니다."}
            >
              <span className="voice-icon-dot" aria-hidden="true" />
              음성으로 입력
            </button>
          </div>
        </div>

        {!isSupported && (
          <p className="voice-unsupported-note">
            이 브라우저에서는 온디바이스 음성 입력(마이크 접근, AudioWorklet, WebAssembly)을 지원하지
            않습니다. 최신 Chrome 브라우저에서 이용해주세요.
          </p>
        )}

        {isModelLoading && (
          <div className="voice-status-bar">
            <span className="voice-recording-dot" aria-hidden="true" />
            <span className="voice-status-text">
              온디바이스 음성 모델을 불러오는 중입니다… ({Math.round(modelLoadProgress)}%)
            </span>
          </div>
        )}

        {isRecording && (
          <div className="voice-status-bar">
            <span className="voice-recording-dot" aria-hidden="true" />
            <span className="voice-status-text">듣고있어요</span>
            <button type="button" className="btn-link voice-stop-btn" onClick={stop}>
              종료
            </button>
          </div>
        )}

        {autoStopNotice && (
          <p className="voice-auto-stop-note">무음이 감지되어 자동으로 종료되었습니다.</p>
        )}

        {speechError && <p className="error-message">{speechError}</p>}

        <textarea
          id="memo-input"
          className="memo-textarea"
          placeholder="예) 오늘 삼성전자 구매팀과 미팅을 진행했고, 김민수 팀장이 계약 금액 3천만원을 제안했다..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
        />
        {error && <p className="error-message">{error}</p>}
        <div className="card-footer-row">
          <span className="char-count">
            {value.length.toLocaleString()}자
            {consentTimestamp && <span className="consent-timestamp"> · 동의 시각: {consentTimestamp}</span>}
          </span>
          <button type="button" className="btn-primary" onClick={onSubmit}>
            AI로 안전하게 분석하기
          </button>
        </div>
      </div>

      {showConsentModal && (
        <ConsentModal onConfirm={handleConsentConfirm} onCancel={handleConsentCancel} />
      )}
    </div>
  );
}
