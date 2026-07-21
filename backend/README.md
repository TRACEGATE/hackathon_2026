# VeilNote 백엔드 프로토타입

회의 내용을 **로컬에서 비식별화(토큰화)** 한 뒤, 백엔드는 토큰만 받아 LLM으로
**팀 회의요약 + 액션아이템**과 **개인 STAR 성과문장**을 **동시에** 생성하는 프록시입니다.

> 코드게이트 AI 스타트업 해커톤 — 팀 TRACEGATE / 서비스 VeilNote
> 이 저장소는 기획안의 **백엔드 · LLM API** + **토큰화 신뢰성(3단 방어)** 파트 프로토타입입니다.

## 토큰화 3단 방어 — "취약점을 기능으로"

규칙 기반 정규식만으로는 데모에서 하나만 놓쳐도 신뢰가 무너집니다. 그래서 3단으로 보강했습니다.

```
① 하이브리드 탐지        규칙(금액·전화·이메일·주민번호·카드·날짜)  +  온디바이스 한국어/다국어 NER
   (regex + ML)           = src/shared/detector.js                    = 브라우저 transformers.js
        │                    회사명·인명처럼 문맥 의존 개체까지 커버리지 확대
        ▼
② 사람이 확정 (HITL)      탐지 결과를 화면에 하이라이트 → "가려/놔둬/직접 추가"를 사용자가 확정
        │                  → 자동 탐지가 완벽할 필요 없어짐. 빠뜨림 위험이 "사용자 통제"라는 기능으로 전환.
        │                  → 심사 Q "규칙이 놓치면요?" → A "전송 전에 사용자가 최종 확인합니다."
        ▼
③ 역방향 유출검사         (A) 클라이언트: 매핑의 원본 값이 텍스트에 남아있으면 전송 차단  ← 원본 아는 쪽만 가능, 가장 정확
   (전송 전 게이트)        (B) 서버: 매핑 없이도 잔여 PII 패턴(이메일/전화/주민번호/카드) 발견 시 LLM 전송 차단
                          → "우리는 유출을 구조적으로 막는다"를 서버 경계에서까지 진짜로 성립시킴.
        ▼
                          토큰만 LLM으로 → 이중 산출물 → 기기에서 복원
```

②와 ③(A)는 브라우저(`public/index.html`), ③(B)는 백엔드(`/api/process` 게이트)에서 동작합니다.

## 데이터 흐름

```
[브라우저]                                   [백엔드]                 [Claude API]
원문
 │ ① 규칙+NER 탐지 → ② 사용자 확정 → 토큰화
 │ 매핑테이블은 IndexedDB(기기)에만 저장
 │ ③(A) 원본 잔존 검사 → 통과해야 전송
 ▼
토큰화 텍스트 ─────────────────────────────▶ /api/process
                                              │ ③(B) 잔여 PII 게이트 (통과 못하면 422, LLM 미호출)
                                              │ · 원문/매핑테이블 미수신 · 무저장
                                              ▼
                                            LLM ──▶ ①팀요약+액션아이템 ②개인STAR (토큰 유지)
 ◀────────────── 토큰 상태 결과 ──────────────┘
 │ 복원 (토큰 → 원문)
 ▼
팀 공유(A) / 개인 저장(B) — 공개 범위를 사용자가 직접 선택
```

## 빠른 시작

```bash
cd veilnote-backend
npm install

# 키 설정: .env 에 실제 키를 넣으세요 (.env 는 .gitignore 됨)
cp .env.example .env      # 그리고 .env 안의 ANTHROPIC_API_KEY 를 실제 값으로

npm start                 # http://localhost:3000  (브라우저 데모 포함)
```

- **브라우저 3단 데모**: 서버 실행 후 `http://localhost:3000/` 접속.
  ① 탐지 → ② 칩 클릭으로 확정 → ③ 유출검사 후 전송 → 복원 결과까지 한 화면에서 시연.
  (온디바이스 NER 모델은 최초 1회 다운로드 필요. 오프라인이면 규칙+사전으로 자동 폴백.)
- **CLI 엔드투엔드 데모**: `npm run demo` — 탐지·토큰화·2겹 유출검사(반례 차단 포함)·LLM·복원을 순서대로 출력.

## API

### `POST /api/process` — 메인
토큰화된 회의 텍스트 → 팀 요약 + 개인 STAR. **전송 전 서버측 잔여 PII 게이트** 통과 필수.

요청:
```json
{ "tokenizedTranscript": "[PERSON_1]: [CLIENT_1] 계약 [MONEY_1] ...", "selfToken": "[PERSON_1]", "meetingTitle": "..." }
```
정상 응답: `{ teamSummary, personalStar, _meta }` (모두 토큰 상태 — 복원은 클라이언트가 수행).
차단 응답(422): `{ error, code:"RESIDUAL_PII_BLOCKED", findings:[{type, preview(마스킹), confidence}] }`.

### `GET /health`
서비스 상태·모델·API 키 설정 여부.

### 데모 전용 ⚠️ (실서비스는 브라우저가 담당)
- `POST /api/demo/detect` — `{rawText, dictionary?}` → 규칙+사전 탐지 결과.
- `POST /api/demo/tokenize` — `{rawText, dictionary?}` → `{tokenized, mapping}`.
- `POST /api/demo/restore` — `{data, mapping}` → 복원 결과.

## 파일 구조

```
veilnote-backend/
├─ src/
│  ├─ server.js            Express · 엔드포인트 · 서버측 유출 게이트
│  ├─ llm.js               Claude 연동 · 이중 산출물 생성(구조화 출력)
│  ├─ prompts.js           시스템 프롬프트 · JSON Schema (토큰 보존 강제)
│  └─ shared/              ⭐ 브라우저·서버 공용 순수 모듈
│     ├─ detector.js       레이어 ① 규칙 탐지 + 겹침 해소 + 마스킹
│     ├─ tokenizer.js      규칙+사전+NER 병합 → 토큰화/복원
│     └─ leakGuard.js      레이어 ③ (A)원본대조 / (B)잔여 PII 스캔
├─ public/index.html       브라우저 3단 데모 (transformers.js NER + HITL UI)
├─ scripts/demo.js         CLI 엔드투엔드 데모
└─ .env.example
```

`src/shared/*` 는 Node 의존성이 없는 순수 ESM이라, 백엔드와 브라우저가 **동일 코드**를 씁니다
(서버는 `import`, 브라우저는 `/shared/*.js` 로 로드). 탐지·토큰화·유출검사 로직의 단일 진실원.

## 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (필수) | Claude API 키. 백엔드 전용, 클라이언트 미노출. |
| `VEILNOTE_MODEL` | `claude-opus-4-8` | 모델 ID. 데모 비용 절감 시 `claude-sonnet-5` 권장. |
| `VEILNOTE_EFFORT` | `medium` | 추론 강도: low/medium/high/xhigh/max. |
| `PORT` | `3000` | 서버 포트. |

## 기획안 대비 구현 범위

- ✅ 백엔드 프록시(Express) + LLM 연동, 토큰화 텍스트 → 팀요약·액션아이템 + 개인 STAR **동시 생성**
- ✅ 토큰 보존(구조화 출력) · 무저장 · 키 격리
- ✅ **하이브리드 탐지(규칙+NER)** · **HITL 확정 UI** · **2겹 역방향 유출 게이트**
- ⬜ Web Speech API 동의 흐름, IndexedDB 실제 영속화, 팀 채널/커리어 로그 연동 — 별도 파트
