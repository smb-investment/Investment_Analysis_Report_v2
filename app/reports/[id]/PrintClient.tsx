"use client";

export default function PrintClient() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm"
    >
      인쇄
    </button>
  );
}
