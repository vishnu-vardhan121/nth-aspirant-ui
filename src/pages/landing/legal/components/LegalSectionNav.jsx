import { Card, CardContent } from '@/components/ui/card';

export default function LegalSectionNav({
  sections,
  title = 'On this page',
  description = 'Jump to a specific section.',
}) {
  return (
    <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/95 shadow-lg shadow-slate-200/50">
      <CardContent className="p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-indigo-600">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <nav className="mt-4">
          <ul className="space-y-2.5">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-100 hover:bg-indigo-50/70 hover:text-slate-900"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </CardContent>
    </Card>
  );
}
