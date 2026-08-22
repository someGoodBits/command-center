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
];

const WMO = {
  0: "CLEAR",
  1: "CLEAR",
  2: "CLOUD",
  3: "CLOUD",
  45: "FOG",
  48: "FOG",
  51: "DRIZZLE",
  53: "DRIZZLE",
  55: "DRIZZLE",
  61: "RAIN",
  63: "RAIN",
  65: "RAIN",
  71: "SNOW",
  73: "SNOW",
  75: "SNOW",
  80: "RAIN",
  81: "RAIN",
  82: "RAIN",
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
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function applyWeather(data) {
  if (!data) return;
  document.getElementById("wx-temp").textContent = `${Math.round(data.temp)}°`;
  document.getElementById("wx-cond").textContent = data.cond;
  document.getElementById("wx-high").textContent = Math.round(data.high);
  document.getElementById("wx-low").textContent = Math.round(data.low);
  document.getElementById("wx-hum").textContent = `${Math.round(data.hum)}`;
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

function renderTodos() {
  const root = document.getElementById("todos");
  const todos = getTodos().slice().sort((a, b) => Number(a.done) - Number(b.done));
  root.replaceChildren(
    ...todos.map((t) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `todo${t.done ? " is-done" : ""}`;
      btn.innerHTML = `<span class="todo-mark">${t.done ? "x" : "o"}</span><span class="todo-text"></span>`;
      btn.querySelector(".todo-text").textContent = t.text;
      btn.addEventListener("click", () => {
        setTodos(getTodos().map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
        renderTodos();
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

function renderStreaks() {
  const today = todayStr();
  const root = document.getElementById("streaks");
  root.replaceChildren(
    ...getStreaks().map((s) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `streak${s.lastDate === today ? " is-today" : ""}`;
      btn.innerHTML = `<span class="streak-label"></span><span class="streak-count"></span>`;
      btn.querySelector(".streak-label").textContent = s.label;
      btn.querySelector(".streak-count").textContent = String(s.count);
      btn.addEventListener("click", () => markStreak(s.id));
      li.append(btn);
      return li;
    })
  );
}

document.getElementById("todo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("todo-input");
  const text = input.value.trim();
  if (!text) return;
  setTodos([...getTodos(), { id: uid(), text, done: false }]);
  input.value = "";
  renderTodos();
});

document.getElementById("add-streak").addEventListener("click", () => {
  const label = prompt("STREAK NAME");
  if (!label || !label.trim()) return;
  setStreaks([
    ...getStreaks(),
    { id: uid(), label: label.trim().toUpperCase(), count: 0, lastDate: null },
  ]);
  renderStreaks();
});

renderClock();
setInterval(renderClock, 1000);
applyWeather(load(KEYS.weather, null));
fetchWeather();
setInterval(fetchWeather, 15 * 60 * 1000);
renderTodos();
renderStreaks();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
