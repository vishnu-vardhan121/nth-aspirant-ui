import { HiCheckCircle } from 'react-icons/hi2';

export default function PlanOptionCard({
  product,
  priceLabel,
  selected = false,
  onSelect,
  disabled = false,
}) {
  const bullets = product.features ?? [];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(product)}
      aria-pressed={selected}
      className={`relative flex w-full flex-col rounded-2xl border p-4 text-left transition-all sm:p-5 disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? 'border-indigo-500 bg-linear-to-br from-indigo-50/90 via-white to-violet-50/50 shadow-md ring-2 ring-indigo-500/80'
          : product.popular
            ? 'border-indigo-200 bg-linear-to-br from-indigo-50/60 via-white to-violet-50/30 shadow-sm hover:border-indigo-300 hover:shadow-md'
            : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {selected ? (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
          <HiCheckCircle className="h-4 w-4" aria-hidden />
        </span>
      ) : null}

      {product.popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          Best value
        </span>
      ) : null}

      <div className="mb-3 pr-6">
        <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {product.durationLabel} access
        </p>
        <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{priceLabel}</p>
      </div>

      <ul className="flex-1 space-y-2 text-sm text-slate-600">
        {bullets.map((item) => (
          <li key={`${product.planId}-${item}`} className="flex gap-2">
            <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
