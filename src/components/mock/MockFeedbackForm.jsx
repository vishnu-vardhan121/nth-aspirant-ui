import { useState } from 'react';
import { HiLightBulb, HiTag, HiChatBubbleLeftRight, HiBriefcase, HiXMark, HiUserGroup } from 'react-icons/hi2';
import { ButtonLoader } from '../ui/Loader';
import {
  MOCK_TOPIC_MAX,
  MOCK_RATING_OPTIONS,
  PLACEMENT_RECOMMENDATION_OPTIONS,
  createEmptyMockFeedbackForm,
  toggleTopicInForm,
  toggleRoleFitInForm,
  addCustomTopicToForm,
  validateMockFeedbackForm,
} from '../../lib/mockFeedback';
import { getMockTopicsForPicker, MOCK_ROLE_FIT_CATEGORIES } from '../../lib/mockFeedbackTopics';

export { createEmptyMockFeedbackForm };

const MIN_OVERALL = 30;
const MIN_TOPIC = 20;

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
  layout = 'default',
}) {
  const form = value ?? createEmptyMockFeedbackForm();
  const isModal = layout === 'modal';
  const [localError, setLocalError] = useState('');

  const setForm = (patch) => onChange({ ...form, ...patch });

  const setTopic = (key, patch) => {
    onChange({
      ...form,
      topics: {
        ...form.topics,
        [key]: { ...form.topics[key], ...patch },
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

  const selectedKeys = form.selectedKeys ?? [];
  const overallLen = form.feedback_notes?.trim().length ?? 0;

  return (
    <form id={formId} onSubmit={handleSubmit} className="min-w-0 space-y-6 overflow-x-hidden">
      <FormSection
        step={1}
        title="Topics you covered"
        hint={`Tap topics you assessed (up to ${MOCK_TOPIC_MAX}).`}
        icon={HiTag}
        isModal={isModal}
        badge={`${selectedKeys.length}/${MOCK_TOPIC_MAX} selected`}
      >
        <TopicPicker form={form} onChange={onChange} onError={reportError} />
      </FormSection>

      {selectedKeys.length > 0 ? (
        <FormSection
          step={2}
          title="Feedback per topic"
          hint="Required for each selected topic — rating, score, and feedback. Per-topic suggestions are optional."
          icon={HiLightBulb}
          isModal={isModal}
        >
          <div className={`mt-4 ${isModal ? 'grid gap-5 xl:grid-cols-2' : 'space-y-4'}`}>
            {selectedKeys.map((key, index) => {
              const row = form.topics[key];
              if (!row) return null;
              return (
                <TopicCard
                  key={key}
                  index={index + 1}
                  title={row.label || key}
                  row={row}
                  isModal={isModal}
                  onPatch={(patch) => setTopic(key, patch)}
                  onRemove={() => onChange(toggleTopicInForm(form, key, row))}
                />
              );
            })}
          </div>
        </FormSection>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-amber-900">Select at least one topic above</p>
          <p className="mt-1 text-sm text-amber-800/90">
            Then add scores and feedback for each area (suggestions optional) — overall assessment comes last.
          </p>
        </div>
      )}

      <FormSection
        step={3}
        title="Overall assessment"
        hint="Final scores and summary after topic feedback."
        icon={HiChatBubbleLeftRight}
        isModal={isModal}
      >
        <div className={`mt-4 gap-6 ${isModal ? 'grid sm:grid-cols-2' : 'space-y-5'}`}>
          <ScoreSlider label="Overall performance" value={form.overall_score} onChange={(v) => setForm({ overall_score: v })} />
          <ScoreSlider label="Communication" value={form.communication_score} onChange={(v) => setForm({ communication_score: v })} />
        </div>

        <label className="mt-4 block min-w-0">
          <span className="text-sm font-semibold text-slate-800">
            Communication note <span className="font-normal text-violet-600">(admin only)</span>
          </span>
          <p className="mt-0.5 text-xs text-slate-500">
            Internal reference for admins — clarity, accent, confidence, etc. Not shared with the aspirant.
          </p>
          <textarea
            value={form.communication_admin_note}
            onChange={(e) => setForm({ communication_admin_note: e.target.value })}
            rows={2}
            placeholder="e.g. Clear explanations but needs more confidence; fine for service companies, polish for product…"
            className="mt-2 w-full max-w-full resize-y rounded-xl border border-violet-200 bg-violet-50/30 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="mt-6 block min-w-0">
          <span className="text-sm font-semibold text-slate-800">
            Overall summary <span className="text-red-500">*</span>
          </span>
          <p className="mt-0.5 text-xs text-slate-500">How the interview went — strengths, gaps, readiness.</p>
          <textarea
            value={form.feedback_notes}
            onChange={(e) => setForm({ feedback_notes: e.target.value })}
            rows={isModal ? 4 : 3}
            placeholder="Example: Strong on basics and communication. Needs more depth on system design and hands-on examples before real interviews."
            className="mt-2 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <CharHint current={overallLen} min={MIN_OVERALL} />
        </label>

        <label className="mt-4 block min-w-0">
          <span className="text-sm font-semibold text-slate-800">
            Overall suggestions <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <textarea
            value={form.overall_suggestions}
            onChange={(e) => setForm({ overall_suggestions: e.target.value })}
            rows={2}
            placeholder="General advice beyond specific topics — e.g. book another mock in 2 weeks."
            className="mt-2 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </FormSection>

      <FormSection
        step={4}
        title="Moving to placements?"
        hint="If you select Yes, the aspirant will see they are placement-ready. Notes are admin-only."
        icon={HiUserGroup}
        isModal={isModal}
        badge={
          form.placement_recommendation
            ? PLACEMENT_RECOMMENDATION_OPTIONS.find((o) => o.value === form.placement_recommendation)?.shortLabel ?? 'Selected'
            : 'Pick one'
        }
      >
        <PlacementRecommendationPicker form={form} onChange={onChange} />
      </FormSection>

      <FormSection
        step={5}
        title="Role fit (internal)"
        hint="Optional — which roles/stacks this candidate is ready for. Used by admins to filter users; not shared with the aspirant."
        icon={HiBriefcase}
        isModal={isModal}
        badge={
          (form.role_fit_keys?.length ?? 0) > 0
            ? `${form.role_fit_keys.length} selected`
            : 'Optional'
        }
      >
        <RoleFitPicker form={form} onChange={onChange} />
      </FormSection>

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

function TopicPicker({ form, onChange, onError }) {
  const [customLabel, setCustomLabel] = useState('');
  const selectedKeys = form.selectedKeys ?? [];
  const atMax = selectedKeys.length >= MOCK_TOPIC_MAX;

  const catalogTopics = getMockTopicsForPicker();
  const catalogKeys = new Set(catalogTopics.map((t) => t.key));
  const customSelected = selectedKeys
    .filter((key) => !catalogKeys.has(key))
    .map((key) => ({ key, label: form.topics[key]?.label || key, category: form.topics[key]?.category }));

  const toggleTopic = (topic, categoryId) => {
    onChange(
      toggleTopicInForm(form, topic.key, {
        label: topic.label,
        category: categoryId ?? topic.category,
        isCustom: topic.isCustom,
      }),
    );
    onError('');
  };

  const handleAddCustom = () => {
    const { form: next, error } = addCustomTopicToForm(form, customLabel);
    if (error) {
      onError(error);
      return;
    }
    onChange(next);
    setCustomLabel('');
    onError('');
  };

  const chipClass = (on) =>
    [
      'inline-flex shrink-0 items-center rounded border px-1.5 py-px',
      'text-[10px] font-medium leading-tight whitespace-nowrap',
      'transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      on
        ? 'border-indigo-600 bg-indigo-600 text-white'
        : 'border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/80',
    ].join(' ');

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {catalogTopics.map((topic) => {
          const on = selectedKeys.includes(topic.key);
          return (
            <button
              key={topic.key}
              type="button"
              onClick={() => toggleTopic(topic, topic.category)}
              disabled={!on && atMax}
              className={chipClass(on)}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2">
        <p className="text-[11px] font-semibold text-slate-700">Other topic</p>
        <p className="text-[10px] text-slate-500">Not in the list above — type and add</p>

        {customSelected.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {customSelected.map((topic) => (
              <button
                key={topic.key}
                type="button"
                onClick={() => toggleTopic({ ...topic, isCustom: true }, topic.category)}
                className={`${chipClass(true)} gap-0.5 pl-1.5 pr-1`}
              >
                {topic.label}
                <HiXMark className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex min-w-0 items-stretch gap-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="e.g. Kubernetes, Power BI"
            maxLength={60}
            disabled={atMax}
            aria-label="Custom topic name"
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customLabel.trim() || atMax}
            className="shrink-0 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {atMax ? (
          <p className="mt-1.5 text-[10px] text-amber-700">Maximum {MOCK_TOPIC_MAX} topics — remove one to add another.</p>
        ) : null}
      </div>
    </div>
  );
}

function PlacementRecommendationPicker({ form, onChange }) {
  const selected = form.placement_recommendation ?? '';

  return (
    <div className="mt-3 space-y-3">
      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
        role="group"
        aria-label="Moving to placements"
      >
        {PLACEMENT_RECOMMENDATION_OPTIONS.map((opt) => {
          const on = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...form, placement_recommendation: opt.value })}
              className={[
                'flex min-h-[52px] flex-1 flex-col items-center justify-center rounded-xl border px-4 py-3 text-center shadow-sm transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                on
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/60 active:bg-indigo-50',
              ].join(' ')}
            >
              <span className="text-sm font-bold">{opt.shortLabel}</span>
              <span className={`mt-0.5 text-[11px] font-medium leading-tight ${on ? 'text-indigo-100' : 'text-slate-500'}`}>
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
      <label className="block min-w-0">
        <span className="text-sm font-semibold text-slate-800">
          Placement note <span className="font-normal text-violet-600">(admin only)</span>
        </span>
        <p className="mt-0.5 text-xs text-slate-500">
          Context for admins — company types, blockers, or what is still needed before placement.
        </p>
        <textarea
          value={form.placement_recommendation_note}
          onChange={(e) => onChange({ ...form, placement_recommendation_note: e.target.value })}
          rows={2}
          placeholder="e.g. Ready for mid-tier product companies after one more system design mock…"
          className="mt-2 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>
    </div>
  );
}

function RoleFitPicker({ form, onChange }) {
  const selected = form.role_fit_keys ?? [];

  const chipClass = (on) =>
    [
      'inline-flex shrink-0 items-center rounded border px-2 py-0.5',
      'text-[11px] font-medium leading-tight whitespace-nowrap',
      'transition-colors',
      on
        ? 'border-violet-600 bg-violet-600 text-white'
        : 'border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-violet-300 hover:bg-violet-50/80',
    ].join(' ');

  return (
    <div className="mt-3 space-y-3">
      {MOCK_ROLE_FIT_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <p className="text-[11px] font-semibold text-slate-600">{cat.label}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {cat.options.map((opt) => {
              const on = selected.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onChange(toggleRoleFitInForm(form, opt.key))}
                  className={chipClass(on)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Optional — internal hiring filters only; not shown to aspirants.</p>
    </div>
  );
}

function FormSection({ step, title, hint, icon: Icon, badge, isModal, children }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm ${
        isModal ? 'p-5 sm:p-6' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              {Icon ? <Icon className="h-5 w-5 text-indigo-600" aria-hidden /> : null}
              {title}
            </h3>
            {badge ? (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{badge}</span>
            ) : null}
          </div>
          {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function CharHint({ current, min }) {
  const ok = current >= min;
  return (
    <p className={`mt-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
      {current}/{min} characters minimum {ok ? '✓' : ''}
    </p>
  );
}

function TopicCard({ index, title, row, onPatch, onRemove, isModal }) {
  const feedbackLen = row.feedback?.trim().length ?? 0;
  const suggestionsLen = row.suggestions?.trim().length ?? 0;

  return (
    <article className="flex h-full flex-col rounded-2xl border-2 border-indigo-100 bg-linear-to-b from-white to-indigo-50/30 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-indigo-100 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Topic {index}</p>
          <h4 className="text-base font-bold text-slate-900">{title}</h4>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <ScoreSlider label="Score (0–10)" value={row.score} onChange={(v) => onPatch({ score: v })} variant="buttons" compact />

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Rating</p>
          <div className="flex flex-wrap gap-2">
            {MOCK_RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPatch({ rating: opt.value })}
                className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all ${
                  row.rating === opt.value ? opt.className : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800">
            Feedback <span className="text-red-500">*</span>
          </span>
          <p className="mt-0.5 text-xs text-slate-500">What they did well or missed during questions on this topic.</p>
          <textarea
            value={row.feedback}
            onChange={(e) => onPatch({ feedback: e.target.value })}
            rows={isModal ? 3 : 2}
            placeholder="What they answered well or missed…"
            className="mt-2 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <CharHint current={feedbackLen} min={MIN_TOPIC} />
        </label>

        <label className="block min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800">
            Suggestions for aspirant <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <p className="mt-0.5 text-xs text-slate-500">Actionable next steps — what to study, practice, or revise.</p>
          <textarea
            value={row.suggestions}
            onChange={(e) => onPatch({ suggestions: e.target.value })}
            rows={isModal ? 3 : 2}
            placeholder="What they should study, practice, or revise…"
            className="mt-2 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {suggestionsLen > 0 ? <CharHint current={suggestionsLen} min={MIN_TOPIC} /> : null}
        </label>
      </div>
    </article>
  );
}

function ScoreSlider({ label, value, onChange, compact = false, variant = 'slider' }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`truncate font-semibold text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>
        <span
          className={`shrink-0 rounded-lg bg-indigo-600 px-3 py-1 font-bold tabular-nums text-white ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {value}/10
        </span>
      </div>

      {variant === 'buttons' ? (
        <div className="grid grid-cols-11 gap-0.5" role="group" aria-label={`${label} quick pick`}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                compact ? 'py-1.5' : 'py-2'
              } ${
                value === n
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-800'
              }`}
              aria-label={`Score ${n}`}
              aria-pressed={value === n}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <>
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
            <span>Weak</span>
            <span>Strong</span>
          </div>
        </>
      )}
    </div>
  );
}
