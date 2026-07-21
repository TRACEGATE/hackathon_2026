interface ProcessingScreenProps {
  tokenCount: number;
}

export default function ProcessingScreen({ tokenCount }: ProcessingScreenProps) {
  return (
    <div className="screen processing-screen">
      <div className="processing-card">
        <div className="spinner" aria-hidden="true" />
        <h2>안전하게 처리하고 있습니다</h2>
        <ul className="processing-steps">
          <li className="processing-step processing-step--done">
            <span className="step-icon">✓</span>
            민감정보 {tokenCount}건을 로컬에서 보호 처리 완료
          </li>
          <li className="processing-step processing-step--active">
            <span className="step-icon step-icon--spin" />
            보호 처리된 텍스트만 백엔드로 전달해 요약·결정사항·액션아이템 생성 중
          </li>
        </ul>
        <p className="processing-note">실제 회사명·고객사명·금액·인명은 이 브라우저 밖으로 전송되지 않습니다.</p>
      </div>
    </div>
  );
}
