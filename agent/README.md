# 분석 엔진 (2단계)

로컬 전용. Claude Code 구독제(Pro/Max)로 작동.
**사이트는 절대 Claude 를 호출하지 않습니다 — 이 폴더의 도구만 호출합니다.**

## 폴더 구조

```
agent/
├── .env                  # 로컬 전용 (사용자가 직접 작성, 커밋 금지)
├── .env.example
├── report_template.md    # 9 섹션 스켈레톤
├── report-theme.css      # 자가완결형 보고서 CSS (인쇄 대응)
├── md_to_html.js         # MD → HTML 변환
├── pull.js               # Supabase 의 intake 자료 1 건 다운로드
├── push.js               # 작성된 보고서를 업로드 + status=draft 로 갱신
├── inbox/                # pull 로 받은 작업 폴더 (각 reportId 마다 하위 폴더)
│   └── <reportId>/
│       ├── meta.json     # 회사/티커/기간 등 메타
│       ├── pdf/          # 원본 PDF 들
│       └── report.md     # ← 여기에 9 섹션 작성 (Claude Code 가 수행)
└── README.md
```

## 운영 루프

```
[사이트] /admin/reports/new 에서 PDF 업로드
   ↓ status=intake 로 reports 행 생성

[로컬]  node --env-file=agent/.env agent/pull.js
   ↓ agent/inbox/<reportId>/ 에 PDF + 템플릿 복사

[로컬]  Claude Code 에서 분석 (사람이 지켜보며):
   "Supabase 의 분석대기(intake) 자료 가져와서 9섹션 투자검토보고서 만들어줘.
    산업 시장규모·경쟁구도·최근 M&A 는 웹검색해서 채워줘."
   ↓ inbox/<reportId>/report.md 가 완성됨 (사람이 검수)

[로컬]  node --env-file=agent/.env agent/push.js <reportId> [--web-search]
   ↓ report.md → reports-md, report.html → reports-html
   ↓ reports 행 status=intake → draft

[사이트] /admin 에서 draft 검토 → published 로 토글
   ↓ 승인 회원이 /reports 에서 열람·다운로드
```

## 안전 규칙 (헌법)

- 모든 수치는 **(a)자료원천 / (b)웹검색출처 / (c)추정(가정 명시)** 중 하나로 분류한다.
- 자료에 없는 값을 사실로 단정하지 않는다 — 모르면 IRL(§7) 로 이관.
- 웹검색 인용은 출처 명기, 원문 장문 복제 금지(자체 문장으로 재서술).
- **인물의 얼굴 · 신상 추적 검색 금지.** 임원 정보는 공시 범위 내.
- 보고서 말미 면책문 고정.
- `published` 는 자동화하지 않는다 — 어드민이 사이트에서 수동 토글.

## 첫 실행 전 체크

- [ ] `agent/.env` 작성 (`.env.example` 복사 후 실제 값 입력)
- [ ] `ANTHROPIC_API_KEY` 환경변수 없음 확인 (있으면 과금 위험)
- [ ] `/status` 로 Claude Code 가 구독제 로그인인지 확인
- [ ] `npm i` 로 `markdown-it` 설치 완료
