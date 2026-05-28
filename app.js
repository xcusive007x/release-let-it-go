// Discord webhook (client-side). หากกังวลเรื่อง spam แนะนำย้ายไป server.
const WEBHOOK_URL = ENV.WEBHOOK_URL

const MAX_LEN = 4000;
const DRAFT_KEY = "release.draft.v1";

const QUOTES = [
  "ความรู้สึกทุกอย่าง สมควรมีที่ทาง",
  "ปล่อยมันออกมา เบาขึ้นแน่นอน",
  "เธอไม่ได้อยู่คนเดียวในความรู้สึกนี้",
  "บางครั้ง การได้พูดออกมา ก็คือคำตอบแล้ว",
  "วันนี้เก่งมากแล้ว ที่ยังอยู่ตรงนี้",
  "ใจที่หนัก จะค่อยๆ เบาเมื่อได้พัก",
];

const AFTER_MESSAGES = [
  "เก่งมากที่ปล่อยมันออกมา 🤍",
  "ใจที่หนัก จะค่อยๆ เบาลงนะ",
  "ได้ยินแล้วนะ ทุกคำของเธอ",
  "ขอบคุณที่ไว้ใจที่นี่ 🌸",
];

const $ = (id) => document.getElementById(id);
const form = $("form");
const textarea = $("text");
const counter = $("counter");
const submitBtn = $("submit");
const nicknameToggle = $("nickname-toggle");
const nicknameInput = $("nickname");
const afterEl = $("after");
const quoteEl = $("quote");
const toast = $("toast");

let status = "idle"; // idle | sending | released

// Random quote
quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// Load draft
try {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    if (typeof d.text === "string") textarea.value = d.text;
    if (typeof d.nickname === "string" && d.nickname) {
      nicknameInput.value = d.nickname;
      nicknameToggle.classList.add("hidden");
      nicknameInput.classList.remove("hidden");
    }
    updateCounter();
  }
} catch {}

// Auto-save draft (debounced)
let saveTimer;
function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        text: textarea.value, nickname: nicknameInput.value,
      }));
    } catch {}
  }, 300);
}

function updateCounter() {
  const n = textarea.value.length;
  const trimmed = textarea.value.trim().length > 0;
  const over = n > MAX_LEN;
  const near = n > MAX_LEN * 0.9;
  counter.firstChild.nodeValue = `${n} / ${MAX_LEN} `;
  counter.classList.toggle("over", over);
  counter.classList.toggle("near", near && !over);
  submitBtn.disabled = !trimmed || over || status !== "idle";
}

textarea.addEventListener("input", () => { updateCounter(); saveDraft(); });
nicknameInput.addEventListener("input", saveDraft);

nicknameToggle.addEventListener("click", () => {
  nicknameToggle.classList.add("hidden");
  nicknameInput.classList.remove("hidden");
  nicknameInput.focus();
});

textarea.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    form.requestSubmit();
  }
});

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2800);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = textarea.value.trim();
  if (!content || status !== "idle" || content.length > MAX_LEN) return;

  status = "sending";
  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังส่ง...";

  const nickname = nicknameInput.value.trim();
  const author = nickname || "anonymous";

  const embed = {
    author: { name: author },
    description: content,
    color: 0xff9ec3,
    timestamp: new Date().toISOString(),
    footer: { text: "release" },
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) throw new Error("webhook failed: " + res.status);

    const msg = AFTER_MESSAGES[Math.floor(Math.random() * AFTER_MESSAGES.length)];
    afterEl.textContent = msg;
    showToast("ปล่อยไปแล้ว · " + msg);
    status = "released";
    submitBtn.textContent = "ปล่อยแล้ว ✓";
    textarea.classList.add("released");

    try { localStorage.removeItem(DRAFT_KEY); } catch {}

    setTimeout(() => {
      textarea.classList.remove("released");
      textarea.value = "";
      afterEl.textContent = "ทุกคำที่เขียน จะถูกปล่อยไปอย่างเบาๆ";
      status = "idle";
      submitBtn.textContent = "ปล่อยมันไป";
      updateCounter();
    }, 1800);
  } catch (err) {
    console.error(err);
    showToast("ส่งไม่สำเร็จ ลองอีกครั้งนะ", true);
    status = "idle";
    submitBtn.textContent = "ปล่อยมันไป";
    updateCounter();
  }
});

updateCounter();
