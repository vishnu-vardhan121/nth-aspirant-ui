export default function EvaluatingOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 p-4 backdrop-blur-sm">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-lg">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-lg font-semibold text-slate-900">Evaluating your session…</p>
        <p className="mt-1 text-sm text-slate-600">Scoring topic areas against this level&apos;s rubric.</p>
      </div>
    </div>
  );
}
