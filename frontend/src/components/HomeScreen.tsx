interface HomeScreenProps {
  onStart: () => void;
}

export default function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <div className="screen home-screen">
      <div className="page-header">
        <p className="eyebrow">VeilNote 프로토타입</p>
        <h1>회의·업무 메모를 입력하세요</h1>
        <p className="page-description">
          회사명·고객사명·금액·인명은 자동으로 감지되어 로컬에서 토큰으로 치환된 뒤 AI로 전달됩니다.
          실제 값은 AI에 노출되지 않고, 응답을 받은 뒤 이 브라우저에서만 다시 복원됩니다.
        </p>
      </div>

      <button type="button" className="btn-primary home-start-btn" onClick={onStart}>
        시작하기
      </button>
    </div>
  );
}
