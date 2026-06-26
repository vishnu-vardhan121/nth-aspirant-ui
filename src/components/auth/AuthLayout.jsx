import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle, footer }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <img src="/dark-logo.png" alt="Naveen Talent Hub" className="mx-auto h-10 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>

        {children}

        {footer ? (
          <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">{footer}</p>
        ) : null}
      </div>

      <Link to="/" className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        &larr; Back to home
      </Link>
    </div>
  );
}
