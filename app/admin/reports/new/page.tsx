import Link from "next/link";
import IntakeUploader from "./IntakeUploader";

export default function NewIntakePage() {
  return (
    <section className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">← 어드민</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-2">자료수집 업로드</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        분석 대상 PDF(예: DART 분기보고서)를 업로드합니다. 각 파일 ≤ 20MB. 업로드 후 보고서가 <code>status=intake</code>로 생성됩니다.
        2단계 분석 도구가 이 자료를 읽어 본문(HTML/MD/PDF)을 만들고 <code>draft</code>로 올립니다.
      </p>
      <IntakeUploader />
    </section>
  );
}
