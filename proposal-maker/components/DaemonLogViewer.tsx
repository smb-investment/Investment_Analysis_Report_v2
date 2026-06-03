"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface LogEntry {
  id: number;
  phase: string | null;
  message: string;
  ts: string;
}

interface Props {
  proposalId: string;
  companyName: string;
}

export function DaemonLogViewer({ proposalId, companyName }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // 초기 로그 로드 (최근 50개)
    supabase
      .from("proposal_logs")
      .select("id,phase,message,ts")
      .eq("proposal_id", proposalId)
      .order("ts", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setLogs(data.reverse());
      });

    // Realtime 구독
    const channel = supabase
      .channel(`proposal-logs-${proposalId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "proposal_logs",
          filter: `proposal_id=eq.${proposalId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as LogEntry].slice(-200));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [proposalId]);

  // 새 로그 추가 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const phaseColor: Record<string, string> = {
    P1: "text-blue-400",
    P2: "text-cyan-400",
    P3: "text-yellow-400",
    P4: "text-orange-400",
    P5: "text-purple-400",
  };

  return (
    <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm font-mono text-gray-300">생성 로그</span>
        <span className="text-xs text-gray-500 ml-1">· {companyName}</span>
        <span className="ml-auto text-xs text-gray-600 font-mono">{proposalId.slice(0, 8)}</span>
      </div>
      <div className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {logs.length === 0 ? (
          <p className="text-gray-600 italic">대기 중...</p>
        ) : (
          logs.map((entry) => {
            const timeStr = new Date(entry.ts).toLocaleTimeString("ko-KR", {
              hour: "2-digit", minute: "2-digit", second: "2-digit",
            });
            const phaseKey = entry.phase?.match(/P\d/)?.[0] ?? "";
            const color = phaseColor[phaseKey] ?? "text-gray-300";
            return (
              <div key={entry.id} className="flex gap-2 leading-relaxed">
                <span className="text-gray-600 shrink-0">{timeStr}</span>
                {entry.phase && (
                  <span className={`shrink-0 font-semibold ${color}`}>[{entry.phase}]</span>
                )}
                <span className="text-gray-300 break-all">{entry.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
