const KEYS = {
  todos: "cc.todos",
  streaks: "cc.streaks",
  weather: "cc.weather",
};

const PLACE = { lat: 12.95, lon: 80.23 };
const WX_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lon}` +
  `&current=temperature_2m,relative_humidity_2m,weather_code` +
  `&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata`;

const DEFAULT_STREAKS = [
  { id: "music", label: "MUSIC", count: 0, lastDate: null },
  { id: "code", label: "CODE 1H", count: 0, lastDate: null },
  { id: "cook", label: "COOK", count: 0, lastDate: null },
  { id: "test", label: "Test", count: 0, lastDate: null },
];

const WMO = {
  0: "CLEAR",
  1: "CLEAR",
  2: "CLOUDY",
  3: "CLOUDY",
  45: "FOGY",
  48: "FOGY",
  51: "DRIZZLE",
  53: "DRIZZLE",
  55: "DRIZZLE",
  61: "RAINY",
  63: "RAINY",
  65: "RAINY",
  71: "SNOW",
  73: "SNOW",
  75: "SNOW",
  80: "RAINY",
  81: "RAINY",
  82: "RAINY",
  95: "STORM",
  96: "STORM",
  99: "STORM",
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayStr(d = new Date()) {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayStr(y);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderClock() {
  const now = new Date();
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  document.getElementById("date").textContent =
    `${days[now.getDay()]} ${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;
  document.getElementById("time").textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function applyWeather(data) {
  if (!data) return;
  document.getElementById("wx-temp").textContent = `${Math.round(data.temp)}°`;
  document.getElementById("wx-cond").textContent = data.cond;
}

async function fetchWeather() {
  try {
    const res = await fetch(WX_URL);
    if (!res.ok) throw new Error("wx");
    const json = await res.json();
    const data = {
      temp: json.current.temperature_2m,
      hum: json.current.relative_humidity_2m,
      cond: WMO[json.current.weather_code] || "—",
      high: json.daily.temperature_2m_max[0],
      low: json.daily.temperature_2m_min[0],
      at: Date.now(),
    };
    save(KEYS.weather, data);
    applyWeather(data);
  } catch {
    applyWeather(load(KEYS.weather, null));
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getTodos() {
  return load(KEYS.todos, []);
}

function setTodos(todos) {
  save(KEYS.todos, todos);
}

function addTodo(text) {
  const value = String(text || "").trim();
  if (!value) return { ok: false, error: "empty" };
  setTodos([...getTodos(), { id: uid(), text: value, done: false }]);
  renderTodos();
  return { ok: true, text: value };
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findTodo(text) {
  const q = String(text || "").trim().toLowerCase();
  const nq = norm(q);
  if (!q) return null;
  const todos = getTodos();
  return (
    todos.find((t) => t.text.toLowerCase() === q) ||
    todos.find((t) => t.text.toLowerCase().includes(q) || q.includes(t.text.toLowerCase())) ||
    todos.find((t) => {
      const n = norm(t.text);
      return n === nq || n.includes(nq) || nq.includes(n);
    }) ||
    null
  );
}

function completeTodo(text) {
  const hit = findTodo(text);
  if (!hit) return { ok: false, error: "not found" };
  setTodos(getTodos().map((x) => (x.id === hit.id ? { ...x, done: true } : x)));
  renderTodos();
  return { ok: true, text: hit.text };
}

function deleteTodo(text) {
  const hit = findTodo(text);
  if (!hit) return { ok: false, error: "not found" };
  setTodos(getTodos().filter((x) => x.id !== hit.id));
  renderTodos();
  return { ok: true, text: hit.text };
}

function toggleTodo(id) {
  setTodos(getTodos().map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  renderTodos();
}

function renderTodos() {
  const root = document.getElementById("todos");
  const todos = getTodos().slice().sort((a, b) => Number(a.done) - Number(b.done));
  root.replaceChildren(
    ...todos.map((t) => {
      const li = document.createElement("li");
      const btn = document.createElement("div");    
      btn.className = `todo${t.done ? " is-done" : ""}`;
      btn.innerHTML = `<span class="todo-mark">${t.done ? "[x]" : "[ ]"}</span><span class="todo-text"></span>`;
      btn.querySelector(".todo-text").textContent = t.text;
      btn.addEventListener("click", () => {
        toggleTodo(t.id);
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        setTodos(getTodos().filter((x) => x.id !== t.id));
        renderTodos();
      });
      li.append(btn);
      return li;
    })
  );
}

function getStreaks() {
  const stored = load(KEYS.streaks, null);
  if (!stored) {
    save(KEYS.streaks, DEFAULT_STREAKS);
    return DEFAULT_STREAKS;
  }
  return stored;
}

function setStreaks(streaks) {
  save(KEYS.streaks, streaks);
}

function findStreak(name) {
  const q = norm(name);
  if (!q) return null;
  const streaks = getStreaks();
  return (
    streaks.find((s) => norm(s.label) === q) ||
    streaks.find((s) => {
      const n = norm(s.label);
      return n.includes(q) || q.includes(n);
    }) ||
    null
  );
}

function applyStreak(id, wantToday) {
  const today = todayStr();
  const yday = yesterdayStr();
  setStreaks(
    getStreaks().map((s) => {
      if (s.id !== id) return s;
      const isToday = s.lastDate === today;
      if (wantToday === isToday) return s;
      if (wantToday) {
        if (s.lastDate === yday) return { ...s, lastDate: today, count: s.count + 1 };
        return { ...s, lastDate: today, count: 1 };
      }
      return { ...s, lastDate: null, count: Math.max(0, s.count - 1) };
    })
  );
  renderStreaks();
}

function markStreak(id) {
  const today = todayStr();
  const yday = yesterdayStr();
  setStreaks(
    getStreaks().map((s) => {
      if (s.id !== id) return s;
      if (s.lastDate === today) {
        return { ...s, lastDate: null, count: Math.max(0, s.count - 1) };
      }
      if (s.lastDate === yday) {
        return { ...s, lastDate: today, count: s.count + 1 };
      }
      return { ...s, lastDate: today, count: 1 };
    })
  );
  renderStreaks();
}

function markStreakByName(name) {
  const hit = findStreak(name);
  if (!hit) return { ok: false, error: "not found" };
  applyStreak(hit.id, true);
  return { ok: true, name: hit.label };
}

function unmarkStreakByName(name) {
  const hit = findStreak(name);
  if (!hit) return { ok: false, error: "not found" };
  applyStreak(hit.id, false);
  return { ok: true, name: hit.label };
}

function renderStreaks() {
  const today = todayStr();
  const root = document.getElementById("streaks");
  root.replaceChildren(
    ...getStreaks().map((s) => {
      const li = document.createElement("div");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `streak${s.lastDate === today ? " is-today" : ""}`;
      btn.innerHTML = `<span class="streak-count"></span><span class="streak-label"></span>`;
      btn.querySelector(".streak-count").textContent = String(s.count);
      btn.querySelector(".streak-label").textContent = s.label;
      btn.addEventListener("click", () => {
        markStreak(s.id);
      });
      li.append(btn);
      return li;
    })
  );
}

function executeCall(call) {
  const args = call.arguments || {};
  switch (call.name) {
    case "add_todo":
      return addTodo(args.text);
    case "complete_todo":
      return completeTodo(args.text);
    case "delete_todo":
      return deleteTodo(args.text);
    case "mark_streak":
      return markStreakByName(args.name);
    case "unmark_streak":
      return unmarkStreakByName(args.name);
    default:
      return { ok: false, error: "unknown tool" };
  }
}

let needleEngine = null;
let needleBusy = false;

function formatCall(call) {
  const args = call.arguments || {};
  const bits = Object.values(args).filter((v) => v != null && v !== "");
  return [call.name, ...bits].join("  ");
}

function formatResult(result) {
  if (!result) return "";
  if (result.ok === false) return result.error || "failed";
  if (result.text) return result.text;
  if (result.name) return result.name;
  return "ok";
}

function formatConfidence(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return `CONF  ${value.toFixed(2)}`;
}

function showLastAction({ reasoning, output, confidence }) {
  document.getElementById("last-reason").textContent = reasoning || "—";
  const conf = formatConfidence(confidence);
  const out = output || "—";
  document.getElementById("last-output").textContent = conf ? `${out}    ${conf}` : out;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

async function runCommand(text) {
  const query = String(text || "").trim();
  if (!query || needleBusy) return;
  if (!needleEngine) {
    setNeedleStatus("NEEDLE  NOT READY");
    return;
  }
  needleBusy = true;
  setNeedleStatus("NEEDLE  WORKING");
  try {
    needleEngine.init();
    needleEngine.reset();
    let response = needleEngine.complete(query);
    const reasoning = response.reasoning || "";
    let confidence = response.confidence;
    const lines = [];
    for (let step = 0; step < 8; step++) {
      const calls = response.function_calls || [];
      if (response.type === "respond" || !calls.length) break;
      const results = calls.map(executeCall);
      calls.forEach((call, i) => {
        const out = formatResult(results[i]);
        lines.push(out ? `${formatCall(call)}  ${out}` : formatCall(call));
      });
      const payload = results.length === 1 ? results[0] : results;
      response = needleEngine.complete(JSON.stringify(payload));
      if (typeof response.confidence === "number") confidence = response.confidence;
    }
    showLastAction({
      reasoning,
      output: lines.length ? lines.join("  ·  ") : "no action",
      confidence,
    });
    setNeedleStatus("NEEDLE  READY");
  } catch (err) {
    console.error(err);
    const msg = err && err.message ? err.message : String(err);
    showLastAction({ reasoning: "", output: "error", confidence: null });
    setNeedleStatus("NEEDLE  FAILED  " + msg);
  } finally {
    needleBusy = false;
  }
}

const overlay = document.getElementById("cmd-overlay");
const overlayForm = document.getElementById("overlay-form");
const overlayCmd = document.getElementById("overlay-cmd");
const overlayWait = document.getElementById("overlay-wait");
const overlayLabel = document.getElementById("overlay-label");

let overlaySubmit = null;

function fitOverlayCmd() {
  overlayCmd.style.height = "auto";
  overlayCmd.style.height = `${overlayCmd.scrollHeight}px`;
}

function openInput(label, onSubmit) {
  overlaySubmit = onSubmit;
  overlayLabel.textContent = label;
  overlayCmd.setAttribute("aria-label", label);
  overlayWait.hidden = true;
  overlayForm.hidden = false;
  overlay.classList.remove("is-wait");
  overlay.hidden = false;
  overlayCmd.value = "";
  overlayCmd.readOnly = false;
  overlayCmd.style.height = "auto";
  requestAnimationFrame(() => {
    overlayCmd.focus();
    fitOverlayCmd();
  });
}

function closeInput() {
  overlayCmd.blur();
  overlayCmd.value = "";
  overlayCmd.readOnly = false;
  overlayCmd.style.height = "auto";
  overlay.classList.remove("is-wait");
  overlayWait.hidden = true;
  overlayForm.hidden = false;
  overlay.hidden = true;
  overlaySubmit = null;
}

async function submitOverlay() {
  const text = overlayCmd.value.trim();
  const onSubmit = overlaySubmit;
  overlayCmd.blur();
  overlayCmd.readOnly = true;
  if (!text || !onSubmit) {
    closeInput();
    return;
  }
  overlayForm.hidden = true;
  overlayWait.hidden = false;
  overlay.classList.add("is-wait");
  overlay.hidden = false;
  await waitFrame();
  await wait(700);
  await onSubmit(text);
  closeInput();
}

function addStreak(label) {
  const name = String(label || "").trim().toUpperCase();
  if (!name) return;
  setStreaks([
    ...getStreaks(),
    { id: uid(), label: name, count: 0, lastDate: null },
  ]);
  renderStreaks();
}

document.getElementById("open-cmd").addEventListener("click", () => {
  openInput("COMMAND", runCommand);
});

document.getElementById("open-task").addEventListener("click", () => {
  openInput("ADD TASK", (text) => addTodo(text));
});

document.getElementById("open-streak").addEventListener("click", () => {
  openInput("ADD STREAK", (text) => addStreak(text));
});

overlayForm.addEventListener("submit", (e) => {
  e.preventDefault();
  submitOverlay();
});

overlayCmd.addEventListener("input", fitOverlayCmd);

overlayCmd.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitOverlay();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden && !overlay.classList.contains("is-wait")) {
    closeInput();
  }
});

document.getElementById("reload").addEventListener("click", async () => {
  try {
    const regs = (navigator.serviceWorker && (await navigator.serviceWorker.getRegistrations())) || [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (window.caches && (await caches.keys())) || [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* still reload */
  }
  const url = new URL(location.href);
  url.searchParams.set("r", String(Date.now()));
  location.replace(url.toString());
});

renderClock();
setInterval(renderClock, 1000);
applyWeather(load(KEYS.weather, null));
fetchWeather();
setInterval(fetchWeather, 15 * 60 * 1000);
renderTodos();
renderStreaks();

function setNeedleStatus(text) {
  const el = document.getElementById("needle-status");
  if (el) el.textContent = text;
}

createNeedleEngine((stage) => {
  setNeedleStatus("NEEDLE  " + stage);
})
  .then((engine) => {
    needleEngine = engine;
    setNeedleStatus("NEEDLE  READY");
  })
  .catch((err) => {
    console.error(err);
    const msg = err && err.message ? err.message : String(err);
    setNeedleStatus("NEEDLE  FAILED  " + msg);
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
