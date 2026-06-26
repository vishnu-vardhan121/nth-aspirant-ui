import { HiCheckCircle } from 'react-icons/hi2';

export default function PlanOptionCard({ product, priceLabel, onSelect, disabled = false, disabledReason, isCurrent = false }) {
  const bullets = product.features ?? [];

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-5 text-left transition-all sm:p-6 ${
        product.popular
          ? 'border-indigo-200 bg-linear-to-br from-indigo-50/90 via-white to-violet-50/40 shadow-md shadow-indigo-100/50 ring-1 ring-indigo-100'
          : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md'
      }`}
    >      {product.popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          Best value
        </span>
      ) : null}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {product.durationLabel} access
        </p>
        <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{priceLabel}</p>
      </div>

      <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">
        {bullets.map((item) => (
          <li key={`${product.planId}-${item}`} className="flex gap-2">
            <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(product)}
        className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 ${
          product.popular
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'border border-slate-200 bg-white text-slate-900 hover:border-indigo-200 hover:bg-indigo-50/50'
        }`}
      >
        {isCurrent ? 'Current plan' : disabled && disabledReason ? disabledReason : `Choose ${product.name}`}
      </button>
    </article>
  );
}
