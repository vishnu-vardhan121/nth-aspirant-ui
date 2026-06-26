import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuthAlert({ type = 'error', children, action }) {
  const isError = type === 'error';

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg px-4 py-3 text-sm',
        isError
          ? 'bg-red-50 text-red-700 border border-red-100'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="leading-relaxed">{children}</div>
        {action ? (
          <Link
            to={action.to}
            className="mt-2 inline-block font-medium text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
