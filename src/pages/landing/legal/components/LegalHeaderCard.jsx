import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LegalQuickFactCard from './LegalQuickFactCard';

export default function LegalHeaderCard({
  breadcrumbs,
  eyebrow,
  eyebrowIcon,
  title,
  description,
  facts = [],
  principles = [],
  principlesTitle = 'Key principles',
  principlesDescription = 'Quick expectations for anyone using Naveen Talent Hub.',
}) {
  return (
    <header className="overflow-hidden rounded-4xl border border-indigo-100/80 bg-white/85 shadow-xl shadow-indigo-950/5 ring-1 ring-white/70 backdrop-blur-sm">
      <div className="h-1 w-full bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500" />
      <div className="p-6 sm:p-8 md:p-10 lg:p-12">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
          {breadcrumbs.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.to ? (
                <Link
                  to={item.to}
                  className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm ring-1 ring-slate-200/90 transition-colors hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-700">{item.label}</span>
              )}
              {index < breadcrumbs.length - 1 ? <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden /> : null}
            </div>
          ))}
        </div>

        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-indigo-100">
          {eyebrowIcon ? createElement(eyebrowIcon, { className: 'h-3.5 w-3.5', 'aria-hidden': true }) : null}
          {eyebrow}
        </p>

        <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[3.25rem] lg:leading-[1.05]">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p>

        {facts.length ? (
          <div className={`mt-8 grid gap-4 ${facts.length >= 3 ? 'lg:grid-cols-3' : facts.length === 2 ? 'sm:grid-cols-2' : ''}`}>
            {facts.map((fact) => (
              <LegalQuickFactCard key={`${fact.title}-${fact.value}`} {...fact} />
            ))}
          </div>
        ) : null}

        {principles.length ? (
          <div className="mt-6 rounded-3xl border border-slate-200/80 bg-linear-to-r from-slate-50 via-white to-indigo-50/60 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">{principlesTitle}</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Platform expectations at a glance</h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">{principlesDescription}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {principles.map((principle) => (
                <LegalQuickFactCard key={`${principle.title}-${principle.value}`} {...principle} variant="principle" />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
