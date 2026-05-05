import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import {
  HiPencil,
  HiTrash,
  HiPlus,
  HiChevronLeft,
  HiChevronRight,
  HiGlobeAlt,
  HiUsers,
  HiCalendarDays,
  HiArrowTrendingUp,
  HiClock,
  HiClipboardDocument,
  HiXMark,
} from 'react-icons/hi2';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const LEVELS = ['Fresher', 'Experienced'];

/** Local calendar date (YYYY-MM-DD) — avoids UTC midnight shifting “today” wrong for India admins. */
function todayLocalISO() {
  return toYmd(new Date());
}

function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the ISO-style week containing this calendar date (local browser). Match DB isodow logic. */
function mondayOfCalendarWeek(isoYmd) {
  const [y, m, d] = isoYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  const isodow = dow === 0 ? 7 : dow;
  dt.setDate(dt.getDate() - (isodow - 1));
  return toYmd(dt);
}

function addDaysYmd(isoYmd, delta) {
  const [y, m, d] = isoYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toYmd(dt);
}

function formatShort(isoYmd) {
  const [y, m, d] = isoYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Build ~6×7 grid cells; Monday-first; `empty` pads outside month. */
function buildMonthCells(year, monthIndex) {
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const mondayStartOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < mondayStartOffset; i += 1) {
    cells.push({ kind: 'empty', key: `lead-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({ kind: 'day', key: `d-${year}-${mm}-${dd}`, ymd: `${year}-${mm}-${dd}`, day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'empty', key: `trail-${cells.length}` });
  }
  while (cells.length < 42) {
    cells.push({ kind: 'empty', key: `fill-${cells.length}` });
  }
  return cells;
}

function monthBoundsYmd(year, monthIndex) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

function defaultInterviewDateForWeek(weekMon, weekSun) {
  const t = todayLocalISO();
  if (t >= weekMon && t <= weekSun) return t;
  return weekMon;
}

/** Copy-paste into ChatGPT / Claude / Gemini: turn a list or sheet into our JSON. */
const BULK_AI_HELPER_PROMPT = `You are helping an admin import interview ticker rows into a web app.

Each row MUST include its own calendar date from the source material — do not ask the admin to pick a date in the app. Use ISO date strings "YYYY-MM-DD" only (calendar day; you may use any valid dates across multiple weeks in one array).

Workflow (strict order):
1) From the user's table, list, sheet, or description (including screenshots), infer each interview row: name, role/company, experience level, and which calendar day it belongs to.
2) BEFORE you output any JSON, print a short date-wise summary only, e.g. "2026-04-14: 3 | 2026-04-15: 2 | …" and the total count.
3) Ask the user clearly: "Here is the date-wise count. Are you sure you want me to output the JSON now? (Reply yes to continue.)"
4) ONLY after the user replies with clear confirmation (e.g. yes / sure / go ahead), output ONE response that contains ONLY valid JSON — no markdown code fences, no commentary before or after.

Shape: a JSON array of objects. Each object has exactly these keys:
- "interview_date" (string, required): "YYYY-MM-DD"
- "name" (string, required): candidate full name
- "role" (string): job title and company, e.g. "SDE-2 @ Google"
- "level" (string): exactly "Fresher" or "Experienced" (use "Fresher" when unclear)

Example (format only):
[{"interview_date":"2026-04-14","name":"Asha K.","role":"Backend @ FinCo","level":"Experienced"},{"interview_date":"2026-04-16","name":"Dev P.","role":"SDE-1 @ Retail","level":"Fresher"}]

Until the user confirms, do not output the JSON array.`;

const BULK_JSON_TEXTAREA_PLACEHOLDER = `[
  { "interview_date": "2026-04-14", "name": "…", "role": "…", "level": "Fresher" },
  { "interview_date": "2026-04-16", "name": "…", "role": "…", "level": "Experienced" }
]`;

const BULK_JSON_ARRAY_KEYS = ['interviews', 'candidates', 'people', 'rows', 'items', 'slots'];

function strFrom(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return String(v).trim();
  }
  return '';
}

/** Accepts "YYYY-MM-DD" or ISO datetime start. */
function parseInterviewYmd(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function normalizeBulkRow(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const name = strFrom(raw, ['name', 'candidate', 'fullName', 'full_name', 'Name']);
  const role = strFrom(raw, ['role', 'title', 'role_company', 'company', 'position', 'Role']);
  let level = strFrom(raw, ['level', 'experience', 'Level']) || 'Fresher';
  if (!LEVELS.includes(level)) level = 'Fresher';
  if (!name && !role) return null;
  const dateRaw = strFrom(raw, [
    'interview_date',
    'date',
    'interviewDate',
    'scheduled_date',
    'day',
    'InterviewDate',
  ]);
  const interview_date = parseInterviewYmd(dateRaw);
  const issue = !interview_date ? 'no_date' : null;
  return {
    name: name || '—',
    role: role || '—',
    level,
    interview_date,
    issue,
  };
}

function bulkArrayFromParsed(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const k of BULK_JSON_ARRAY_KEYS) {
      if (Array.isArray(parsed[k])) return parsed[k];
    }
  }
  throw new Error(
    'Expected a JSON array [...] or an object with one of: ' + BULK_JSON_ARRAY_KEYS.map((x) => `"${x}"`).join(', ')
  );
}

function parseBulkJSON(text) {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], error: null };
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : 'Invalid JSON. Check brackets and commas.',
    };
  }
  try {
    const arr = bulkArrayFromParsed(parsed);
    const rows = arr.map((raw) => normalizeBulkRow(raw)).filter(Boolean);
    return {
      rows,
      error: rows.length ? null : 'No interview objects found (need name and/or role per row).',
    };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : 'Could not read interview list from JSON.',
    };
  }
}

export default function AdminTodaysInterviewsPage() {
  const [weekMonday, setWeekMonday] = useState(() => mondayOfCalendarWeek(todayLocalISO()));
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', level: 'Fresher', interview_date: '' });
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), mo: t.getMonth() };
  });
  const [monthCounts, setMonthCounts] = useState({});
  const [calendarTick, setCalendarTick] = useState(0);
  const [addForm, setAddForm] = useState({
    name: '',
    role: '',
    level: 'Fresher',
    interview_date: todayLocalISO(),
  });

  const weekSunday = useMemo(() => addDaysYmd(weekMonday, 6), [weekMonday]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDaysYmd(weekMonday, i));
  }, [weekMonday]);

  const currentMonday = useMemo(() => mondayOfCalendarWeek(todayLocalISO()), []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('todays_interviews')
      .select('id, name, role, level, interview_date, display_order')
      .gte('interview_date', weekMonday)
      .lte('interview_date', weekSunday)
      .order('interview_date', { ascending: true })
      .order('display_order', { ascending: true });
    if (!error) setList(data ?? []);
    setLoading(false);
  }, [weekMonday, weekSunday]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!addModalOpen && !bulkModalOpen) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (adding || bulkSaving) return;
      setAddModalOpen(false);
      setBulkModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addModalOpen, bulkModalOpen, adding, bulkSaving]);

  const monthCells = useMemo(
    () => buildMonthCells(calendarMonth.y, calendarMonth.mo),
    [calendarMonth.y, calendarMonth.mo]
  );

  const monthTitle = useMemo(
    () =>
      new Date(calendarMonth.y, calendarMonth.mo, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarMonth.y, calendarMonth.mo]
  );

  useEffect(() => {
    let cancelled = false;
    const { y, mo } = calendarMonth;
    const { start, end } = monthBoundsYmd(y, mo);
    (async () => {
      const { data, error } = await supabase
        .from('todays_interviews')
        .select('interview_date')
        .gte('interview_date', start)
        .lte('interview_date', end);
      if (cancelled) return;
      if (error) {
        setMonthCounts({});
        return;
      }
      const next = {};
      for (const row of data ?? []) {
        const k = row.interview_date;
        if (k) next[k] = (next[k] ?? 0) + 1;
      }
      setMonthCounts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarMonth.y, calendarMonth.mo, calendarTick]);

  const bumpCalendarCounts = () => setCalendarTick((n) => n + 1);

  const goCalendarPrevMonth = () => {
    setCalendarMonth(({ y, mo }) => {
      if (mo === 0) return { y: y - 1, mo: 11 };
      return { y, mo: mo - 1 };
    });
  };

  const goCalendarNextMonth = () => {
    setCalendarMonth(({ y, mo }) => {
      if (mo === 11) return { y: y + 1, mo: 0 };
      return { y, mo: mo + 1 };
    });
  };

  const goCalendarThisMonth = () => {
    const t = new Date();
    setCalendarMonth({ y: t.getFullYear(), mo: t.getMonth() });
  };

  const handleCalendarDayClick = (ymd) => {
    setWeekMonday(mondayOfCalendarWeek(ymd));
    setAddForm((p) => ({ ...p, interview_date: ymd }));
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const { name, role, level, interview_date } = addForm;
    if (!name.trim()) {
      showMsg('error', 'Name is required.');
      return;
    }
    if (interview_date < weekMonday || interview_date > weekSunday) {
      showMsg('error', 'Pick a date inside the selected week.');
      return;
    }
    const sameDay = list.filter((r) => r.interview_date === interview_date);
    setAdding(true);
    const { error } = await supabase.from('todays_interviews').insert({
      interview_date,
      name: name.trim(),
      role: (role || '').trim() || '—',
      level: level || 'Fresher',
      display_order: sameDay.length,
    });
    setAdding(false);
    if (error) {
      showMsg('error', error.message);
      return;
    }
    setAddForm((p) => ({ ...p, name: '', role: '' }));
    setAddModalOpen(false);
    showMsg('success', 'Added to the ticker.');
    fetchList();
    bumpCalendarCounts();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      name: row.name,
      role: row.role,
      level: row.level,
      interview_date: row.interview_date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', role: '', level: 'Fresher', interview_date: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    const { name, role, level, interview_date } = editForm;
    if (!name.trim()) {
      showMsg('error', 'Name is required.');
      return;
    }
    if (interview_date < weekMonday || interview_date > weekSunday) {
      showMsg('error', 'Date must stay within this week (or switch week above).');
      return;
    }
    const { error } = await supabase
      .from('todays_interviews')
      .update({
        name: name.trim(),
        role: (role || '').trim() || '—',
        level: level || 'Fresher',
        interview_date,
      })
      .eq('id', editingId);
    if (error) {
      showMsg('error', error.message);
      return;
    }
    setEditingId(null);
    showMsg('success', 'Saved.');
    fetchList();
    bumpCalendarCounts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this person from the hero ticker?')) return;
    const { error } = await supabase.from('todays_interviews').delete().eq('id', id);
    if (error) {
      showMsg('error', error.message);
      return;
    }
    showMsg('success', 'Removed.');
    fetchList();
    bumpCalendarCounts();
  };

  const bulkParsed = useMemo(() => parseBulkJSON(bulkText), [bulkText]);

  const bulkImportRows = useMemo(() => {
    return bulkParsed.rows.filter((r) => r.interview_date && !r.issue);
  }, [bulkParsed.rows]);

  const handleBulkImport = async (e) => {
    e.preventDefault();
    const { rows: allRows, error } = bulkParsed;
    if (error && !allRows.length) {
      showMsg('error', error || 'Paste valid JSON first.');
      return;
    }
    if (!allRows.length) {
      showMsg('error', error || 'No rows found. Each object needs interview_date (YYYY-MM-DD), name, role, level.');
      return;
    }
    const rows = bulkImportRows;
    if (!rows.length) {
      showMsg(
        'error',
        'No row has a valid interview_date (YYYY-MM-DD). Fix the JSON and try again.'
      );
      return;
    }
    const sorted = rows
      .map((r, idx) => ({ ...r, _idx: idx }))
      .sort((a, b) => {
        const c = a.interview_date.localeCompare(b.interview_date);
        return c !== 0 ? c : a._idx - b._idx;
      });
    const slotByDate = {};
    setBulkSaving(true);
    let inserted = 0;
    for (const row of sorted) {
      const d = row.interview_date;
      const existing = list.filter((r) => r.interview_date === d).length;
      const n = slotByDate[d] ?? 0;
      slotByDate[d] = n + 1;
      const { error: insErr } = await supabase.from('todays_interviews').insert({
        interview_date: d,
        name: row.name || '—',
        role: row.role || '—',
        level: row.level || 'Fresher',
        display_order: existing + n,
      });
      if (!insErr) inserted += 1;
    }
    setBulkSaving(false);
    setBulkText('');
    setBulkModalOpen(false);
    showMsg(
      'success',
      inserted === sorted.length
        ? `Imported ${inserted} slot(s). Dates came only from your JSON. Use the week picker above to view other days.`
        : `Imported ${inserted} of ${sorted.length} (some rows failed to save).`
    );
    fetchList();
    bumpCalendarCounts();
  };

  const todayCount = useMemo(() => {
    const today = todayLocalISO();
    return list.filter(r => r.interview_date === today).length;
  }, [list]);

  const monthTotal = useMemo(() => {
    return Object.values(monthCounts).reduce((a, b) => a + b, 0);
  }, [monthCounts]);

  if (loading && list.length === 0) {
    return <PageLoader size="md" label="Loading week…" className="py-12" />;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-[1536px] mx-auto px-4 sm:px-10 space-y-8 pb-12"
    >
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
        
        <div className="relative z-10">
          <motion.p variants={itemVariants} className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-2">
            Admin Dashboard
          </motion.p>
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl font-black tracking-tight text-white"
          >
            Interview <span className="gradient-primary-text">Schedule</span>
          </motion.h1>
        </div>
      </section>

      {/* Summary Statistics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Today', value: todayCount, icon: HiClock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'This Week', value: list.length, icon: HiCalendarDays, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Monthly Total', value: monthTotal, icon: HiArrowTrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            variants={itemVariants}
            className="nth-card p-5 flex items-center gap-4 hover:translate-y-[-2px] transition-transform duration-300"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Main Action Bar (Filters) */}
      <motion.section variants={itemVariants} className="nth-card p-4 sm:p-6 shadow-xl border-indigo-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white">
              <HiCalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-0.5">Managing Schedule</p>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {formatShort(weekMonday)} — {formatShort(weekSunday)}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setBulkModalOpen(false);
                setAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
            >
              <HiPlus className="h-4 w-4" />
              Add person
            </button>
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-indigo-600 bg-white px-4 py-2.5 text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Bulk
            </button>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setWeekMonday((m) => {
                    const nm = addDaysYmd(m, -7);
                    const ns = addDaysYmd(nm, 6);
                    setAddForm((p) => ({ ...p, interview_date: defaultInterviewDateForWeek(nm, ns) }));
                    return nm;
                  });
                }}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                title="Previous Week"
              >
                <HiChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const nm = currentMonday;
                  const ns = addDaysYmd(nm, 6);
                  setWeekMonday(nm);
                  setAddForm((p) => ({ ...p, interview_date: defaultInterviewDateForWeek(nm, ns) }));
                }}
                className="px-4 py-1.5 text-xs font-black text-slate-900 uppercase tracking-widest"
              >
                This Week
              </button>
              <button
                onClick={() => {
                  setWeekMonday((m) => {
                    const nm = addDaysYmd(m, 7);
                    const ns = addDaysYmd(nm, 6);
                    setAddForm((p) => ({ ...p, interview_date: defaultInterviewDateForWeek(nm, ns) }));
                    return nm;
                  });
                }}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                title="Next Week"
              >
                <HiChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200" />
            
            {/* Quick jump details */}
            <details className="relative group">
              <summary className="list-none cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
                <HiCalendarDays className="h-5 w-5 text-indigo-500" />
              </summary>
              <div className="absolute right-0 top-full mt-2 w-72 nth-card p-4 shadow-2xl z-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400">{monthTitle}</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={goCalendarPrevMonth} className="p-1 rounded-md hover:bg-slate-100"><HiChevronLeft className="h-4 w-4" /></button>
                    <button onClick={goCalendarNextMonth} className="p-1 rounded-md hover:bg-slate-100"><HiChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {['M','T','W','T','F','S','S'].map(d => <div key={d} className="text-center text-[8px] font-black text-slate-300">{d}</div>)}
                  {monthCells.map(c => {
                     if (c.kind === 'empty') return <div key={c.key} className="h-8" />;
                     const active = c.ymd >= weekMonday && c.ymd <= weekSunday;
                     const count = monthCounts[c.ymd] ?? 0;
                     return (
                       <button
                         key={c.key}
                         onClick={(e) => {
                             handleCalendarDayClick(c.ymd);
                             e.currentTarget.closest('details').open = false;
                         }}
                         className={`relative h-9 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center ${
                           active 
                             ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                             : 'hover:bg-slate-50 text-slate-600 hover:text-indigo-600'
                         }`}
                       >
                         {c.day}
                         {count > 0 && (
                           <div className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[8px] font-black z-10 shadow-sm ${
                             active ? 'bg-white text-indigo-600' : 'bg-slate-900 text-white'
                           }`}>
                             {count}
                           </div>
                         )}
                       </button>
                     );
                  })}
                </div>
              </div>
            </details>
          </div>
        </div>
      </motion.section>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-4 text-sm font-bold shadow-sm border ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="space-y-8">

          {/* Weekly Schedule */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <HiUsers className="h-5 w-5 text-indigo-500" />
                <h2 className="font-black text-slate-900">Weekly Schedule</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase">
                  {list.length} Records
                </span>
              </div>
            </div>

            <div className="nth-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Candidate</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Role / Company</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Level</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {list.length === 0 ? (
                        <motion.tr 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="p-4 rounded-full bg-slate-50 text-slate-300">
                                <HiCalendarDays className="h-10 w-10" />
                              </div>
                              <p className="text-sm font-bold text-slate-400">No schedule entries for this week.</p>
                            </div>
                          </td>
                        </motion.tr>
                      ) : (
                        list.map((row) => (
                          <motion.tr 
                            key={row.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="group hover:bg-slate-50/50 transition-colors"
                          >
                            {editingId === row.id ? (
                              <>
                                <td className="px-6 py-4">
                                  <select
                                    value={editForm.interview_date}
                                    onChange={(e) => setEditForm((p) => ({ ...p, interview_date: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold"
                                  >
                                    {weekDays.map((ymd) => (
                                      <option key={ymd} value={ymd}>{formatShort(ymd)}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    value={editForm.role}
                                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={editForm.level}
                                    onChange={(e) => setEditForm((p) => ({ ...p, level: e.target.value }))}
                                    className="rounded-lg border border-slate-200 p-2 text-xs font-bold"
                                  >
                                    {LEVELS.map((l) => (
                                      <option key={l} value={l}>{l}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                  <button onClick={handleUpdate} className="text-xs font-black text-emerald-600 hover:text-emerald-700">SAVE</button>
                                  <button onClick={cancelEdit} className="text-xs font-black text-slate-400 hover:text-slate-600">EXIT</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-bold text-slate-500">{formatShort(row.interview_date)}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-black text-slate-900">{row.name}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-xs font-bold text-slate-500">{row.role}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                    row.level === 'Fresher' 
                                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  }`}>
                                    {row.level}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEdit(row)}
                                      className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
                                    >
                                      <HiPencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(row.id)}
                                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <HiTrash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>
        </div>

      {addModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60"
            aria-hidden
            onClick={() => !adding && setAddModalOpen(false)}
          />
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <HiPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Add person</h2>
                  <p className="text-[10px] font-medium text-slate-500">
                    Week {formatShort(weekMonday)} — {formatShort(weekSunday)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={adding}
                onClick={() => setAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-0.5">Interview date</label>
                  <select
                    value={addForm.interview_date}
                    onChange={(e) => setAddForm((p) => ({ ...p, interview_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                  >
                    {weekDays.map((ymd) => (
                      <option key={ymd} value={ymd}>{formatShort(ymd)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-0.5">Name</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-0.5">Role & company</label>
                  <input
                    type="text"
                    value={addForm.role}
                    onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                    placeholder="e.g. SDE-1 @ Google"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-0.5">Experience</label>
                  <select
                    value={addForm.level}
                    onChange={(e) => setAddForm((p) => ({ ...p, level: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full py-3 rounded-xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {adding ? 'Adding…' : 'Push to Ticker'}
              </button>
            </form>
          </div>
        </div>
      )}

      {bulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60"
            aria-hidden
            onClick={() => !bulkSaving && setBulkModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <HiGlobeAlt className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Bulk JSON import</h2>
                  <p className="text-[10px] font-medium text-slate-500">Each row needs interview_date (YYYY-MM-DD).</p>
                </div>
              </div>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => setBulkModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(BULK_AI_HELPER_PROMPT);
                    showMsg('success', 'Prompt copied.');
                  } catch {
                    showMsg('error', 'Could not copy.');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-black text-indigo-800 hover:bg-indigo-100 transition-colors"
              >
                <HiClipboardDocument className="h-3.5 w-3.5" />
                Copy prompt
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  JSON (array or &#123; &quot;interviews&quot;: [...] &#125;)
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  placeholder={BULK_JSON_TEXTAREA_PLACEHOLDER}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
                />
              </div>
              {bulkParsed.error && (
                <p className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  {bulkParsed.error}
                </p>
              )}
              {bulkParsed.rows.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Preview ({bulkParsed.rows.length} in file · {bulkImportRows.length} will import)
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      Skipped rows are missing <span className="text-slate-600">interview_date</span>
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Level</th>
                          <th className="px-3 py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {bulkParsed.rows.map((r, i) => {
                          const willImport = Boolean(r.interview_date && !r.issue);
                          return (
                            <tr
                              key={`${r.name}-${r.interview_date}-${i}`}
                              className={`font-medium ${willImport ? 'text-slate-800' : 'text-slate-400'}`}
                            >
                              <td className="px-3 py-2 font-mono text-[9px]">{r.interview_date || '—'}</td>
                              <td className="px-3 py-2">{r.name}</td>
                              <td className="px-3 py-2 text-slate-500">{r.role}</td>
                              <td className="px-3 py-2">{r.level}</td>
                              <td className="px-3 py-2 text-right text-[9px] font-black uppercase">
                                {willImport ? (
                                  <span className="text-emerald-600">Yes</span>
                                ) : (
                                  <span className="text-amber-600">Missing date</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkSaving || !bulkImportRows.length}
                className="w-full py-3 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
              >
                {bulkSaving
                  ? 'Importing...'
                  : `Import ${bulkImportRows.length} slot${bulkImportRows.length === 1 ? '' : 's'} from JSON`}
              </button>
            </div>
          </div>
        </div>
      )}
      </motion.div>
    );
  }
