/** Minutes between slot start and end (clamped 15–60, default 25). */
export function slotDurationMinutes(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 25;
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 25;
  return Math.min(60, Math.max(15, mins));
}

export function endAtFromStartAndMinutes(startValue, durationMins) {
  const start = new Date(startValue);
  const mins = Math.min(60, Math.max(15, Number(durationMins) || 25));
  return new Date(start.getTime() + mins * 60 * 1000);
}
