export default function CategoryTabs({ categories, activeId, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const active = cat.id === activeId;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
