export default function ProfileSection({ icon: Icon, title, children }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        {Icon ? <Icon className="h-4 w-4 text-indigo-600" /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}
