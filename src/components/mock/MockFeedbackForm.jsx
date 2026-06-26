import { useState } from 'react';
import { ButtonLoader } from '../ui/Loader';
import {
  MOCK_FEEDBACK_AREA_DEFS,
  createEmptyMockFeedbackForm,
  validateMockFeedbackForm,
} from '../../lib/mockFeedback';

export { createEmptyMockFeedbackForm };

export default function MockFeedbackForm({
  value,
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = 'Submit feedback',
  cancelLabel = 'Cancel',
  onCancel,
  formId,
  showActions = true,
  onValidationError,
}) {
  const form = value ?? createEmptyMockFeedbackForm();
  const [localError, setLocalError] = useState('');

  const setForm = (patch) => onChange({ ...form, ...patch });

  const setArea = (key, patch) => {
    onChange({
      ...form,
      areas: {
        ...form.areas,
        [key]: { ...form.areas[key], ...patch },
      },
    });
  };

  const reportError = (msg) => {
    setLocalError(msg);
    onValidationError?.(msg);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateMockFeedbackForm(form);
    if (err) {
      reportError(err);
      return;
    }
    setLocalError('');
    onValidationError?.('');
    onSubmit?.(form);
  };

  const enabledCount = MOCK_FEEDBACK_AREA_DEFS.filter((d) => form.areas[d.key]?.enabled).length;

  return (
    <form id={formId} onSubmit={handleSubmit} className="min-w-0 space-y-5 overflow-x-hidden">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-900">Overall</h3>
        <p className="mt-1 text-sm text-slate-500">General performance and communication.</p>

        <div className="mt-4 space-y-5">
          <ScoreSlider
            label="Overall performance"
            value={form.overall_score}
            onChange={(v) => setForm({ overall_score: v })}
          />
          <ScoreSlider
            label="Communication"
            value={form.communication_score}
            onChange={(v) => setForm({ communication_score: v })}
          />
        </div>

        <label className="mt-5 block min-w-0">
          <span className="text-sm font-medium text-slate-700">
            Overall feedback <span className="text-red-500">*</span>
          </span>
          <textarea
            value={form.feedback_notes}
            onChange={(e) => setForm({ feedback_notes: e.target.value })}
            rows={3}
            required
            minLength={10}
            placeholder="Required — summary, strengths, what to improve (min. 10 characters)…"
            className="mt-1.5 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Technical areas</h3>
            <p className="mt-1 text-sm text-slate-500">Turn on only what you covered in this mock.</p>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {enabledCount} on
          </span>
        </div>

        <ul className="mt-4 min-w-0 divide-y divide-slate-100">
          {MOCK_FEEDBACK_AREA_DEFS.map((def) => (
            <TechAreaRow
              key={def.key}
              def={def}
              area={form.areas[def.key]}
              onPatch={(patch) => setArea(def.key, patch)}
            />
          ))}
        </ul>
      </section>

      {showActions && localError ? (
        <p className="text-sm text-red-600" role="alert">
          {localError}
        </p>
      ) : null}

      {showActions ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? <ButtonLoader className="inline h-4 w-4 text-white" /> : submitLabel}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function TechAreaRow({ def, area, onPatch }) {
  const on = area.enabled;

  return (
    <li className="min-w-0 py-3 first:pt-0 last:pb-0">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{def.label}</span>
        {on ? (
          <span className="shrink-0 text-sm font-bold tabular-nums text-indigo-600">{area.score}/10</span>
        ) : null}
      </label>

      {on ? (
        <div className="mt-3 min-w-0 space-y-3 pl-7">
          {def.isCustom ? (
            <input
              type="text"
              value={area.label}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder="Topic name (e.g. System design)"
              maxLength={80}
              className="w-full max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          ) : null}
          <ScoreSlider
            label="Score"
            value={area.score}
            onChange={(v) => onPatch({ score: v })}
            compact
          />
          <textarea
            value={area.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            rows={2}
            required
            minLength={10}
            placeholder="Required — what went well, what to revise (min. 10 characters)…"
            className="w-full max-w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      ) : null}
    </li>
  );
}

function ScoreSlider({ label, value, onChange, compact = false }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`truncate font-medium text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>
          {label}
        </span>
        <span
          className={`shrink-0 rounded-lg bg-indigo-600 px-2.5 py-0.5 font-bold tabular-nums text-white ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pct': `${value * 10}%` }}
        className="mock-score-slider w-full max-w-full"
        aria-label={`${label} score`}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
      />
      <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
        <span>0</span>
        <span>10</span>
      </div>
    </div>
  );
}
