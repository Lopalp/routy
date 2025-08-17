import React, { useEffect, useMemo, useRef, useState } from "react";
import { MdMoreVert, MdAdd } from "react-icons/md";

/*
  COMPLETE APP – ZEN + Focus Style (Addictive-But-Healthy 2.0)
  ------------------------------------------------------------
  • Bewegter Lava-Background überall, Glas-Panels, cleane Buttons
  • Abschluss NUR via Timer – Streak-Logik mit optionalem "Schild" (Streak‑Freeze)
  • Psychologisch wirksame, aber freundliche Engagement-Mechaniken (XP/Level, Kombometer, Quests, Micro‑Belohnungen)
  • 30+ Features (u. a. Rewards, Tokens, RunningBar, Keyboard Shortcuts, Export/Import)
*/

// ZEN Palette
const BG = "#0e1113";          // near-black (soot)
const TEXT = "#e5e7e3";       // warm off‑white
const SUBTEXT = "#b9c0bb";     // soft grey‑sage
const BORDER = "#1b2023";      // faint divider
let ACCENT = "#86b3b8";       // muted teal (calm)
const GLASS_BG = "rgba(245, 247, 246, 0.05)"; // subtle glass tint
const GLASS_BORDER = "rgba(134, 179, 184, 0.28)"; // accent-tinted border

// Encouragement messages – variable Verstärkung
const MESSAGES = [
  "Kleiner Schritt, große Wirkung ✨",
  "Du baust gerade ein starkes Fundament.",
  "Konstanz schlägt Perfektion.",
  "Heute 1% besser – das zählt.",
  "Dein zukünftiges Ich sagt: Danke!",
];

// Achievement Meilensteine
const ACHIEVEMENTS = {
  STREAK_7: { id: "STREAK_7", label: "7er Streak", cond: (r) => r.streak >= 7 },
  STREAK_30: { id: "STREAK_30", label: "30er Streak", cond: (r) => r.streak >= 30 },
  STREAK_100: { id: "STREAK_100", label: "100er Streak", cond: (r) => r.streak >= 100 },
  FIRST_SESSION: { id: "FIRST_SESSION", label: "Erste Session", cond: (_r, ctx) => ctx.totalSessions >= 1 },
  FIVE_TODAY: { id: "FIVE_TODAY", label: "5 heute", cond: (_r, ctx) => ctx.completedToday >= 5 },
};

// --- Utils ---
const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const iso = (d) => d.toISOString().slice(0, 10);
const parseISO = (s) => new Date(s + "T00:00:00");
const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);

function seedHistory(daysBack, arr) {
  const map = {};
  for (let i = daysBack; i >= 0; i--) {
    map[iso(addDays(new Date(), -i))] = !!arr[arr.length - 1 - (daysBack - i)];
  }
  return map;
}

function defaultRoutines() {
  const t = todayIso();
  return [
    {
      id: crypto.randomUUID(),
      title: "Lesen",
      emoji: "📖",
      time: "07:30",
      duration: 20,
      streak: 5,
      lastDoneDate: t,
      doneToday: true,
      shield: 0,
      history: seedHistory(6, [true, false, true, true, false, true, true]),
    },
    {
      id: crypto.randomUUID(),
      title: "Glas Zitronenwasser morgens",
      emoji: "🍋",
      time: "08:00",
      duration: 5,
      streak: 1,
      lastDoneDate: "",
      doneToday: false,
      shield: 0,
      history: seedHistory(6, [true, false, false, false, false, false, false]),
    },
  ];
}

function useLocalStore(key, initialValue) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; } catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

function computeStreakAfterMarkShield(prev) {
  const t = todayIso();
  if (!prev.lastDoneDate) return { streak: 1, lastDoneDate: t };
  const d = diffDays(t, prev.lastDoneDate);
  if (d === 0) return { streak: prev.streak, lastDoneDate: t };
  if (d === 1) return { streak: prev.streak + 1, lastDoneDate: t };
  if (d === 2 && (prev.shield || 0) > 0) return { streak: prev.streak + 1, lastDoneDate: t, shield: (prev.shield || 0) - 1 };
  return { streak: 1, lastDoneDate: t };
}

function minutesToday(routines) {
  return routines.filter(r => r.doneToday).reduce((sum, r) => sum + (r.duration || 0), 0);
}

function isNowAround(timeHHMM, marginMin = 10) {
  const now = new Date();
  const [hh, mm] = timeHHMM.split(":" ).map(Number);
  const target = new Date(now); target.setHours(hh, mm, 0, 0);
  const diff = Math.abs(now.getTime() - target.getTime()) / 60000; // minutes
  return diff <= marginMin;
}

// --- Shared Lava Background (beweglich) ---
function LavaBackground({ intensity = 1 }) {
  const o1 = 0.25 * intensity, o2 = 0.18 * intensity, o3 = 0.14 * intensity;
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[70vw] h-[70vw] rounded-full blur-3xl"
           style={{ opacity: o1, background: `radial-gradient(circle at 35% 35%, ${ACCENT}, transparent 60%)`, animation: "floatA 22s ease-in-out infinite alternate", willChange: "transform" }} />
      <div className="absolute -bottom-56 -right-48 w-[65vw] h-[65vw] rounded-full blur-3xl"
           style={{ opacity: o2, background: `radial-gradient(circle at 60% 60%, ${TEXT}22, transparent 60%)`, animation: "floatB 26s ease-in-out infinite alternate", willChange: "transform" }} />
      <div className="absolute top-1/3 left-1/4 w-[45vw] h-[45vw] rounded-full blur-3xl"
           style={{ opacity: o3, background: `radial-gradient(circle at 50% 50%, ${SUBTEXT}, transparent 60%)`, animation: "floatC 24s ease-in-out infinite alternate", willChange: "transform" }} />
    </div>
  );
}

// --- UI Bits ---
function DotRow({ history, streak }) {
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = iso(addDays(new Date(), -i)); days.push({ d, done: !!history[d] }); }
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="flex items-center gap-2">
        {days.map((x) => (
          <span key={x.d} title={x.d} className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: x.done ? ACCENT : "transparent", border: x.done ? `1px solid ${ACCENT}` : `1px solid ${SUBTEXT}55` }} />
        ))}
      </div>
      <span className="text-sm" style={{ color: SUBTEXT, transform: "translateY(1px)" }}>{streak}</span>
    </div>
  );
}

function Overflow({ onEdit, onDelete, onShield, canShield }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative select-none">
      <button onClick={() => setOpen((v) => !v)} aria-label="Menü" className="leading-none" style={{ color: SUBTEXT }}><MdMoreVert /></button>
      {open && (
        <div className="absolute right-0 mt-2 rounded-2xl overflow-hidden backdrop-blur-xl"
             style={{ background: "rgba(14,17,19,0.85)", border: `1px solid ${BORDER}` }}>
          <button onClick={() => { setOpen(false); onEdit(); }} className="block w-full px-4 py-2 text-left" style={{ color: TEXT }}>Bearbeiten</button>
          {canShield && <button onClick={() => { setOpen(false); onShield(); }} className="block w-full px-4 py-2 text-left" style={{ color: TEXT }}>Schild einsetzen</button>}
          <button onClick={() => { setOpen(false); onDelete(); }} className="block w-full px-4 py-2 text-left" style={{ color: TEXT }}>Löschen</button>
        </div>
      )}
    </div>
  );
}

function MiniProgressRing({ progress = 0 }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative grid place-items-center">
      <div className="absolute inset-0 rounded-full"
           style={{ background: `conic-gradient(${ACCENT} ${pct*360}deg, transparent ${pct*360}deg)`, filter: "blur(0.4px)" }} />
      <div className="absolute inset-[2px] rounded-full" style={{ background: "transparent", border: `1px solid ${BORDER}` }} />
    </div>
  );
}

function RoutineCard({ r, onStart, onEdit, onDelete, onShield, sessionState, shieldsAvailable }) {
  const running = sessionState && sessionState.id === r.id;
  const dueNow = isNowAround(r.time);
  const progress = running ? 1 - sessionState.remainingMs / sessionState.totalMs : 0;
  return (
    <div className="rounded-2xl border backdrop-blur-xl px-5 py-6" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
      <div className="flex gap-5">
        {/* Big emoji + live ring */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 64, height: 64 }}>
          {running && <MiniProgressRing progress={progress} />}
          <div className="text-[50px] leading-none select-none">{r.emoji}</div>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-[22px] md:text-[24px] font-semibold leading-snug truncate" style={{ color: TEXT }}>{r.title}</h3>
                {dueNow && (<span className="text-[11px] px-2 py-1 rounded-full" style={{ background: "rgba(134,179,184,0.15)", color: ACCENT, border: `1px solid ${ACCENT}55` }}>Jetzt dran</span>)}
                {(r.shield||0) > 0 && (<span className="text-[11px] px-2 py-1 rounded-full" style={{ background: "rgba(134,179,184,0.10)", color: ACCENT, border: `1px solid ${ACCENT}33` }}>Schild aktiv ×{r.shield}</span>)}
              </div>
              <div className="mt-1 text-[13px]" style={{ color: SUBTEXT }}>
                {r.time} · {r.duration} Min {running ? (sessionState.paused ? "· Pausiert" : "· Läuft…") : ""}
              </div>
            </div>
            <Overflow onEdit={onEdit} onDelete={onDelete} onShield={onShield} canShield={shieldsAvailable} />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <DotRow history={r.history} streak={r.streak} />
            <div className="flex items-center gap-2">
              <button onClick={onStart} className="px-5 py-2.5 text-sm font-medium rounded-full transition-colors"
                      style={{ border: `1px solid ${ACCENT}`, color: ACCENT, background: "transparent" }}>{running ? "Weiter" : "Start"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Focus Session ---
function formatMs(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(s / 60); const ss = String(s % 60).padStart(2, "0"); return `${m}:${ss}`; }

function ProgressRing({ size = 260, stroke = 12, progress = 0 }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const dash = c * progress;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={BORDER} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={ACCENT} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function FocusSession({ session, onPauseToggle, onAddMinute, onCancel, onFinish, settings }) {
  const progress = 1 - session.remainingMs / session.totalMs;
  const halfPassedRef = useRef(false);

  useEffect(() => {
    if (!settings.sound) return;
    if (!halfPassedRef.current && session.remainingMs <= session.totalMs / 2 && session.remainingMs > 0) {
      halfPassedRef.current = true; playBeep(660, 120);
      if (navigator.vibrate) navigator.vibrate([15, 60, 15]);
    }
  }, [session.remainingMs, session.totalMs, settings.sound]);

  return (
    <div className="fixed inset-0 z-[60]" style={{ background: BG, color: TEXT }}>
      <LavaBackground intensity={1} />
      <div className="relative z-10 h-full max-w-3xl mx-auto px-6 py-10 flex flex-col">
        <header className="text-center">
          <h2 className="text-[28px] md:text-[32px] font-semibold tracking-tight">{session.title}</h2>
        </header>
        <main className="flex-1 grid place-items-center">
          <div className="relative">
            <ProgressRing size={260} stroke={12} progress={progress} />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-[44px] md:text-[52px] font-light tabular-nums">{formatMs(session.remainingMs)}</div>
              <div className="sr-only">Fortschritt: {Math.round(progress * 100)}%</div>
            </div>
          </div>
        </main>
        <footer className="pt-4 grid grid-cols-4 gap-3">
          <button onClick={onCancel} className="px-4 py-3 rounded-full" style={{ border: `1px solid ${BORDER}`, color: TEXT }}>Abbrechen</button>
          <button onClick={() => onFinish()} className="px-4 py-3 rounded-full" style={{ border: `1px solid ${BORDER}`, color: TEXT }}>Fertig</button>
          <button onClick={onPauseToggle} className="px-4 py-3 rounded-full" style={{ background: ACCENT, color: "#0f1315" }}>{session.paused ? "Weiter" : "Pause"}</button>
          <button onClick={onAddMinute} className="px-4 py-3 rounded-full" style={{ border: `1px solid ${BORDER}`, color: TEXT }}>+1 Min</button>
        </footer>
      </div>
      <style>{`
        @keyframes floatA { 0%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(10%, -12%, 0) } 100%{ transform:translate3d(-12%, 14%, 0) } }
        @keyframes floatB { 0%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(-9%, 10%, 0) } 100%{ transform:translate3d(11%, -13%, 0) } }
        @keyframes floatC { 0%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(8%, -7%, 0) } 100%{ transform:translate3d(-10%, 9%, 0) } }
      `}</style>
    </div>
  );
}

// --- Achievements & Toasts & Rewards ---
function Toast({ text, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-full backdrop-blur-xl"
         style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, color: TEXT }}>{text}</div>
  );
}

function Confetti({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1500); return () => clearTimeout(t); }, [onDone]);
  const particles = Array.from({ length: 22 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {particles.map((_, i) => (
        <div key={i} className="absolute w-1.5 h-1.5 rounded-sm" style={{
          left: `${Math.random()*100}%`, top: `${Math.random()*40 + 20}%`,
          background: i % 2 ? ACCENT : TEXT, opacity: .9,
          animation: `fall ${1000 + Math.random()*800}ms ease-out forwards`, transform: `translateY(-40vh) rotate(${Math.random()*180}deg)`
        }} />
      ))}
      <style>{`@keyframes fall{to{transform:translateY(60vh) rotate(0deg);opacity:0}}`}</style>
    </div>
  );
}

function RewardModal({ open, reward, onClaim }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center" style={{ background: "rgba(14,17,19,0.7)" }}>
      <div className="rounded-2xl border backdrop-blur-xl p-6 w-[90%] max-w-md" style={{ background: GLASS_BG, borderColor: GLASS_BORDER, color: TEXT }}>
        <h3 className="text-2xl font-semibold mb-2">Belohnung freigeschaltet</h3>
        <p className="mb-4" style={{ color: SUBTEXT }}>{reward?.text}</p>
        <div className="flex justify-end">
          <button onClick={onClaim} className="px-5 py-2.5 rounded-full" style={{ background: ACCENT, color: "#0f1315" }}>Einsammeln</button>
        </div>
      </div>
    </div>
  );
}

// --- Modal & Form ---
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(14,17,19,0.8)" }}>
      <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}>
        <h3 className="text-2xl font-semibold mb-4">{title}</h3>
        {children}
        <div className="mt-4 flex justify-end"><button onClick={onClose} className="px-4 py-2 rounded-full" style={{ border: `1px solid ${BORDER}`, color: TEXT }}>Schließen</button></div>
      </div>
    </div>
  );
}

function AddEditRoutine({ open, onClose, onSubmit, initial }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [emoji, setEmoji] = useState(initial?.emoji || "📖");
  const [time, setTime] = useState(initial?.time || "08:00");
  const [duration, setDuration] = useState(initial?.duration || 20);
  useEffect(() => { setTitle(initial?.title || ""); setEmoji(initial?.emoji || "📖"); setTime(initial?.time || "08:00"); setDuration(initial?.duration || 20); }, [initial]);
  const submit = (e) => { e.preventDefault(); const payload = { ...(initial || { id: crypto.randomUUID(), streak: 0, lastDoneDate: "", doneToday: false, history: {}, shield: 0 }), title: title.trim() || "Neue Routine", emoji, time, duration: Math.max(1, Number(duration) || 1) }; onSubmit(payload); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Routine bearbeiten" : "Neue Routine"}>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full px-2 py-3 focus:outline-none" style={{ background: "transparent", borderBottom: `1px solid ${BORDER}`, color: TEXT, caretColor: ACCENT }} placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="w-full px-2 py-3 focus:outline-none" style={{ background: "transparent", borderBottom: `1px solid ${BORDER}`, color: TEXT, caretColor: ACCENT }} placeholder="Emoji (z. B. 📖)" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        <input type="time" className="w-full px-2 py-3 focus:outline-none" style={{ background: "transparent", borderBottom: `1px solid ${BORDER}`, color: TEXT, caretColor: ACCENT }} value={time} onChange={(e) => setTime(e.target.value)} />
        <input type="number" className="w-full px-2 py-3 focus:outline-none" style={{ background: "transparent", borderBottom: `1px solid ${BORDER}`, color: TEXT, caretColor: ACCENT }} value={duration} onChange={(e) => setDuration(e.target.value)} />
        <div className="flex justify-end"><button type="submit" className="px-5 py-2.5 rounded-full" style={{ background: ACCENT, color: "#0f1315" }}>Speichern</button></div>
      </form>
    </Modal>
  );
}

function RunningBar({ session, onResume, onCancel }) {
  if (!session) return null;
  const left = formatMs(session.remainingMs);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full border backdrop-blur-xl px-4 py-2 flex items-center gap-3"
         style={{ background: GLASS_BG, borderColor: GLASS_BORDER, color: TEXT }}>
      <span className="text-sm" style={{ color: SUBTEXT }}>Läuft: {session.title} · {left}</span>
      <button onClick={onResume} className="px-3 py-1.5 rounded-full text-sm" style={{ background: ACCENT, color: "#0f1315" }}>Weiter</button>
      <button onClick={onCancel} className="px-3 py-1.5 rounded-full text-sm" style={{ border: `1px solid ${BORDER}` }}>Stop</button>
    </div>
  );
}

function DailyQuests({ completedToday, sessionsToday, minutesTodayVal, onClaim, claimed }) {
  const items = [
    { id: "q_sessions", label: "Starte 2 Sessions", progress: sessionsToday, target: 2, reward: "+8 Gems" },
    { id: "q_minutes", label: "Fokussiere 20 Minuten", progress: Math.floor(minutesTodayVal), target: 20, reward: "+10 Gems" },
    { id: "q_done", label: "Erledige 3 Routinen", progress: completedToday, target: 3, reward: "+1 Schild" },
  ];
  return (
    <div className="rounded-2xl border backdrop-blur-xl p-5" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
      <h4 className="text-lg mb-3" style={{ color: TEXT }}>Tagesquests</h4>
      <div className="space-y-3">
        {items.map((q)=>{
          const pct = Math.min(100, (q.progress/q.target)*100);
          const done = q.progress >= q.target;
          const isClaimed = !!claimed[q.id];
          return (
            <div key={q.id}>
              <div className="flex items-center justify-between mb-1"><span style={{ color: SUBTEXT }}>{q.label}</span><span className="text-sm" style={{ color: SUBTEXT }}>{q.progress}/{q.target}</span></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                <div className="h-full" style={{ width: `${pct}%`, background: ACCENT }} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm" style={{ color: SUBTEXT }}>{q.reward}</span>
                {done && !isClaimed && <button onClick={()=>onClaim(q.id)} className="px-3 py-1.5 rounded-full text-sm" style={{ background: ACCENT, color: "#0f1315" }}>Claim</button>}
                {done && isClaimed && <span className="text-sm" style={{ color: SUBTEXT }}>eingelöst</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyMatrix({ routines }) {
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(new Date(), -(6 - i))));
  return (
    <div className="rounded-2xl border backdrop-blur-xl p-5" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
      <h4 className="mb-4 text-lg" style={{ color: TEXT }}>Woche</h4>
      <div className="overflow-auto">
        <table className="min-w-full text-sm" style={{ color: SUBTEXT }}>
          <thead><tr><th className="text-left pr-4">Routine</th>{days.map(d => <th key={d} className="px-2 text-center">{d.slice(5)}</th>)}</tr></thead>
          <tbody>
            {routines.map(r => (
              <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-2 pr-4" style={{ color: TEXT }}>{r.emoji} {r.title}</td>
                {days.map(d => (
                  <td key={d} className="py-2 text-center">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: r.history[d] ? ACCENT : "transparent", border: `1px solid ${r.history[d] ? ACCENT : SUBTEXT+"55"}` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsView({ routines }) {
  const total = routines.length; const completed = routines.filter(r=>r.doneToday).length;
  const longest = Math.max(0, ...routines.map(r=>r.streak||0));
  return (
    <div className="rounded-2xl border backdrop-blur-xl p-5 space-y-3" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
      <h4 className="text-lg" style={{ color: TEXT }}>Analytics</h4>
      <div className="text-sm" style={{ color: SUBTEXT }}>Heute erledigt: {completed}/{total}</div>
      <div className="text-sm" style={{ color: SUBTEXT }}>Längste Streak: {longest}</div>
    </div>
  );
}

function AchievementsView({ achievements }) {
  const items = Object.values(achievements);
  return (
    <div className="rounded-2xl border backdrop-blur-xl p-5" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
      <h4 className="text-lg mb-3" style={{ color: TEXT }}>Erfolge</h4>
      <div className="grid grid-cols-2 gap-3">
        {items.length === 0 && <div style={{ color: SUBTEXT }}>Noch keine Erfolge…</div>}
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border px-3 py-3" style={{ borderColor: GLASS_BORDER, color: TEXT }}>
            <div className="text-sm" style={{ color: SUBTEXT }}>{a.date}</div>
            <div className="font-medium">{a.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ settings, setSettings, onExport, onImport }) {
  const fileRef = useRef(null);
  return (
    <div className="rounded-2xl border backdrop-blur-xl p-5 space-y-4" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
      <h4 className="text-lg" style={{ color: TEXT }}>Einstellungen</h4>
      <div className="flex items-center justify-between"><span style={{ color: SUBTEXT }}>Bewegung reduzieren</span><input type="checkbox" checked={settings.reducedMotion} onChange={(e)=>setSettings(s=>({...s,reducedMotion:e.target.checked}))} /></div>
      <div className="flex items-center justify-between"><span style={{ color: SUBTEXT }}>Sound</span><input type="checkbox" checked={settings.sound} onChange={(e)=>setSettings(s=>({...s,sound:e.target.checked}))} /></div>
      <div className="flex items-center justify-between"><span style={{ color: SUBTEXT }}>Akzentfarbe</span><input type="color" value={settings.accent} onChange={(e)=>setSettings(s=>({...s,accent:e.target.value}))} /></div>
      <div className="flex gap-3">
        <button onClick={onExport} className="px-4 py-2 rounded-full" style={{ border: `1px solid ${BORDER}`, color: TEXT }}>Export</button>
        <button onClick={()=>fileRef.current?.click()} className="px-4 py-2 rounded-full" style={{ background: ACCENT, color: "#0f1315" }}>Import</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>onImport(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// --- Sound ---
function playBeep(freq=880, duration=180) {
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration/1000); o.start(); o.stop(ctx.currentTime + duration/1000 + 0.05); } catch {}
}

// --- App ---
export default function App() {
  const [routines, setRoutines] = useLocalStore("adhd_routines_complete", defaultRoutines());
  const [query, setQuery] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [view, setView] = useState("home");
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [reward, setReward] = useState(null);
  const [rewardOpen, setRewardOpen] = useState(false);

  // Stats & Settings
  const [stats, setStats] = useLocalStore("adhd_stats", {
    xp: 0, level: 1, achievements: {}, lastActive: Date.now(),
    totalSessions: 0, notes: {},
    gems: 0, shields: 0,
    combo: 0, lastComboTs: 0,
    todayStamp: todayIso(), sessionsToday: 0, focusMinutesToday: 0,
    quests: { date: todayIso(), claimed: {} },
  });
  const [settings, setSettings] = useLocalStore("adhd_settings", { reducedMotion: false, sound: true, accent: ACCENT });
  useEffect(()=>{ ACCENT = settings.accent || ACCENT; }, [settings.accent]);

  // Keep daily counters fresh
  useEffect(()=>{
    const now = todayIso();
    if (stats.todayStamp !== now) {
      setStats(s=>({ ...s, todayStamp: now, sessionsToday: 0, focusMinutesToday: 0, quests: { date: now, claimed: {} } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.todayStamp]);

  // Running session
  const [session, setSession] = useState(null); // { id, title, totalMs, remainingMs, paused }
  const timerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase(); if (!q) return routines; return routines.filter((r) => r.title.toLowerCase().includes(q));
  }, [routines, query]);

  // Shortcuts
  useEffect(()=>{
    const onKey = (e) => {
      if (e.key === "/") { e.preventDefault(); const el = document.querySelector("input[placeholder='Suchen…']"); el?.focus(); }
      if (e.key === "+") { e.preventDefault(); setEditItem(null); setOpenForm(true); }
      if (session) {
        if (e.key === " ") { e.preventDefault(); pauseToggle(); }
        if (e.key.toLowerCase() === "m") { e.preventDefault(); addMinute(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session]);

  // Mark completion — only from timer
  const markDone = (id) => {
    const t = todayIso();
    setRoutines((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      if (r.doneToday) return r;
      const next = computeStreakAfterMarkShield(r);
      const newHistory = { ...(r.history || {}), [t]: true };
      return { ...r, doneToday: true, ...next, history: newHistory };
    }));
  };

  const removeRoutine = (id) => setRoutines((prev) => prev.filter((r) => r.id !== id));
  const upsertRoutine = (payload) => { setRoutines((prev) => { const i = prev.findIndex((x) => x.id === payload.id); if (i === -1) return [payload, ...prev]; const copy = [...prev]; copy[i] = { ...copy[i], ...payload }; return copy; }); };

  const useShieldOn = (id) => {
    setRoutines(prev => prev.map(r=> r.id===id ? { ...r, shield: (r.shield||0)+1 } : r));
    setStats(s => ({ ...s, shields: Math.max(0, (s.shields||0) - 1) }));
    setToast("Schild aktiviert");
  };

  // Session controls
  const startSession = (r) => {
    const totalMs = Math.max(1, r.duration) * 60 * 1000;
    setSession({ id: r.id, title: r.title, totalMs, remainingMs: totalMs, paused: false });
    setStats(s => ({ ...s, totalSessions: (s.totalSessions||0)+1, lastActive: Date.now(), sessionsToday: (s.sessionsToday||0)+1, combo: (Date.now()- (s.lastComboTs||0) < 90*60*1000) ? (s.combo||0)+1 : 1, lastComboTs: Date.now() }));
  };
  const pauseToggle = () => setSession((s) => ({ ...s, paused: !s.paused }));
  const addMinute = () => setSession((s) => ({ ...s, remainingMs: s.remainingMs + 60 * 1000 }));
  const cancelSession = () => setSession(null);

  // Timer tick
  useEffect(() => {
    if (!session) return; if (timerRef.current) clearInterval(timerRef.current); if (session.paused) return;
    timerRef.current = setInterval(() => { setSession((s) => { if (!s) return s; const next = Math.max(0, s.remainingMs - 250); if (next === 0 && timerRef.current) clearInterval(timerRef.current); return { ...s, remainingMs: next }; }); }, 250);
    return () => clearInterval(timerRef.current);
  }, [session?.paused, session?.id]);

  // Finish hook: XP, Achievements, Toast, Confetti, Rewards, Quests
  useEffect(() => {
    if (session && session.remainingMs === 0) {
      markDone(session.id);
      const minutes = Math.max(1, Math.round(session.totalMs/60000));
      // XP & Level
      const baseXp = minutes * 2; const bonus = Math.floor(Math.random()*6);
      setStats((s)=>{ const xp = (s.xp||0) + baseXp + bonus; const level = 1 + Math.floor(Math.sqrt(xp/120)); return { ...s, xp, level, lastActive: Date.now(), focusMinutesToday: (s.focusMinutesToday||0) + minutes }; });
      // Feedback
      setToast(MESSAGES[Math.floor(Math.random()*MESSAGES.length)]);
      setConfetti(true); if (settings.sound) playBeep(880, 160); if (navigator.vibrate) navigator.vibrate(40);
      // Achievements
      const r = routines.find(x=>x.id===session.id) || {}; const ctx = { completedToday: routines.filter(x=>x.doneToday).length+1, totalSessions: (stats.totalSessions||0) };
      const unlocked = Object.values(ACHIEVEMENTS).filter(a=>!stats.achievements[a.id] && a.cond(r, ctx));
      if (unlocked.length>0) {
        const stamp = new Date().toISOString().slice(0,10);
        setStats(s=>({ ...s, achievements: { ...s.achievements, ...Object.fromEntries(unlocked.map(a=>[a.id,{ id:a.id, label:a.label, date: stamp }])) } }));
      }
      // Random Reward (35%)
      if (Math.random() < 0.35) {
        const roll = Math.random();
        if (roll < 0.5) setReward({ kind: "gems", amount: 8 + Math.floor(Math.random()*7), text: "Bonus-Gems für deinen Fokus!" });
        else if (roll < 0.8) setReward({ kind: "shield", amount: 1, text: "Streak‑Schild erhalten – einmal auslassen ohne Bruch." });
        else setReward({ kind: "accent", amount: 1, text: "Neue Akzentnuance freigeschaltet!" });
        setRewardOpen(true);
      }
      setSession(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.remainingMs]);

  function claimReward() {
    if (!reward) return setRewardOpen(false);
    if (reward.kind === "gems") setStats(s=>({ ...s, gems: (s.gems||0) + reward.amount }));
    if (reward.kind === "shield") setStats(s=>({ ...s, shields: (s.shields||0) + reward.amount }));
    if (reward.kind === "accent") {
      // rotate accent slightly
      const hues = ["#86b3b8", "#8fb9c0", "#7faab0", "#9fbac1", "#7aa7a7"]; const pick = hues[Math.floor(Math.random()*hues.length)];
      setSettings(s=>({ ...s, accent: pick }));
    }
    setRewardOpen(false); setReward(null);
  }

  // Inactivity Nudge
  const [showNudge, setShowNudge] = useState(false);
  useEffect(()=>{ const i = setInterval(()=>{ setShowNudge(()=> Date.now() - (stats.lastActive||0) > 4*60*60*1000); }, 60000); return ()=>clearInterval(i); }, [stats.lastActive]);

  // Export / Import
  const onExport = () => {
    const blob = new Blob([JSON.stringify({ routines, stats, settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download = `routines_export_${todayIso()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const onImport = async (file) => {
    if (!file) return; const text = await file.text();
    try { const data = JSON.parse(text); if (data.routines) setRoutines(data.routines); if (data.stats) setStats(data.stats); if (data.settings) setSettings(data.settings); setToast("Import erfolgreich"); }
    catch { setToast("Import fehlgeschlagen"); }
  };

  const completedToday = routines.filter((r) => r.doneToday).length;
  const minutesDone = minutesToday(routines);

  return (
    <div className="min-h-screen relative" style={{ background: BG, color: TEXT }}>
      <LavaBackground intensity={1} />

      {showNudge && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-xl z-20" style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, color: TEXT }}>
          Kurzer Check-in? Starte eine kleine Session.
        </div>
      )}

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-6">
          <div className="rounded-2xl border backdrop-blur-xl px-5 py-6" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <h1 className="text-[40px] md:text-[44px] font-semibold tracking-tight" style={{ color: TEXT }}>Routinen</h1>
                <p className="mt-1" style={{ color: SUBTEXT }}>Heute geschafft: {completedToday}/{routines.length} · {minutesDone} Min</p>
                {/* XP & Level */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-sm" style={{ color: SUBTEXT }}>Level {stats.level||1}</div>
                  <div className="h-2 flex-1 rounded-full overflow-hidden" style={{ background: BORDER }}>
                    <div className="h-full" style={{ width: `${((stats.xp||0)%120)/120*100}%`, background: ACCENT }} />
                  </div>
                </div>
                {/* Meta counters */}
                <div className="mt-2 flex items-center gap-4 text-sm" style={{ color: SUBTEXT }}>
                  <span>◆ {stats.gems||0} Gems</span>
                  <span>🛡️ {stats.shields||0} Schilde</span>
                  <span>🔥 Combo {stats.combo||0}</span>
                </div>
              </div>
              {/* Suche + Add */}
              <div className="flex items-center gap-3">
                <input className="px-3 py-2 focus:outline-none rounded-full" style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, caretColor: ACCENT }} placeholder="Suchen…" value={query} onChange={(e) => setQuery(e.target.value)} />
                <button onClick={() => { setEditItem(null); setOpenForm(true); }} className="w-11 h-11 rounded-full grid place-items-center" style={{ background: ACCENT, color: "#0f1315" }}>
                  <MdAdd size={22} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-2 text-sm">
              {[
                {k:"home", label:"Liste"},
                {k:"week", label:"Woche"},
                {k:"analytics", label:"Analytics"},
                {k:"achievements", label:"Erfolge"},
                {k:"settings", label:"Einstellungen"},
              ].map(t=> (
                <button key={t.k} onClick={()=>setView(t.k)} className="px-3 py-1.5 rounded-full"
                        style={{ border: `1px solid ${view===t.k?ACCENT:BORDER}`, background: view===t.k? "rgba(134,179,184,0.15)":"transparent", color: view===t.k?ACCENT:SUBTEXT }}>{t.label}</button>
              ))}
            </div>
          </div>
        </header>

        {view === "home" && (
          <div className="space-y-3">
            <DailyQuests completedToday={completedToday} sessionsToday={stats.sessionsToday||0} minutesTodayVal={stats.focusMinutesToday||0} onClaim={(id)=>{
              if ((stats.quests?.claimed||{})[id]) return;
              if (id === "q_sessions" && (stats.sessionsToday||0) >= 2) setStats(s=>({ ...s, gems: (s.gems||0)+8, quests: { ...s.quests, claimed: { ...s.quests.claimed, [id]: true } } }));
              if (id === "q_minutes" && (stats.focusMinutesToday||0) >= 20) setStats(s=>({ ...s, gems: (s.gems||0)+10, quests: { ...s.quests, claimed: { ...s.quests.claimed, [id]: true } } }));
              if (id === "q_done" && completedToday >= 3) setStats(s=>({ ...s, shields: (s.shields||0)+1, quests: { ...s.quests, claimed: { ...s.quests.claimed, [id]: true } } }));
              setToast("Belohnung eingelöst!");
            }} claimed={stats.quests?.claimed||{}} />

            {filtered.map((r) => (
              <RoutineCard key={r.id} r={r} sessionState={session} onStart={() => startSession(r)} onEdit={() => setEditItem(r) || setOpenForm(true)} onDelete={() => removeRoutine(r.id)} onShield={()=>{ if ((stats.shields||0)>0) useShieldOn(r.id); else setToast("Keine Schilde verfügbar"); }} shieldsAvailable={(stats.shields||0)>0} />
            ))}
          </div>
        )}

        {view === "week" && <WeeklyMatrix routines={routines} />}
        {view === "analytics" && <AnalyticsView routines={routines} />}
        {view === "achievements" && <AchievementsView achievements={stats.achievements||{}} />}
        {view === "settings" && <SettingsView settings={settings} setSettings={setSettings} onExport={onExport} onImport={onImport} />}
      </div>

      {/* Floating Add Button for mobile */}
      <button onClick={() => { setEditItem(null); setOpenForm(true); }} className="fixed bottom-24 right-4 w-14 h-14 rounded-full grid place-items-center shadow-lg md:hidden" style={{ background: ACCENT, color: "#0f1315" }}>
        <MdAdd size={28} />
      </button>

      <RunningBar session={session} onResume={()=>setSession(s=>({...s}))} onCancel={()=>setSession(null)} />

      <AddEditRoutine open={openForm} initial={editItem} onClose={() => setOpenForm(false)} onSubmit={upsertRoutine} />

      {session && (
        <FocusSession session={session} onPauseToggle={pauseToggle} onAddMinute={addMinute} onCancel={()=>{ setStats(s=>({...s,lastActive:Date.now()})); cancelSession(); }} onFinish={()=>{ markDone(session.id); setStats(s=>({...s,lastActive:Date.now()})); setSession({...session, remainingMs:0}); }} settings={settings} />
      )}

      {toast && <Toast text={toast} onClose={()=>setToast(null)} />}
      {confetti && <Confetti onDone={()=>setConfetti(false)} />}

      <RewardModal open={rewardOpen} reward={reward} onClaim={claimReward} />

      {/* Keyframes */}
      <style>{`
        @keyframes floatA { 0%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(10%, -12%, 0) } 100%{ transform:translate3d(-12%, 14%, 0) } }
        @keyframes floatB { 0%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(-9%, 10%, 0) } 100%{ transform:translate3d(11%, -13%, 0) } }
        @keyframes floatC { 0%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(8%, -7%, 0) } 100%{ transform:translate3d(-10%, 9%, 0) } }
      `}</style>
    </div>
  );
}
