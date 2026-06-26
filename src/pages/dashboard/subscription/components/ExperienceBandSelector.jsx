import {
  EXPERIENCED_BAND_OPTIONS,
  getTrackFromBand,
} from '../data/subscriptionProducts';

const trackToggleClass =
  'text-center py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 peer-checked:text-slate-900 peer-checked:bg-white peer-checked:shadow-[0_2px_8px_rgba(0,0,0,0.06)] peer-checked:ring-1 peer-checked:ring-slate-200/50 transition-all duration-200';

const bandPillClass =
  'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

export default function ExperienceBandSelector({ value, onChange }) {
  const track = getTrackFromBand(value);

  const handleTrackChange = (nextTrack) => {
    if (nextTrack === 'fresher') {
      onChange('fresher');
      return;
    }
    onChange(track === 'experienced' ? value : 'y1_2');
  };

  return (
    <div className="mb-4 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
      <p className="text-sm font-medium text-slate-800">Your experience</p>

      <div
        className="flex w-full rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-200/50"
        role="radiogroup"
        aria-label="Fresher or experienced"
      >
        <label className="relative z-10 flex-1 cursor-pointer">
          <input
            type="radio"
            name="plan-track"
            value="fresher"
            checked={track === 'fresher'}
            onChange={() => handleTrackChange('fresher')}
            className="peer sr-only"
          />
          <div className={trackToggleClass}>
            Fresher
            <span className="ml-1 hidden font-normal text-slate-400 sm:inline">(0–1 yr)</span>
          </div>
        </label>
        <label className="relative z-10 flex-1 cursor-pointer">
          <input
            type="radio"
            name="plan-track"
            value="experienced"
            checked={track === 'experienced'}
            onChange={() => handleTrackChange('experienced')}
            className="peer sr-only"
          />
          <div className={trackToggleClass}>
            Experienced
            <span className="ml-1 hidden font-normal text-slate-400 sm:inline">(1+ yrs)</span>
          </div>
        </label>
      </div>

      {track === 'experienced' ? (
        <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label="Years of experience">
          {EXPERIENCED_BAND_OPTIONS.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(option.value)}
                className={`${bandPillClass} ${
                  selected
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
