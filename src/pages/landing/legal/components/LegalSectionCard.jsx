import { createElement } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function LegalSectionCard({ section, variant = 'privacy' }) {
  const isTerms = variant === 'terms';
  const cardClassName = isTerms
    ? 'relative overflow-hidden rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-lg shadow-slate-200/45'
    : 'overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/40';
  const contentClassName = isTerms ? 'p-5 sm:p-6 md:p-8' : 'p-6 sm:p-8 md:p-10';
  const blockGridClassName = section.blockGridClass ?? (isTerms ? 'lg:grid-cols-2' : 'md:grid-cols-3');
  const blockClassName = isTerms
    ? 'rounded-xl border border-slate-200/90 bg-slate-50/85 p-4 shadow-sm shadow-slate-900/5'
    : 'rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm shadow-slate-900/5';
  const summaryClassName = isTerms
    ? 'mt-5 rounded-2xl border border-indigo-100/80 bg-linear-to-r from-indigo-50/70 via-white to-sky-50/50 p-4 sm:p-5'
    : 'mt-6 rounded-2xl border border-indigo-100/80 bg-linear-to-r from-indigo-50/80 via-white to-sky-50/60 p-5';
  const summaryGridClassName = section.summaryGridClass ?? 'md:grid-cols-2';
  const summaryTitle = section.summaryTitle ?? (isTerms ? 'Key points' : 'In practice');

  return (
    <Card id={section.id} className={`scroll-mt-28 ${cardClassName}`}>
      {isTerms ? (
        <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-indigo-600 via-violet-600 to-sky-500" aria-hidden />
      ) : (
        <div className="h-1 w-full bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500" aria-hidden />
      )}

      <CardContent className={contentClassName}>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-indigo-100">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />
              {section.eyebrow}
            </p>
            <h2 className={`font-bold tracking-tight text-slate-900 ${isTerms ? 'text-xl sm:text-[1.7rem]' : 'text-2xl sm:text-[2rem]'}`}>
              {section.title}
            </h2>
            <p className={`mt-3 max-w-3xl leading-relaxed text-slate-600 ${isTerms ? 'text-[0.98rem]' : 'text-base sm:text-[1.0625rem]'}`}>
              {section.intro}
            </p>
          </div>

          <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-50 to-violet-50 text-indigo-700 ring-1 ring-indigo-100/80 ${isTerms ? 'h-11 w-11' : 'h-12 w-12'}`}>
            {createElement(section.icon, { className: isTerms ? 'h-5 w-5' : 'h-5 w-5', 'aria-hidden': true })}
          </span>
        </div>

        <div className={`grid gap-3 sm:gap-4 ${blockGridClassName}`}>
          {section.blocks.map((block) => (
            <div key={block.heading} className={blockClassName}>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-900">{block.heading}</h3>
              <p className={`mt-3 leading-relaxed text-slate-600 ${isTerms ? 'text-sm' : 'text-sm'}`}>{block.body}</p>
            </div>
          ))}
        </div>

        {section.bullets?.length ? (
          <div className={summaryClassName}>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-900">{summaryTitle}</h3>
            <ul className={`mt-4 grid gap-3 ${summaryGridClassName}`}>
              {section.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
