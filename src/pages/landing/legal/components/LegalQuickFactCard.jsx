import { createElement } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const VARIANT_STYLES = {
  fact: {
    card: 'border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur-sm',
    content: 'space-y-3 p-5',
    label: 'text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500',
    value: 'text-sm font-semibold leading-relaxed text-slate-900',
    detail: 'text-sm leading-relaxed text-slate-600',
    accent: true,
  },
  principle: {
    card: 'border-slate-200/80 bg-slate-50/80 shadow-sm shadow-slate-900/5',
    content: 'space-y-2 p-4 sm:p-5',
    label: 'text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500',
    value: 'text-sm font-semibold leading-relaxed text-slate-900',
    detail: 'text-xs leading-relaxed text-slate-600',
    accent: false,
  },
};

export default function LegalQuickFactCard({ title, value, detail, icon, variant = 'fact' }) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.fact;

  return (
    <Card className={`overflow-hidden rounded-2xl ${styles.card}`}>
      {styles.accent ? <div className="h-1 w-full bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500" /> : null}
      <CardContent className={styles.content}>
        {icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-indigo-700 ring-1 ring-indigo-100/80">
            {createElement(icon, { className: 'h-4.5 w-4.5', 'aria-hidden': true })}
          </span>
        ) : null}
        <p className={styles.label}>{title}</p>
        <p className={styles.value}>{value}</p>
        {detail ? <p className={styles.detail}>{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
