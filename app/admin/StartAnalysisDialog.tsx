"use client";

import { useRef, useState } from "react";
import { startAnalysis } from "@/lib/actions/admin";

type SectionDef = { id: string; title: string; hint: string };

const SECTIONS: SectionDef[] = [
  { id: "1", title: "§1 산업 분석", hint: "시장규모·CAGR·경쟁구도·규제 (웹검색)" },
  { id: "2", title: "§2 회사 분석", hint: "개요·BM·재무 심층진단·운영" },
  { id: "3", title: "§3 강점", hint: "자산·IP·전략적 위치·거래구조" },
  { id: "4", title: "§4 리스크", hint: "사업·재무·운영·거래구조 + 매트릭스" },
  { id: "5", title: "§5 밸류에이션", hint: "자산가치·DCF·시장배수·가격 가이드라인" },
  { id: "6", title: "§6 실사 체크리스트", hint: "법무·재무·사업·HR·시장·거버넌스" },
  { id: "7", title: "§7 자료요청리스트 (IRL)", hint: "추가 자료 요청 항목" },
  { id: "8", title: "§8 인수 후 100일 PMI", hint: "Day 1-30 / 31-60 / 61-100" },
  { id: "9", title: "§9 최종 의견", hint: "한 줄 결론·가중 점수표·권고" },
];

export default function StartAnalysisDialog({
  reportId,
  reportLabel,
  defaultSections,
}: {
  reportId: string;
  reportLabel: string;
  defaultSections?: string[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initial = new Set(defaultSections && defaultSections.length > 0 ? defaultSections : SECTIONS.map((s) => s.id));
  const [checked, setChecked] = useState<Set<string>>(initial);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setChecked(new Set(SECTIONS.map((s) => s.id)));
  }
  function clearAll() {
    setChecked(new Set());
  }

  function open() {
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="px-2.5 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition"
      >
        → 분석 시작
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-2xl p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl w-full max-w-xl"
      >
        <form action={startAnalysis} className="flex flex-col">
          <input type="hidden" name="id" value={reportId} />

          <header className="px-6 pt-6 pb-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold tracking-widest text-cyan-500 dark:text-cyan-400">START ANALYSIS</p>
            <h2 className="text-xl font-bold mt-1">분석 시작 — 섹션 선택</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{reportLabel}</p>
          </header>

          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              <strong className="text-cyan-600 dark:text-cyan-400">§0 Executive Summary</strong> 는 다른 섹션을 요약하므로 항상 포함됩니다.
              아래에서 §1~§9 중 작성할 섹션을 고르세요.
            </p>

            <div className="flex gap-2 mb-3">
              <button type="button" onClick={selectAll}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 transition">
                전체 선택
              </button>
              <button type="button" onClick={clearAll}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs hover:border-rose-500/60 hover:text-rose-600 dark:hover:text-rose-400 transition">
                전체 해제
              </button>
              <span className="ml-auto text-xs text-slate-500 self-center tabular-nums">
                선택 {checked.size} / {SECTIONS.length}
              </span>
            </div>

            <ul className="space-y-1.5">
              {SECTIONS.map((s) => {
                const on = checked.has(s.id);
                return (
                  <li key={s.id}>
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        on
                          ? "border-cyan-500/60 bg-cyan-50/60 dark:bg-cyan-500/10"
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="sections"
                        value={s.id}
                        checked={on}
                        onChange={() => toggle(s.id)}
                        className="mt-0.5 h-4 w-4 accent-cyan-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{s.title}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.hint}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end bg-slate-50 dark:bg-slate-900/40 rounded-b-2xl">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700/40 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={checked.size === 0}
              className="px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              분석 시작 ({checked.size}개 섹션)
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
