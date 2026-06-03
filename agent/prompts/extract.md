# Phase 1 — PDF 완전 추출 (Extract)

당신은 투자심사 데이터 추출 전문가입니다.
**추론·추정 절대 금지. 문서에 명시된 사실만 추출합니다.**

## 작업 정보
- 회사명: {{company}}
- 작업 디렉토리: {{workDir}}

## 지시사항

### Step 1 — 메타데이터 로드
`{{workDir}}/meta.json`을 읽어 폼 입력값을 파악하세요.
이 값들은 사용자가 직접 입력한 확정값입니다.

### Step 2 — 첨부파일 완전 정독
`{{workDir}}/attachments/` 폴더의 **모든 파일**을 읽으세요.
- PDF: 전체 페이지 읽기 (표, 각주, 주석 포함)
- Excel/XLSX: 모든 시트의 수치 데이터
- 파일 없으면 meta.json만으로 진행

### Step 3 — extraction.json 생성
`{{workDir}}/extraction.json`을 아래 스키마로 작성하세요.

**규칙:**
- `source`: 반드시 명기 — "meta.json", "사업계획서.pdf p.12", "재무제표.xlsx Sheet1" 등
- `confidence`: "HIGH"(문서 명시) / "MED"(계산 도출) / "LOW"(추정 불가피)
- `tbd_reason`: confidence=LOW 이거나 값이 없을 때 이유 설명
- **수치는 단위 포함 문자열로**: "400억원", "67%", "50개월"
- **없는 값은 null — 절대 추측하지 않음**

```json
{
  "extracted_at": "{{today}}",
  "company": "{{company}}",
  "source_files": [],

  "deal_terms": {
    "funding_amount":   {"value": null, "source": "", "confidence": "HIGH"},
    "total_cost":       {"value": null, "source": "", "confidence": "HIGH"},
    "interest_rate":    {"value": null, "source": "", "confidence": "HIGH"},
    "tenor_months":     {"value": null, "source": "", "confidence": "HIGH"},
    "ltv":              {"value": null, "source": "", "confidence": "HIGH"},
    "funding_type":     {"value": null, "source": "", "confidence": "HIGH"},
    "use_of_proceeds":  [{"item": "", "amount": "", "pct": "", "source": ""}]
  },

  "company_info": {
    "legal_name":       {"value": null, "source": "", "confidence": "HIGH"},
    "reg_no":           {"value": null, "source": "", "confidence": "HIGH"},
    "ceo_name":         {"value": null, "source": "", "confidence": "HIGH"},
    "established":      {"value": null, "source": "", "confidence": "HIGH"},
    "address":          {"value": null, "source": "", "confidence": "HIGH"},
    "business_desc":    {"value": null, "source": "", "confidence": "HIGH"},
    "tagline":          {"value": null, "source": "", "confidence": "MED"}
  },

  "market": {
    "market_name":      {"value": null, "source": "", "confidence": "HIGH"},
    "market_size":      {"value": null, "source": "", "confidence": "HIGH"},
    "cagr":             {"value": null, "source": "", "confidence": "HIGH"},
    "target_segment":   {"value": null, "source": "", "confidence": "HIGH"},
    "pain_points":      [{"desc": "", "source": ""}]
  },

  "competitive_advantage": [
    {"title": "", "metric": "", "desc": "", "source": ""}
  ],

  "business_model": {
    "value_chain":      [{"step": "", "source": ""}],
    "revenue_streams":  [{"name": "", "pct": "", "desc": "", "source": ""}]
  },

  "financials": {
    "revenue_forecast": [
      {"year": "2027", "value": null, "source": "", "confidence": "MED"},
      {"year": "2028", "value": null, "source": "", "confidence": "MED"},
      {"year": "2029", "value": null, "source": "", "confidence": "MED"},
      {"year": "2030", "value": null, "source": "", "confidence": "MED"},
      {"year": "2031", "value": null, "source": "", "confidence": "MED"}
    ],
    "revenue_cagr":     {"value": null, "source": "", "confidence": "MED"},
    "ebitda_margin":    {"value": null, "source": "", "confidence": "MED"},
    "breakeven_year":   {"value": null, "source": "", "confidence": "MED"}
  },

  "capex": {
    "phase1": {
      "amount": {"value": null, "source": "", "confidence": "HIGH"},
      "equipment": {"value": null, "source": "", "confidence": "HIGH"},
      "completion": {"value": null, "source": "", "confidence": "HIGH"},
      "target_revenue": {"value": null, "source": "", "confidence": "MED"}
    },
    "phase2": {
      "amount": {"value": null, "source": "", "confidence": "MED"},
      "equipment": {"value": null, "source": "", "confidence": "MED"},
      "completion": {"value": null, "source": "", "confidence": "MED"},
      "target_revenue": {"value": null, "source": "", "confidence": "LOW"}
    }
  },

  "risks": [
    {"category": "", "desc": "", "mitigation": "", "severity": "Monitor", "source": ""}
  ],

  "roadmap": [
    {"phase": "", "period": "", "milestones": [], "source": ""}
  ],

  "team": {
    "ceo": {"name": "", "careers": [], "source": ""},
    "coo": {"name": "", "careers": [], "source": ""}
  },

  "appendix": {
    "tech_grade":       {"value": null, "source": ""},
    "patents":          [{"status": "", "no": "", "title": "", "source": ""}],
    "appraisal":        {"total": null, "land": null, "building": null, "appraiser": null, "date": null, "source": ""},
    "loi_partners":     [{"name": "", "status": "", "source": ""}]
  },

  "tbd_list": [
    {"field": "", "reason": "", "suggested_action": ""}
  ],

  "extraction_summary": ""
}
```

### Step 4 — 완료 확인
파일 저장 후 반드시 이 문장으로 마치세요:
"✅ extraction.json 생성 완료 — 확인값 N개, TBD M개"
