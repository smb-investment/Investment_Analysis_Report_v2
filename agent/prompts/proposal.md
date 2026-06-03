# 투자요청서 슬라이드 데이터 추출 프롬프트

당신은 SMB투자파트너스의 투자요청서(PF 제안서) 작성 전문가입니다.

## 작업 정보
- 회사명: {{company}}
- 프로젝트명: {{projectName}}
- 작업 디렉토리: {{workDir}}
- Proposal ID: {{proposalId}}

## 지시사항

1. `{{workDir}}/meta.json` 파일에서 proposal 메타데이터를 읽으세요.
2. `{{workDir}}/attachments/` 폴더의 모든 첨부파일(PDF, Excel, 이미지 등)을 분석하세요.
3. 아래 21-슬라이드 구조에 맞게 `{{workDir}}/slides.json` 파일을 생성하세요.

## slides.json 구조

```json
{
  "company": "회사명",
  "project": "프로젝트명",
  "date": "YYYY년 MM월",
  "slides": {
    "cover": {
      "company": "경남QSF",
      "subtitle": "초저온 QSF 급속동결 제조센터",
      "tagline": "세계 최초 -60℃식품 콜드체인 허브 구축 사업",
      "kpi1_value": "573억원", "kpi1_label": "총 사업비",
      "kpi2_value": "380억원", "kpi2_label": "PF 조달 요청액",
      "kpi3_value": "137톤/일", "kpi3_label": "처리능력",
      "kpi4_value": "2031E", "kpi4_label": "EBITDA 목표"
    },
    "toc": {
      "sections": [
        {"num": "01", "title": "Executive Summary", "desc": "딜 개요 & 전략"},
        {"num": "02", "title": "시장 기회 분석", "desc": "시장 규모 · 경쟁 구도"},
        {"num": "03", "title": "비즈니스 모델 & 기술", "desc": "수익원 · 인프라"},
        {"num": "04", "title": "재무 전망", "desc": "매출 예측 · CAPEX"},
        {"num": "05", "title": "투자 제안", "desc": "자금 조달 구조 · 담보"},
        {"num": "06", "title": "리스크 관리", "desc": "5대 리스크 대응 체계"}
      ]
    },
    "executive_summary": {
      "headline": "국내 유일 -60℃ 대량 급속동결 인프라 선점 — 검증된 수요와 2-Phase 전략으로 고수익 실현",
      "cards": [
        {"title": "국내 유일 Mass QSF", "body": "국내 최초 137톤/일 처리능력의 개방형 초저온 제조 플랫폼"},
        {"title": "2-Phase Strategy", "body": "Phase 1(전기식): Fast-Track 상업화 / Phase 2(LNG): 에너지비 40~70% 절감"},
        {"title": "검증된 수요 (LOI)", "body": "27개사 LOI 체결 완료. 월 5,800톤 선확보 → 초기 가동률 92%"},
        {"title": "폭발적 성장 잠재력", "body": "매출 CAGR ~65% (2027~2031) / 2031E 매출 1,698억원"},
        {"title": "Deal Structure", "body": "총 사업비 573억원 · 조달 요청 380억원(선순위) / LTV 약 73%"},
        {"title": "ESG & Efficiency", "body": "버려지는 LNG 냉열(-162℃) 활용. 탄소 배출 저감 · 에너지 효율화"}
      ]
    },
    "market_opportunity": {
      "headline": "HMR·콜드체인 시장 CAGR 15% 고성장 + 초저온 패러다임 전환 — 선점 기회",
      "kpis": [
        {"value": "CAGR 15%", "label": "HMR/밀키트 시장 성장률", "desc": "지속적 간편식 수요 폭증"},
        {"value": "69.8kg", "label": "1인당 수산물 소비량", "desc": "세계 1위, 프리미엄 수요 확대"},
        {"value": "Paradigm", "label": "초저온(-60℃) 전환", "desc": "단순 보관 → 고품질 제조 동결"}
      ],
      "pain_points": [
        {"title": "-18℃ 보관의 한계", "body": "빙결정 성장으로 해동 후 드립 발생 → 프리미엄 원물이 저급 냉동품으로 전락"},
        {"title": "성수기 수급 불균형", "body": "제철 물량 처리 인프라 부족 → 헐값 위판·폐기 반복"},
        {"title": "통합 플랫폼 부재", "body": "산지-가공-저장-수출 단절 → 물류비 증가·품질 손상"},
        {"title": "LNG 냉열 미활용", "body": "-162℃ 냉열을 버리고 막대한 전기 소비(OPEX 70%)"}
      ]
    },
    "competitive_advantage": {
      "headline": "압도적 처리능력 + 개방형 플랫폼 = 경쟁사가 복제 불가능한 구조적 해자(Moat)",
      "advantages": [
        {"num": "01", "title": "압도적 처리능력", "value": "137톤/일", "desc": "국내 최대 규모 Mass QSF"},
        {"num": "02", "title": "개방형 B2B 플랫폼", "value": "제조·가공·수출", "desc": "외부 고객사 대상 시설 개방"},
        {"num": "03", "title": "프리미엄 초저온 품질", "value": "미세빙정 ≤10μm", "desc": "Drip Loss <3% · 24개월 보관"},
        {"num": "04", "title": "LNG 냉열 비용 절감", "value": "비용 40~70% ↓", "desc": "전기식 대비 압도적 원가 경쟁력"},
        {"num": "05", "title": "검증된 실행력", "value": "LOI 27개사 확보", "desc": "월 5,800톤 선주문 · 2027.01 목표"}
      ]
    },
    "business_model": {
      "headline": "5개 다각화 수익원 × 원스톱 플랫폼 — 제조·가공·수출이 결합된 고부가가치 수익 모델",
      "value_chain": ["QSF Factory (원팩 제조 · 급속동결)", "Cold Chain Logistics (전국 익일 배송)", "Franchise Store (간편 조리)", "Customer (Premium Experience)"],
      "revenue_streams": [
        {"pct": "57%", "title": "제조 (Product)", "desc": "프리미엄 HMR·PB·수산물"},
        {"pct": "18%", "title": "가공 (Processing)", "desc": "임가공 수수료·전처리"},
        {"pct": "15%", "title": "수수료 (Fees)", "desc": "냉동 보관료·물류비"},
        {"pct": "10%", "title": "프랜차이즈", "desc": "원팩 공급·로열티"},
        {"pct": "★", "title": "수출 (Export)", "desc": "K-Food 글로벌화"}
      ]
    },
    "revenue_forecast": {
      "headline": "2027~2031 매출 CAGR ~65% · 2031E 1,795억원 — Phase 2 LNG 도입으로 수익성 가속화",
      "kpis": [
        {"value": "~65%", "label": "CAGR (2027~31)", "desc": "연평균 고속 성장 전망"},
        {"value": "1,795억", "label": "2031E 매출 목표", "desc": "안정화 단계 진입 매출 규모"},
        {"value": "Phase 2", "label": "2029 LNG 도입", "desc": "에너지비 절감으로 수익성 가속화"}
      ],
      "chart_data": [
        {"year": "2027", "value": 297},
        {"year": "2028", "value": 701},
        {"year": "2029", "value": 1130, "phase2": true},
        {"year": "2030", "value": 1334},
        {"year": "2031", "value": 1795}
      ]
    },
    "capex": {
      "headline": "Phase 1(전기식) Fast-Track 상업화 → Phase 2(LNG) 에너지 비용 40~70% 절감으로 수익성 극대화",
      "phases": {
        "phase1": {
          "label": "Phase 1 | 전기식 급속동결",
          "subtitle": "Fast-Track Strategy | 2026.10 ~",
          "rows": [
            {"key": "투자 규모 (CAPEX)", "value": "380억원"},
            {"key": "주요 설비", "value": "전기식 동결기 / 보관장"},
            {"key": "상업운전 목표", "value": "2027년 01월"},
            {"key": "목표 매출 (2027)", "value": "297억원"},
            {"key": "핵심 목표", "value": "조기 상업화 & 시장 진입"}
          ],
          "memo": "전기식 선도입으로 기술 리스크 최소화 및 초기 레퍼런스 확보. LOI 확보 물량(5,800톤/월) 기반 즉시 현금흐름 창출."
        },
        "phase2": {
          "label": "Phase 2 | LNG 냉열 활용",
          "subtitle": "Profitability Max | 2029 ~",
          "rows": [
            {"key": "추가 투자 (CAPEX)", "value": "170억원"},
            {"key": "주요 설비", "value": "LNG 열교환기 / 저장탱크"},
            {"key": "에너지 절감", "value": "40~70% 비용 절감"},
            {"key": "마진 개선", "value": "EBITDA Margin 급상승"},
            {"key": "핵심 목표", "value": "수익성 극대화 & ESG"}
          ],
          "memo": "사업 안정화 후 LNG 열교환기·배관망 투자 집행. 원가 절감분이 영업이익으로 직결 → IPO 모멘텀 확보."
        }
      }
    },
    "investment_proposal": {
      "headline": "380억원 선순위 조달 · LTV 73% · DSCR 1.5x 이상 유지 — 안정적 담보와 검증된 현금흐름으로 상환 보장",
      "kpis": [
        {"value": "380억원", "label": "총 조달 요청액", "desc": "선순위 Tranche A"},
        {"value": "60개월", "label": "대출 기간", "desc": "5년 만기 구조"},
        {"value": "[8]%", "label": "예상 금리", "desc": "Tranche별 차등. 협의결정"},
        {"value": "~73%", "label": "LTV", "desc": "준공 후 감정평가 520억 기준"}
      ],
      "use_of_proceeds": [
        {"value": "100억원", "label": "토지비 (Land)"},
        {"value": "116억원", "label": "건축비 (Building)"},
        {"value": "98억원", "label": "설비비 (Equipment)"},
        {"value": "66억원", "label": "금융비용/기타"}
      ],
      "investor_protection": [
        "Cash Sweep: 운영 수익 발생 시 대출 원금 우선 상환 구조 (DSCR 1.2x 이상 유지)",
        "물적 담보: 사업부지·건물·기계기구 1순위 우선수익권 설정 + 부동산담보신탁",
        "Exit Strategy: 원리금 분할상환 및 2030년 IPO 추진",
        "투명성: 자금관리 대리사무계약 — 자금 집행 통제 및 월간 운용 리포트 제공"
      ]
    },
    "risk_management": {
      "headline": "5대 리스크 선제적 대응 체계 — 책임준공·LOI 물량·Multi-Energy Mix으로 투자 안정성 확보",
      "risks": [
        {"title": "PF / 공사", "badge": "Monitor", "badge_color": "gold", "risk": "공사 지연 및 공사비 초과", "response": "책임준공 확약(EPC) · 예비비 확보"},
        {"title": "수요 / 매출", "badge": "Safe", "badge_color": "green", "risk": "초기 가동률 미달", "response": "LOI 27개사 선확보 (월 5,800톤 · 92% 가동 목표)"},
        {"title": "운영 / 품질", "badge": "Safe", "badge_color": "green", "risk": "설비 결함 및 품질 이슈", "response": "Mayekawa 고효율 설비 · 표준공정 도입"},
        {"title": "에너지 / 정책", "badge": "Monitor", "badge_color": "gold", "risk": "전력비 상승 및 에너지 정책 변화", "response": "Multi-Energy Mix (전기+LNG+연료전지)"},
        {"title": "원물 수급", "badge": "Safe", "badge_color": "green", "risk": "원물 수급 불안정", "response": "산지 다변화 + 장기 공급 계약 체결"}
      ]
    },
    "roadmap": {
      "headline": "2026 PF 약정 → 2027.01 상업운전 → 2029 LNG Phase 2 → 2030+ IPO / 수출 확대",
      "phases": [
        {"label": "준비/PF", "period": "2025~2026.Q1", "items": ["설계·인허가 완료", "PF 약정 체결 (2026.04)"]},
        {"label": "건설/시운전", "period": "2026.Q2~Q4", "items": ["공사 재개 (2026.05)", "준공 및 시운전 (2026.10)"]},
        {"label": "상업운전", "period": "2027~2028", "items": ["상업운전 개시 (2027.01)", "운영 최적화 및 AUM 확장"]},
        {"label": "Phase 2 (LNG)", "period": "2029", "items": ["LNG 설비 추가 투자 100억", "에너지비 40~70% 절감"]},
        {"label": "성장/IPO", "period": "2030+", "items": ["수출 확대 (K-Food Global)", "IPO 추진 목표"]}
      ],
      "note": "★ 주요 전제: PF 약정 2026.03 → 공사 재개 2026.04 → 시운전 2026.10 → 상업운전 2027.01"
    },
    "conclusion": {
      "headline": "국내 유일 -60℃ 대량 급속동결 인프라 선점 및 단계적 확장을 통한 고수익 실현",
      "subheadline": "-60℃ 검증된 수요(LOI 27개사·5,800톤/월)와 2-Phase 전략으로 리스크를 최소화하고, LNG 냉열 혁신으로 수익성을 극대화합니다.",
      "kpis": [
        {"value": "380억원", "label": "PF 조달 요청", "desc": "선순위 · LTV 73%"},
        {"value": "2027.01", "label": "상업운전 목표", "desc": "Phase 1 전기식"},
        {"value": "1,698억", "label": "2031E 매출", "desc": "CAGR ~65%"},
        {"value": "27개사", "label": "LOI 확보", "desc": "월 5,800톤 선확보"}
      ],
      "next_steps": [
        {"num": "1", "title": "실사 (Due Diligence)", "desc": "사업계획서·기술 인증·LOI 검토 및 현장 실사 일정 협의"},
        {"num": "2", "title": "Term Sheet 협의", "desc": "금리·Tranche 구조·담보 조건 협의 및 잠정 Term Sheet 서명"},
        {"num": "3", "title": "PF 약정 체결", "desc": "2026.04 목표 PF 약정 체결 → 2026.05 공사 재개"}
      ]
    },
    "appendix_cover": {
      "title": "첨부 자료 (Appendix)",
      "items": ["A-1 사업자등록증", "A-2 현장사진", "A-3 QSF 기술등급 인증서", "A-4 LNG 냉열 특허 목록", "A-5 감정평가서", "A-6 핵심 인력 프로필", "A-7 LOI 체결 현황", "A-8 2-Phase 전략 로드맵", "A-9 매출액 추세", "A-10 매출액 구성"]
    },
    "appendix_bizreg": {
      "company": "경남큐에스에프 주식회사",
      "reg_no": "102-81-46150",
      "established": "2020.03.31",
      "address": "경기도 용인시 기흥구 흥덕중앙로 120, 905, 906호(영덕동)"
    },
    "appendix_tech": {
      "grade": "TI-2",
      "agency": "KODATA (한국기업데이터)",
      "cert_no": "KED-2022-01-028818",
      "date": "2022년 04월 18일",
      "patents": [
        {"no": "10-2388814", "title": "LNG 냉열 활용 복수 보조냉매 냉각 시스템", "status": "등록"},
        {"no": "10-2399367", "title": "에너지 완전소모형 LNG 융복합 활용 시스템", "status": "등록"},
        {"no": "10-2417218", "title": "탄소중립형 LNG 냉열에너지·수소·CO₂ 시스템", "status": "등록"}
      ]
    },
    "appendix_appraisal": {
      "total": "W52,098,152,000",
      "land": "163억원",
      "building": "358억원",
      "appraiser": "경일감정평가법인",
      "date": "2027.03.31",
      "purpose": "담보 (PF 대출 근거)"
    },
    "appendix_team": {
      "ceo": {
        "name": "양원돈",
        "title": "CEO",
        "careers": ["(현) 바이오코엔㈜, 경남QSF㈜ 대표이사", "유진초저온㈜ 대표이사 (설립 및 운영)", "유진기업㈜ CFO 사장", "㈜하이마트 CFO 사장", "행정고시(22회) 및 공인회계사(11회) 합격"]
      },
      "coo": {
        "name": "김용석",
        "title": "COO",
        "careers": ["현대건설 임원", "평택초저온 초저온설비 부문 운영", "초저온 제품 생산 및 유통 전문가", "초저온·냉동 설비 및 유통 분야 20년 이상 경력"]
      }
    },
    "appendix_loi": {
      "headline": "27개사 LOI 체결 완료 · 월 5,800톤 물량 선확보 · 초기 가동률 92% 달성 목표",
      "kpis": [
        {"value": "27개사", "label": "총 LOI 파트너"},
        {"value": "5,800+톤", "label": "확보 물량 / 월"},
        {"value": "92%", "label": "초기 가동률 목표"}
      ],
      "groups": [
        {"title": "수산 / 산지", "color": "green", "partners": ["강구수협", "남해군수협", "혜영수산", "정일산업"], "desc": "남해안 주요 산지·수협 위판 물량 직매입/위탁"},
        {"title": "수출 / 무역", "color": "purple", "partners": ["글로벌 K-Food 유통사", "H 무역", "S 상사"], "desc": "한국수산무역협회 연계 수출 판로 확대"},
        {"title": "식품 가공", "color": "gold", "partners": ["중견 HMR 제조사 (복수)"], "desc": "HMR/밀키트용 고품질 원료(IQF) 공급 및 OEM"},
        {"title": "유통 / 플랫폼", "color": "blue", "partners": ["백화점", "이마트", "롯데마트", "하나로"], "desc": "대형 이커머스·리테일 채널 납품 확약"}
      ]
    },
    "appendix_phase_detail": {
      "headline": "Fast-Track 상업화(Phase 1) → LNG 에너지 효율화(Phase 2) — 리스크 분산·수익성 극대화",
      "timeline": "2026.04 준비/PF → 2027.01 상업운전 개시 → 2027~2028 운영 최적화 → 2029 LNG 설비 투자 → 2030+ IPO / Global"
    },
    "appendix_revenue_trend": {
      "headline": "5년간 매출 6.5배 성장 — 초저온 제품·가공 양대 축 중심의 지속 성장",
      "data": [
        {"year": "2027", "total": 276, "product": 162, "processing": 59, "fees": 5, "franchise": 40, "export": 10},
        {"year": "2028", "total": 694, "product": 405, "processing": 156, "fees": 25, "franchise": 77, "export": 31},
        {"year": "2029", "total": 1132, "product": 579, "processing": 320, "fees": 69, "franchise": 111, "export": 53},
        {"year": "2030", "total": 1372, "product": 768, "processing": 339, "fees": 85, "franchise": 146, "export": 54},
        {"year": "2031", "total": 1795, "product": 1143, "processing": 347, "fees": 55, "franchise": 195, "export": 55}
      ]
    },
    "appendix_revenue_breakdown": {
      "headline": "5년간 매출 6.5배 성장 달성 — 초저온 제품·가공 양대 축 중심의 지속 성장 구조 확립",
      "table": [
        {"category": "초저온 제품 매출", "y2027": 161.8, "y2028": 405.2, "y2029": 579.1, "y2030": 767.8, "y2031": 1142.9, "change": "+606%"},
        {"category": "수수료 매출", "y2027": 5.1, "y2028": 25.4, "y2029": 68.7, "y2030": 85.4, "y2031": 54.8, "change": "+973%"},
        {"category": "초저온 가공매출", "y2027": 59.1, "y2028": 155.5, "y2029": 320.4, "y2030": 339.3, "y2031": 347.0, "change": "+487%"},
        {"category": "프랜차이즈 매출", "y2027": 40.3, "y2028": 77.1, "y2029": 110.8, "y2030": 145.6, "y2031": 195.4, "change": "+385%"},
        {"category": "무역 매출", "y2027": 10.2, "y2028": 31.2, "y2029": 52.9, "y2030": 53.9, "y2031": 54.9, "change": "+438%"},
        {"category": "합 계", "y2027": 276.5, "y2028": 694.4, "y2029": 1132.0, "y2030": 1392.0, "y2031": 1795.0, "change": "+549%", "bold": true}
      ]
    }
  }
}
```

## 지침 (절대 준수사항)

1. `meta.json`의 실제 데이터로 위 JSON 구조를 채우세요.
2. 첨부파일에서 숫자·수치를 추출할 때:
   - 문서에 명시된 값만 사용 (추론·외부 검색 금지)
   - 문서에 없는 값은 `[TBD]` 로 표기
3. 위 JSON 구조를 정확히 따르세요 (키 이름 변경 금지).
4. `{{workDir}}/slides.json` 으로 저장하세요.
5. 생성 완료 후 반드시 "slides.json 생성 완료" 라고 말하세요.
