// =====================
// Romantic Office Escape — FULL game.js (corrected: no more freeze after hug/highfive)
// =====================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// HUD + Modal
const hintEl = document.getElementById("hint");
const modal = document.getElementById("modal");
const backdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalPrimary = document.getElementById("modalPrimary");
const modalSecondary = document.getElementById("modalSecondary");
const modalActions = document.getElementById("modalActions");
const modalInputRow = document.getElementById("modalInputRow");
const modalInput = document.getElementById("modalInput");

// Polaroids
const polaroidsEl = document.getElementById("polaroids");

// Valentine overlay
const overlayEl = document.getElementById("valentineOverlay");
const videoEl = document.getElementById("valentineVideo");
const valCloseBtn = document.getElementById("valCloseBtn");

// Credits overlay
const creditsOverlay = document.getElementById("creditsOverlay");
const creditsRoll = document.getElementById("creditsRoll");

// Force overlays hidden on start
overlayEl?.classList.remove("is-open");
overlayEl?.setAttribute("aria-hidden", "true");
creditsOverlay?.classList.remove("is-open");
creditsOverlay?.setAttribute("aria-hidden", "true");

// Optional: show runtime errors on screen instead of “silent freeze”
window.addEventListener("error", (e) => {
  try {
    console.error(e.error || e.message);
    hintEl.textContent = "Runtime error occurred — check DevTools Console.";
  } catch {}
});

// ----------------- Utils -----------------
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function rectsOverlap(a, b) {
  return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}
function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function normalizeDate(s) {
  const t = String(s || "").trim();
  const m = t.match(/(\d{1,2})\D+(\d{1,2})/);
  if (!m) return "";
  const dd = String(parseInt(m[1], 10)).padStart(2, "0");
  const mm = String(parseInt(m[2], 10)).padStart(2, "0");
  return `${dd}/${mm}`;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return t * t * (3 - 2 * t); }

// ----------------- Modal -----------------
let isModalOpen = false;
let modalResolve = null;
let modalMode = "normal"; // normal | valentine | actions
let actionButtons = [];

// Bulletproof cleanup: remove any dynamically-added buttons from modalActions
function clearActionButtons() {
  const keepIds = new Set(["modalPrimary", "modalSecondary"]);
  const buttons = modalActions.querySelectorAll("button");
  buttons.forEach(btn => {
    if (!keepIds.has(btn.id)) btn.remove();
  });
  actionButtons = [];
}

function openModal({ title, body, input = false, primaryText = "OK", secondaryText = null, placeholder = "Type here..." }) {
  modalMode = "normal";
  isModalOpen = true;

  clearActionButtons();

  modalTitle.textContent = title || "";
  modalBody.textContent = body || "";

  modalPrimary.textContent = primaryText || "OK";

  // reset NO button styling
  modalSecondary.classList.remove("no-btn");
  modalSecondary.style.left = "";
  modalSecondary.style.top = "";
  modalSecondary.style.right = "";

  // show/hide secondary
  if (secondaryText) {
    modalSecondary.textContent = secondaryText;
    modalSecondary.classList.remove("hidden");
  } else {
    modalSecondary.classList.add("hidden");
  }

  // input row
  if (input) {
    modalInputRow.classList.remove("hidden");
    modalInput.value = "";
    modalInput.placeholder = placeholder;
    setTimeout(() => modalInput.focus(), 0);
  } else {
    modalInputRow.classList.add("hidden");
  }

  // ensure default buttons visible
  modalPrimary.classList.remove("hidden");

  modal.classList.remove("hidden");
  backdrop.classList.remove("hidden");

  return new Promise((resolve) => { modalResolve = resolve; });
}

function openActionsModal({ title, body, actions }) {
  modalMode = "actions";
  isModalOpen = true;

  clearActionButtons();

  modalTitle.textContent = title || "";
  modalBody.textContent = body || "";

  // hide default primary/secondary + input; inject custom buttons
  modalPrimary.classList.add("hidden");
  modalSecondary.classList.add("hidden");
  modalInputRow.classList.add("hidden");

  actions.forEach((a) => {
    const btn = document.createElement("button");
    btn.textContent = a.label;
    if (a.kind === "primary") {
      btn.style.background = "linear-gradient(90deg,#ff5fa2,#7c5cff)";
      btn.style.color = "white";
    } else {
      btn.style.background = "rgba(0,0,0,0.10)";
    }
    btn.addEventListener("click", () => closeModal(a.id));
    modalActions.appendChild(btn);
    actionButtons.push(btn);
  });

  modal.classList.remove("hidden");
  backdrop.classList.remove("hidden");

  return new Promise((resolve) => { modalResolve = resolve; });
}

// CRITICAL: safe close — unfreezes input even if something throws later
function closeModal(result) {
  // unstick flags first
  isModalOpen = false;
  modalMode = "normal";

  // hide ui
  modal.classList.add("hidden");
  backdrop.classList.add("hidden");

  // cleanup injected buttons
  clearActionButtons();

  // restore defaults
  modalPrimary.classList.remove("hidden");
  modalInputRow.classList.add("hidden");
  modalSecondary.classList.add("hidden");

  // reset NO button dodge styling
  modalSecondary.classList.remove("no-btn");
  modalSecondary.style.left = "";
  modalSecondary.style.top = "";
  modalSecondary.style.right = "";

  // resolve promise safely
  const r = modalResolve;
  modalResolve = null;
  try { r?.(result); } catch {}
}

modalPrimary.addEventListener("click", () => {
  if (!isModalOpen) return;

  if (modalMode === "normal") {
    const result = modalInputRow.classList.contains("hidden") ? true : modalInput.value.trim();
    closeModal(result);
  } else if (modalMode === "valentine") {
    closeModal("yes");
  }
});

modalSecondary.addEventListener("click", (e) => {
  if (!isModalOpen) return;

  if (modalMode === "normal") {
    closeModal(null);
  } else if (modalMode === "valentine") {
    e.preventDefault();
    e.stopPropagation();
    dodgeNoButton();
  }
});

window.addEventListener("keydown", (e) => {
  if (!isModalOpen) return;
  if (e.key === "Escape") closeModal(null);
  if (e.key === "Enter" && modalMode !== "actions") modalPrimary.click();
});

// ----------------- Video overlay controls -----------------
if (valCloseBtn) {
  valCloseBtn.addEventListener("click", () => {
    if (videoEl) videoEl.pause();
    overlayEl?.classList.remove("is-open");
    overlayEl?.setAttribute("aria-hidden", "true");
  });
}

function playValentineVideo() {
  if (!overlayEl || !videoEl) return;

  overlayEl.classList.add("is-open");
  overlayEl.setAttribute("aria-hidden", "false");

  videoEl.currentTime = 0;
  videoEl.play().catch(() => {});
}

// Credits
function openCredits() {
  if (!creditsOverlay) return;
  creditsOverlay.classList.add("is-open");
  creditsOverlay.setAttribute("aria-hidden", "false");

  if (creditsRoll) {
    creditsRoll.style.animation = "none";
    void creditsRoll.offsetHeight;
    creditsRoll.style.animation = "";
  }
}

function closeCredits() {
  creditsOverlay?.classList.remove("is-open");
  creditsOverlay?.setAttribute("aria-hidden", "true");
}

creditsOverlay?.addEventListener("click", closeCredits);
videoEl?.addEventListener("ended", () => openCredits());

// ----------------- Drawing helpers -----------------
function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawGlowCircle(x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(255, 95, 162, 0.45)");
  g.addColorStop(0.55, "rgba(124, 92, 255, 0.18)");
  g.addColorStop(1, "rgba(255, 95, 162, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawNameTag(name, x, y) {
  ctx.save();
  ctx.font = "13px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padX = 10;
  const w = ctx.measureText(name).width + padX * 2;
  const h = 22;
  roundRect(x - w / 2, y - h / 2, w, h, 10, "rgba(255,255,255,0.85)", "rgba(11,18,32,0.10)");
  ctx.fillStyle = "rgba(11,18,32,0.82)";
  ctx.fillText(name, x, y);
  ctx.restore();
}

function drawSpeechBubble(text, x, y) {
  ctx.save();
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padding = 10;
  const w = ctx.measureText(text).width + padding * 2;
  const h = 26;
  roundRect(x - w / 2, y - h - 16, w, h, 12, "rgba(255,255,255,0.92)", "rgba(0,0,0,0.15)");
  ctx.fillStyle = "rgba(11,18,32,0.80)";
  ctx.fillText(text, x, y - h - 3);
  ctx.restore();
}

function drawFaceSimple(x, y, w, h, mood = "calm", isPlayer = false) {
  const fx = x + w * 0.18;
  const fy = y + h * 0.20;
  const fw = w * 0.64;
  const fh = h * 0.48;

  ctx.fillStyle = isPlayer ? "rgba(255, 230, 220, 0.95)" : "rgba(245, 230, 215, 0.95)";
  roundRect(fx, fy, fw, fh, 8, ctx.fillStyle, "rgba(11,18,32,0.10)");

  const eyeY = fy + fh * 0.38;
  const leftEyeX = fx + fw * 0.30;
  const rightEyeX = fx + fw * 0.70;

  function drawEye(ex, ey, type) {
    ctx.strokeStyle = "rgba(11,18,32,0.70)";
    ctx.lineWidth = 2;

    if (type === "dot") {
      ctx.fillStyle = "rgba(11,18,32,0.75)";
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (type === "wide") {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(11,18,32,0.45)";
      ctx.stroke();

      ctx.fillStyle = "rgba(11,18,32,0.75)";
      ctx.beginPath();
      ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (type === "squint") {
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey);
      ctx.lineTo(ex + 4, ey);
      ctx.stroke();
      return;
    }
  }

  const mouthX = fx + fw * 0.50;
  const mouthY = fy + fh * 0.72;

  function drawMouth(type) {
    ctx.strokeStyle = "rgba(11,18,32,0.65)";
    ctx.lineWidth = 2;
    if (type === "smile") {
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, 6, 0, Math.PI, false);
      ctx.stroke();
      return;
    }
    if (type === "line") {
      ctx.beginPath();
      ctx.moveTo(mouthX - 6, mouthY);
      ctx.lineTo(mouthX + 6, mouthY);
      ctx.stroke();
      return;
    }
    if (type === "grimace") {
      ctx.beginPath();
      ctx.moveTo(mouthX - 6, mouthY);
      ctx.lineTo(mouthX + 6, mouthY);
      ctx.stroke();
      ctx.strokeStyle = "rgba(11,18,32,0.25)";
      ctx.beginPath();
      ctx.moveTo(mouthX - 4, mouthY - 2);
      ctx.lineTo(mouthX - 4, mouthY + 2);
      ctx.moveTo(mouthX, mouthY - 2);
      ctx.lineTo(mouthX, mouthY + 2);
      ctx.moveTo(mouthX + 4, mouthY - 2);
      ctx.lineTo(mouthX + 4, mouthY + 2);
      ctx.stroke();
      return;
    }
  }

  if (mood === "calm") {
    drawEye(leftEyeX, eyeY, "dot");
    drawEye(rightEyeX, eyeY, "dot");
    drawMouth("smile");
  } else if (mood === "excited") {
    drawEye(leftEyeX, eyeY, "wide");
    drawEye(rightEyeX, eyeY, "wide");
    drawMouth("smile");
  } else if (mood === "nervous") {
    drawEye(leftEyeX, eyeY, "wide");
    drawEye(rightEyeX, eyeY, "wide");
    drawMouth("grimace");
  } else if (mood === "holding") {
    drawEye(leftEyeX, eyeY, "squint");
    drawEye(rightEyeX, eyeY, "squint");
    drawMouth("line");
  } else {
    drawEye(leftEyeX, eyeY, "dot");
    drawEye(rightEyeX, eyeY, "dot");
    drawMouth("line");
  }
}

// ----------------- Room & collisions -----------------
const room = {
  w: canvas.width,
  h: canvas.height,
  walls: [
    { x: 0, y: 0, w: canvas.width, h: 18 },
    { x: 0, y: canvas.height - 18, w: canvas.width, h: 18 },
    { x: 0, y: 0, w: 18, h: canvas.height },
    { x: canvas.width - 18, y: 0, w: 18, h: canvas.height },

    { x: 250, y: 190, w: 460, h: 160 },
    { x: 70, y: 70, w: 260, h: 60 },
    { x: 630, y: 70, w: 260, h: 60 },
  ],
};

// ----------------- Game state -----------------
const state = {
  keysDown: new Set(),
  // 0=need talk, 1=clock, 2=bike, 3=sun, 4=return boy, 5=done
  step: 0,
  flags: {
    introDone: false,
    clockFixed: false,
    bikeSolved: false,
    sunSolved: false,
    valentineAsked: false,
    hugged: false,
    highFived: false,
    breatheLineShown: false,
  },
  clock: {
    wrongTime: { h: 10, m: 10 },
    correctTime: { h: 18, m: 5 },
    isCorrect: false,
  },
  sun: { t: 0 }, // 0 bright -> 1 sunset
};

// ----------------- Entities -----------------
const player = { x: 740, y: 380, w: 34, h: 34, speed: 2.6, bounce: 0 }; // jheelz
const npcBoy = { x: 120, y: 360, w: 34, h: 34, interactRadius: 78 }; // ninuli

const objects = {
  clock:   { x: 465, y: 48,  w: 50, h: 50, glowRadius: 92 },
  bike:    { x: 120, y: 210, w: 110, h: 52, glowRadius: 120 },
  sunSpot: { x: 820, y: 60,  w: 50, h: 50, glowRadius: 100 },
};

// ----------------- Feature states -----------------
let inspection = null; // { type: "clock"|"bike"|"sun" }

// Interaction animation
let interactionEffect = null; // { type:"hug"|"highfive", t:number, didBurst:boolean }
let renderOffsets = { ninuli: { x: 0, y: 0 }, jheelz: { x: 0, y: 0 } };
let sparkBursts = []; // {x,y,vx,vy,life}

let fartEffect = null; // { x,y,timer,text }
let hearts = []; // emote particles
let shutterFlash = 0;

// roses
let petals = [];
let petalsOn = false;

// fireworks
let fireworks = []; // array of particle arrays
let fireworksActive = false;

// ----------------- Input -----------------
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  // Inspection controls
  if (inspection && !isModalOpen) {
    if (key === "escape") { inspection = null; return; }
    if (key === "enter") {
      const t = inspection.type;
      inspection = null;
      if (t === "clock") interactClock();
      if (t === "bike") interactBike();
      if (t === "sun") interactSun();
      return;
    }
  }

  if (isModalOpen) return;

  if (key === "p") triggerFart();
  if (key === "f") triggerEmote();

  if (["arrowup","arrowdown","arrowleft","arrowright"].includes(key)) e.preventDefault();
  state.keysDown.add(key);
});

window.addEventListener("keyup", (e) => state.keysDown.delete(e.key.toLowerCase()));

// ----------------- Proximity helpers -----------------
function playerCenter() { return { x: player.x + player.w / 2, y: player.y + player.h / 2 }; }
function nearRectGlow(rect, radius) {
  const p = playerCenter();
  const c = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  return dist(p.x, p.y, c.x, c.y) <= radius;
}
function getNearbyInteractable() {
  const p = playerCenter();
  const b = { x: npcBoy.x + npcBoy.w / 2, y: npcBoy.y + npcBoy.h / 2 };

  if (dist(p.x, p.y, b.x, b.y) <= npcBoy.interactRadius) return { type: "boy" };

  if (state.step >= 1 && !state.flags.clockFixed && nearRectGlow(objects.clock, objects.clock.glowRadius)) return { type: "clock" };
  if (state.step >= 2 && !state.flags.bikeSolved && nearRectGlow(objects.bike, objects.bike.glowRadius)) return { type: "bike" };
  if (state.step >= 3 && !state.flags.sunSolved && nearRectGlow(objects.sunSpot, objects.sunSpot.glowRadius)) return { type: "sun" };

  return null;
}

// ----------------- Sun progression -----------------
function updateSunProgress() {
  if (!state.flags.bikeSolved) { state.sun.t = 0; return; }
  if (state.flags.bikeSolved && !state.flags.sunSolved) { state.sun.t = clamp(state.sun.t + 0.0016, 0, 1); return; }
  state.sun.t = clamp(state.sun.t, 0, 1);
}

// ----------------- Valentine: dodging NO -----------------
function dodgeNoButton() {
  const maxX = Math.max(0, modalActions.clientWidth - modalSecondary.clientWidth - 8);
  const maxY = Math.max(0, modalActions.clientHeight - modalSecondary.clientHeight - 4);
  modalSecondary.style.left = `${Math.random() * maxX}px`;
  modalSecondary.style.top = `${Math.random() * maxY}px`;
  modalSecondary.style.right = "auto";
}

async function openValentinePrompt() {
  modalMode = "valentine";
  isModalOpen = true;

  clearActionButtons();

  modalTitle.textContent = "ninuli";
  modalBody.textContent =
    "Okay breathe… don’t mess up.\n\n" +
    "You did it.\n\n" +
    "Will you be my Valentine?";

  modalInputRow.classList.add("hidden");

  modalPrimary.textContent = "Yes 💖";
  modalPrimary.classList.remove("hidden");

  modalSecondary.textContent = "No";
  modalSecondary.classList.remove("hidden");
  modalSecondary.classList.add("no-btn");

  modal.classList.remove("hidden");
  backdrop.classList.remove("hidden");

  modalSecondary.style.right = "120px";
  modalSecondary.style.left = "";
  modalSecondary.style.top = "0px";

  const onEnter = () => dodgeNoButton();
  modalSecondary.addEventListener("mouseenter", onEnter);

  const result = await new Promise((resolve) => { modalResolve = resolve; });

  modalSecondary.removeEventListener("mouseenter", onEnter);
  return result;
}

// ----------------- Pixel roses from sides -----------------
function startPixelRoseSides() {
  petalsOn = true;
  petals = [];
  for (let i = 0; i < 140; i++) spawnPetal();
}

function spawnPetal() {
  const fromLeft = Math.random() < 0.5;
  const y = Math.random() * canvas.height;
  const x = fromLeft ? -30 : canvas.width + 30;
  const vx = fromLeft ? (1.3 + Math.random() * 2.8) : -(1.3 + Math.random() * 2.8);
  const vy = (Math.random() - 0.5) * 1.3;

  petals.push({
    x, y, vx, vy,
    s: 3 + Math.floor(Math.random() * 4),
    rot: Math.floor(Math.random() * 4),
    spin: Math.random() < 0.5 ? -1 : 1,
    life: 260 + Math.floor(Math.random() * 220),
    seed: Math.random() * 9999
  });
}

function updatePetals() {
  if (!petalsOn) return;

  if (petals.length < 240) {
    for (let i = 0; i < 2; i++) spawnPetal();
  }

  for (const p of petals) {
    p.x += p.vx;
    p.y += p.vy + Math.sin((p.x + p.seed) / 40) * 0.25;
    if (Math.random() < 0.03) p.rot = (p.rot + p.spin + 4) % 4;
    p.life -= 1;
  }

  petals = petals.filter(p =>
    p.life > 0 &&
    p.x > -160 && p.x < canvas.width + 160 &&
    p.y > -160 && p.y < canvas.height + 160
  );
}

function drawPixelRose(x, y, scale, rot90) {
  const sprite = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,2,2,1,1,0],
    [1,1,2,2,2,2,1,1],
    [1,2,2,2,2,2,2,1],
    [1,1,2,2,2,2,1,1],
    [0,1,1,2,2,1,1,0],
    [0,0,3,3,3,3,0,0],
    [0,0,0,3,3,0,0,0],
  ];
  const n = 8;

  function sample(i, j) {
    if (rot90 === 0) return sprite[i][j];
    if (rot90 === 1) return sprite[n - 1 - j][i];
    if (rot90 === 2) return sprite[n - 1 - i][n - 1 - j];
    return sprite[j][n - 1 - i];
  }

  ctx.save();
  ctx.translate(x, y);

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const v = sample(i, j);
      if (!v) continue;

      if (v === 1) ctx.fillStyle = "rgba(255, 70, 140, 0.95)";
      if (v === 2) ctx.fillStyle = "rgba(255, 200, 220, 0.92)";
      if (v === 3) ctx.fillStyle = "rgba(124, 92, 255, 0.70)";

      ctx.fillRect(j * scale, i * scale, scale, scale);
    }
  }
  ctx.restore();
}

function drawPetals() {
  if (!petalsOn) return;
  for (const p of petals) drawPixelRose(p.x, p.y, p.s, p.rot);
}

// ----------------- Fireworks -----------------
function spawnFirework() {
  const x = 60 + Math.random() * (canvas.width - 120);
  const y = 36 + Math.random() * 90;

  const colors = ["#ff5fa2", "#7c5cff", "#ffcc00", "#00d4ff", "#ff884d", "#8cff7a"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const particles = [];
  for (let i = 0; i < 26; i++) {
    const ang = (Math.PI * 2 * i) / 26;
    const sp = 1.4 + Math.random() * 2.4;
    particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 70, color });
  }
  fireworks.push(particles);
}

function updateFireworks() {
  if (!fireworksActive) return;
  if (Math.random() < 0.035) spawnFirework();

  fireworks.forEach(group => {
    group.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;
    });
  });

  fireworks = fireworks.filter(group => group.some(p => p.life > 0));
}

function drawFireworksInWindow() {
  if (!fireworksActive) return;

  const winX = 30, winY = 28, winW = canvas.width - 60, winH = 105;
  ctx.save();
  ctx.beginPath();
  ctx.rect(winX, winY, winW, winH);
  ctx.clip();

  fireworks.forEach(group => {
    group.forEach(p => {
      if (p.life <= 0) return;
      ctx.globalAlpha = Math.max(0, p.life / 70);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
  });

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ----------------- Emotes (F key) -----------------
function triggerEmote() {
  player.bounce = 14;
  const cx = player.x + player.w / 2;
  const cy = player.y + 2;

  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.9 + Math.random() * 1.6;
    hearts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 40 + Math.floor(Math.random() * 25) });
  }
}

function updateHearts() {
  hearts.forEach(h => {
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.03;
    h.life--;
  });
  hearts = hearts.filter(h => h.life > 0);
  if (player.bounce > 0) player.bounce -= 1;
}

function drawHearts() {
  for (const h of hearts) {
    ctx.globalAlpha = Math.max(0, h.life / 60);
    ctx.fillStyle = "rgba(255, 95, 162, 0.95)";
    ctx.fillRect(h.x, h.y, 3, 3);
    ctx.fillStyle = "rgba(124, 92, 255, 0.70)";
    ctx.fillRect(h.x + 3, h.y + 2, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawSparks() {
  for (const s of sparkBursts) {
    ctx.globalAlpha = Math.max(0, s.life / 40);
    ctx.fillStyle = "rgba(255, 220, 120, 0.95)";
    ctx.fillRect(s.x, s.y, 3, 3);
    ctx.fillStyle = "rgba(124, 92, 255, 0.65)";
    ctx.fillRect(s.x + 3, s.y + 1, 2, 2);
  }
  ctx.globalAlpha = 1;
}

// ----------------- Fart (P key) -----------------
function triggerFart() {
  if (fartEffect) return;
  const responses = [
    "Ayy,Padrya!",
  ];
  fartEffect = { x: player.x + player.w / 2, y: player.y + player.h, timer: 90, text: responses[Math.floor(Math.random() * responses.length)] };
}

function updateFart() {
  if (!fartEffect) return;
  fartEffect.timer--;
  if (fartEffect.timer <= 0) fartEffect = null;
}

function drawFart() {
  if (!fartEffect) return;
  const { x, y } = fartEffect;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(120, 200, 120, 0.8)";
  ctx.beginPath();
  ctx.arc(x - 8, y + 6, 10, 0, Math.PI * 2);
  ctx.arc(x + 5, y + 8, 8, 0, Math.PI * 2);
  ctx.arc(x - 2, y + 2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSpeechBubble(
    fartEffect.text,
    npcBoy.x + npcBoy.w / 2 + renderOffsets.ninuli.x,
    npcBoy.y - 30 + renderOffsets.ninuli.y
  );
}

// ----------------- Snapshot (Polaroid) -----------------
function doSnapshot(label) {
  shutterFlash = 18;
  setTimeout(() => {
    try {
      const url = canvas.toDataURL("image/png");
      const card = document.createElement("div");
      card.className = "polaroid";

      const img = document.createElement("img");
      img.src = url;

      const cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = label;

      card.appendChild(img);
      card.appendChild(cap);

      polaroidsEl?.prepend(card);
    } catch {}
  }, 30);
}

function updateShutter() {
  if (shutterFlash > 0) shutterFlash -= 1;
}

// ----------------- Inspection UI -----------------
function drawInspectionUI() {
  if (!inspection) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelW = 520;
  const panelH = 320;
  const px = canvas.width / 2 - panelW / 2;
  const py = canvas.height / 2 - panelH / 2;

  roundRect(px, py, panelW, panelH, 18, "rgba(255,255,255,0.95)", "rgba(0,0,0,0.16)");

  ctx.fillStyle = "rgba(11,18,32,0.85)";
  ctx.textAlign = "center";

  let title = "";
  let desc = "";
  let badge = "";

  if (inspection.type === "clock") {
    title = "Wall Clock";
    desc = "The time feels wrong.\n\nMaybe the right date becomes the right time.";
    badge = "Clue: Anniversary date (DD/MM)";
  } else if (inspection.type === "bike") {
    title = "Bike";
    desc = "A number plate.\n\nIt looks like it wants a specific number.";
    badge = "Clue: Bike number";
  } else if (inspection.type === "sun") {
    title = "Sunset";
    desc = "The sun is always there…\nBut now it’s setting.\n\nIt reminds you of a place.";
    badge = "Clue: First unofficial date (sunset)";
  }

  ctx.font = "18px system-ui";
  ctx.fillText(title, canvas.width / 2, py + 48);

  ctx.fillStyle = "rgba(255, 95, 162, 0.10)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, py + 120, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(124, 92, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2 + 10, py + 114, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "14px system-ui";
  const lines = desc.split("\n");
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, py + 190 + i * 20));

  roundRect(px + 20, py + panelH - 64, panelW - 40, 42, 14, "rgba(245,247,255,1)", "rgba(0,0,0,0.08)");
  ctx.fillStyle = "rgba(11,18,32,0.70)";
  ctx.font = "13px system-ui";
  ctx.fillText(badge, canvas.width / 2, py + panelH - 43);

  ctx.fillStyle = "rgba(11,18,32,0.55)";
  ctx.font = "12px system-ui";
  ctx.fillText("ENTER: Interact    ESC: Back", canvas.width / 2, py + panelH - 14);

  ctx.restore();
}

// ----------------- Movement -----------------
function movePlayer() {
  let dx = 0, dy = 0;
  if (state.keysDown.has("w") || state.keysDown.has("arrowup")) dy -= 1;
  if (state.keysDown.has("s") || state.keysDown.has("arrowdown")) dy += 1;
  if (state.keysDown.has("a") || state.keysDown.has("arrowleft")) dx -= 1;
  if (state.keysDown.has("d") || state.keysDown.has("arrowright")) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv; dy *= inv;
  }

  const next = { x: player.x + dx * player.speed, y: player.y + dy * player.speed, w: player.w, h: player.h };

  let collided = false;
  for (const wall of room.walls) {
    if (rectsOverlap(next, wall)) { collided = true; break; }
  }
  if (!collided) { player.x = next.x; player.y = next.y; }

  player.x = clamp(player.x, 18, room.w - 18 - player.w);
  player.y = clamp(player.y, 18, room.h - 18 - player.h);
}

// ----------------- NPC mood / pose -----------------
function getninuliMood() {
  if (!state.flags.introDone) return "calm";
  if (state.step === 1 && !state.flags.clockFixed) return "calm";
  if (state.flags.clockFixed && !state.flags.bikeSolved) return "excited";
  if (state.flags.bikeSolved && !state.flags.sunSolved) return "nervous";
  if (state.step >= 4 && !state.flags.valentineAsked) return "holding";
  return "calm";
}

// ----------------- Draw room -----------------
function drawRoom() {
  const t = state.sun.t;

  const bg = ctx.createLinearGradient(0, 0, 0, room.h);
  bg.addColorStop(0, "rgba(249, 251, 255, 1)");
  bg.addColorStop(1, "rgba(238, 244, 255, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, room.w, room.h);

  ctx.fillStyle = `rgba(255, 235, 140, ${0.18 * (1 - t)})`;
  ctx.fillRect(0, 0, room.w, room.h);

  ctx.fillStyle = `rgba(255, 150, 90, ${0.22 * t})`;
  ctx.fillRect(0, 0, room.w, room.h);

  ctx.strokeStyle = "rgba(20,30,55,0.06)";
  ctx.lineWidth = 1;
  for (let x = 18; x < room.w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, room.h - 18); ctx.stroke();
  }
  for (let y = 18; y < room.h; y += 48) {
    ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(room.w - 18, y); ctx.stroke();
  }

  const win = ctx.createLinearGradient(0, 0, 0, 140);
  win.addColorStop(0, `rgba(223, 241, 255, ${1 - 0.25 * t})`);
  win.addColorStop(1, `rgba(207, 231, 255, ${1 - 0.45 * t})`);
  ctx.fillStyle = win;
  ctx.fillRect(30, 28, room.w - 60, 105);

  ctx.fillStyle = `rgba(255, 165, 120, ${0.12 * t})`;
  ctx.fillRect(30, 28, room.w - 60, 105);

  ctx.fillStyle = "rgba(40, 60, 95, 0.18)";
  ctx.fillRect(250, 190, 460, 160);
  ctx.fillRect(70, 70, 260, 60);
  ctx.fillRect(630, 70, 260, 60);

  ctx.strokeStyle = "rgba(20,30,55,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(250, 190, 460, 160);
  ctx.strokeRect(70, 70, 260, 60);
  ctx.strokeRect(630, 70, 260, 60);

  ctx.strokeStyle = "rgba(11,18,32,0.10)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, room.w - 36, room.h - 36);
}

function drawSun() {
  const s = objects.sunSpot;
  const cx = s.x + s.w / 2;
  const cyBase = s.y + s.h / 2;
  const y = cyBase + state.sun.t * 28;
  const intensity = 1 - state.sun.t * 0.55;

  const near = (state.step >= 3 && !state.flags.sunSolved && nearRectGlow(s, s.glowRadius));
  if (near) drawGlowCircle(cx, y, s.glowRadius);

  const g = ctx.createRadialGradient(cx, y, 2, cx, y, 22);
  g.addColorStop(0, `rgba(255, 238, 180, ${0.95 * intensity})`);
  g.addColorStop(0.55, `rgba(255, 175, 120, ${0.35 * intensity})`);
  g.addColorStop(1, "rgba(255, 120, 160, 0.00)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, y, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawClock() {
  const c = objects.clock;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const r = 22;

  const near = (state.step >= 1 && !state.flags.clockFixed && nearRectGlow(c, c.glowRadius));
  if (near) drawGlowCircle(cx, cy, c.glowRadius);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "rgba(11,18,32,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const time = state.clock.isCorrect ? state.clock.correctTime : state.clock.wrongTime;
  const hour = time.h % 12;
  const minute = time.m;

  const minA = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  const hourA = ((hour + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;

  ctx.strokeStyle = "rgba(255, 95, 162, 0.9)";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourA) * 10, cy + Math.sin(hourA) * 10);
  ctx.stroke();

  ctx.strokeStyle = "rgba(124, 92, 255, 0.9)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minA) * 14, cy + Math.sin(minA) * 14);
  ctx.stroke();

  ctx.fillStyle = "rgba(11,18,32,0.65)";
  ctx.font = "12px system-ui";
  ctx.fillText(state.clock.isCorrect ? "18:05" : "10:10", cx - 15, cy + 34);
}

function drawBike() {
  const b = objects.bike;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  const near = (state.step >= 2 && !state.flags.bikeSolved && nearRectGlow(b, b.glowRadius));
  if (near) drawGlowCircle(cx, cy, b.glowRadius);

  ctx.fillStyle = "rgba(11,18,32,0.10)";
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2, b.y + b.h + 10, 42, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const leftWheel = { x: b.x + 26, y: b.y + 38, r: 14 };
  const rightWheel = { x: b.x + 86, y: b.y + 38, r: 14 };

  for (const w of [leftWheel, rightWheel]) {
    ctx.strokeStyle = "rgba(11,18,32,0.34)";
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.strokeStyle = "rgba(124, 92, 255, 0.78)";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(b.x + 50, b.y + 18); ctx.lineTo(b.x + 78, b.y + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b.x + 78, b.y + 20); ctx.lineTo(b.x + 58, b.y + 34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b.x + 50, b.y + 18); ctx.lineTo(b.x + 58, b.y + 34); ctx.stroke();

  ctx.fillStyle = "rgba(11,18,32,0.65)";
  ctx.font = "12px system-ui";
  ctx.fillText("Bike", b.x + 46, b.y - 6);
}

// ----------------- Interaction particles -----------------
function spawnHeartBurst(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.7 + Math.random() * 1.8;
    hearts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 40 + Math.floor(Math.random() * 22) });
  }
}

function spawnSparkBurst(x, y, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.0 + Math.random() * 2.4;
    sparkBursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, life: 28 + Math.floor(Math.random() * 14) });
  }
}

// ----------------- Effects update -----------------
function updateEffects() {
  updatePetals();
  updateFireworks();
  updateHearts();
  updateFart();
  updateShutter();

  // reset render offsets
  renderOffsets.ninuli.x = 0; renderOffsets.ninuli.y = 0;
  renderOffsets.jheelz.x = 0; renderOffsets.jheelz.y = 0;

  // sparks
  for (const s of sparkBursts) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.05;
    s.life--;
  }
  sparkBursts = sparkBursts.filter(s => s.life > 0);

  // hug/highfive animation
  if (interactionEffect) {
    interactionEffect.t = (interactionEffect.t ?? 0) + 1;

    const bcx = npcBoy.x + npcBoy.w / 2;
    const bcy = npcBoy.y + npcBoy.h / 2;
    const pcx = player.x + player.w / 2;
    const pcy = player.x + 0 * 0 + (player.y + player.h / 2);

    const midX = (bcx + pcx) / 2;
    const midY = (bcy + pcy) / 2;

    if (interactionEffect.type === "hug") {
      const total = 62;
      const tt = clamp(interactionEffect.t / total, 0, 1);

      let amt = 0;
      if (tt < 0.30) amt = easeInOut(tt / 0.30);
      else if (tt < 0.60) amt = 1;
      else amt = 1 - easeInOut((tt - 0.60) / 0.40);

      const dx = (bcx - pcx) * 0.28 * amt;
      const dy = (bcy - pcy) * 0.12 * amt;

      renderOffsets.jheelz.x = dx;
      renderOffsets.jheelz.y = dy;

      renderOffsets.ninuli.x = -dx * 0.15;
      renderOffsets.ninuli.y = -dy * 0.10;

      if (!interactionEffect.didBurst && tt > 0.32) {
        interactionEffect.didBurst = true;
        spawnHeartBurst(midX, midY - 14, 12);
      }

      if (interactionEffect.t >= total) interactionEffect = null;
    }

    if (interactionEffect.type === "highfive") {
      const total = 40;
      const tt = clamp(interactionEffect.t / total, 0, 1);

      let amt = 0;
      if (tt < 0.35) amt = easeInOut(tt / 0.35);
      else if (tt < 0.55) amt = 1;
      else amt = 1 - easeInOut((tt - 0.55) / 0.45);

      const dx = (bcx - pcx) * 0.16 * amt;
      const dy = (bcy - pcy) * 0.06 * amt;

      renderOffsets.jheelz.x = dx;
      renderOffsets.jheelz.y = dy;

      renderOffsets.ninuli.x = -dx;
      renderOffsets.ninuli.y = -dy;

      if (!interactionEffect.didBurst && tt > 0.38) {
        interactionEffect.didBurst = true;
        spawnSparkBurst(midX, midY - 8, 16);
      }

      if (interactionEffect.t >= total) interactionEffect = null;
    }
  }
}

// ----------------- Shutter flash -----------------
function drawShutterFlash() {
  if (shutterFlash <= 0) return;
  const a = shutterFlash / 18;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ----------------- Interactions -----------------
async function interactBoy() {
  if (!state.flags.introDone) {
    await openModal({
      title: "ninuli",
      body:
        "Hey… I made a little escape room for you.\n\n" +
        "The office has puzzles hidden around.\n" +
        "Solve them to reach the ending.\n\n" +
        "First thing: the time on the clock is not right.\n" +
        "Can you please correct it?\n\n" +
        "Move with WASD / Arrow keys.\nPress E to interact.\nPress F to emote.\nPress P to be… evil.",
      primaryText: "Okay",
    });
    state.flags.introDone = true;
    state.step = 1;
    return;
  }

  const action = await openActionsModal({
    title: "ninuli",
    body: "Choose:",
    actions: [
      { label: "Talk 💬", id: "talk", kind: "primary" },
      { label: "Hug 🤗", id: "hug", kind: "secondary" },
      { label: "High Five 🙌", id: "highfive", kind: "secondary" },
      { label: "Cancel", id: "cancel", kind: "secondary" }
    ]
  });

  if (action === "hug") {
    interactionEffect = { type: "hug", t: 0, didBurst: false };
    state.flags.hugged = true;
    return;
  }
  if (action === "highfive") {
    interactionEffect = { type: "highfive", t: 0, didBurst: false };
    state.flags.highFived = true;
    return;
  }
  if (action !== "talk") return;

  if (state.step === 1 && !state.flags.clockFixed) {
    await openModal({ title: "ninuli", body: "The clock is still wrong… try fixing it near the windows.", primaryText: "Got it" });
    return;
  }
  if (state.step === 2 && !state.flags.bikeSolved) {
    await openModal({ title: "ninuli", body: "Nice… now follow what the clock revealed. Something has a number.", primaryText: "Okay" });
    return;
  }
  if (state.step === 3 && !state.flags.sunSolved) {
    await openModal({ title: "ninuli", body: "Almost there… look at the sun. It’s setting for a reason.", primaryText: "Okay" });
    return;
  }

  if (state.step >= 4 && !state.flags.valentineAsked) {
    if (!state.flags.breatheLineShown) {
      state.flags.breatheLineShown = true;
      await openModal({ title: "ninuli", body: "Okay breathe… don’t mess up.", primaryText: "…" });
      return;
    }

    const res = await openValentinePrompt();
    if (res === "yes") {
      state.flags.valentineAsked = true;
      state.step = 5;

      startPixelRoseSides();
      fireworksActive = true;
      playValentineVideo();

      setTimeout(() => doSnapshot("Valentine Moment 💖"), 300);

      await openModal({
        title: "💖",
        body: "He smiles like he’s been waiting all day for that answer.",
        primaryText: "Awww",
      });

      setTimeout(() => openCredits(), 8000);
    }
  }
}

async function interactClock() {
  const ans = await openModal({
    title: "Wall Clock",
    body: "Hint:\nWhat is the anniversary date?\n\nEnter in DD/MM format.\n",
    input: true,
    primaryText: "Set time",
    secondaryText: "Cancel",
    placeholder: "DD/MM",
  });
  if (ans === null) return;

  const d = normalizeDate(ans);
  if (d !== "05/11") {
    await openModal({ title: "Clock", body: "That doesn’t feel right… try again.", primaryText: "OK" });
    return;
  }

  state.flags.clockFixed = true;
  state.clock.isCorrect = true;
  state.step = 2;

  await openModal({
    title: "Clock corrected ✅",
    body: "The hands settle at 05:11.\n\nSomething about that time feels important.",
    primaryText: "Continue"
  });
}

async function interactBike() {
  const ans = await openModal({
    title: "Bike",
    body: "The clock points you here.\n\nQuestion:\nWhat is the number of the bike?",
    input: true,
    primaryText: "Submit",
    secondaryText: "Cancel",
    placeholder: "Bike number",
  });
  if (ans === null) return;

  const t = normalizeText(ans).replace(/\s+/g, "");
  if (t !== "4150") {
    await openModal({ title: "Bike", body: "Nope… not that. Try again.", primaryText: "OK" });
    return;
  }

  state.flags.bikeSolved = true;
  state.step = 3;

  await openModal({ title: "Unlocked", body: "A small tag flips behind the plate:\n\n“Look at the sun.”", primaryText: "Okay" });
}

async function interactSun() {
  const ans = await openModal({
    title: "The Sun (setting)",
    body: "The sun is slowly going down…\n\nQuestion:\nWhere did we go on our first official date when the sun was setting?",
    input: true,
    primaryText: "Answer",
    secondaryText: "Cancel",
    placeholder: "Type the place…",
  });
  if (ans === null) return;

  const t = normalizeText(ans);
  const ok = (t === "Cat Cafe" || t === "catcafe" || (t.includes("cat") && t.includes("cafe")));
  if (!ok) {
    await openModal({ title: "Not yet…", body: "Close, but not right. Think of that sunset.", primaryText: "OK" });
    return;
  }

  state.flags.sunSolved = true;
  state.step = 4;

  await openModal({ title: "💡", body: "A final message appears:\n“Go back to him.”", primaryText: "Go" });
}

// ----------------- Handle E interaction -----------------
async function handleInteract() {
  const nearby = getNearbyInteractable();
  if (!nearby) return;

  if (nearby.type === "boy") return interactBoy();
  if (["clock", "bike", "sun"].includes(nearby.type)) { inspection = { type: nearby.type }; return; }
}

// ----------------- Draw Entities -----------------
function drawEntities() {
  drawClock();
  if (state.step >= 2) drawBike();

  const mood = getninuliMood();
  const breathe = (mood === "holding") ? Math.sin(performance.now() / 120) * 1.6 : 0;

  const ninuliOX = renderOffsets.ninuli.x;
  const ninuliOY = renderOffsets.ninuli.y;
  const jheelzOX = renderOffsets.jheelz.x;
  const jheelzOY = renderOffsets.jheelz.y;

  let ninuliColor = "rgba(70, 170, 255, 0.95)";
  if (mood === "excited") ninuliColor = "rgba(70, 210, 255, 0.95)";
  if (mood === "nervous") ninuliColor = "rgba(120, 170, 255, 0.95)";
  if (mood === "holding") ninuliColor = "rgba(80, 190, 255, 0.95)";

  roundRect(npcBoy.x + ninuliOX, npcBoy.y + breathe + ninuliOY, npcBoy.w, npcBoy.h, 8, ninuliColor, "rgba(11,18,32,0.16)");

  // arms pose
  ctx.strokeStyle = "rgba(11,18,32,0.18)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const bx = npcBoy.x + ninuliOX, by = npcBoy.y + breathe + ninuliOY, bw = npcBoy.w, bh = npcBoy.h;
  const shoulderY = by + bh * 0.55;

  if (mood === "excited") {
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.15, shoulderY);
    ctx.lineTo(bx + bw * 0.05, shoulderY - 10);
    ctx.moveTo(bx + bw * 0.85, shoulderY);
    ctx.lineTo(bx + bw * 0.95, shoulderY - 10);
    ctx.stroke();
  } else if (mood === "nervous") {
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.18, shoulderY);
    ctx.lineTo(bx + bw * 0.32, shoulderY + 6);
    ctx.moveTo(bx + bw * 0.82, shoulderY);
    ctx.lineTo(bx + bw * 0.68, shoulderY + 6);
    ctx.stroke();
  } else if (mood === "holding") {
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.20, shoulderY);
    ctx.lineTo(bx + bw * 0.45, shoulderY + 6);
    ctx.moveTo(bx + bw * 0.80, shoulderY);
    ctx.lineTo(bx + bw * 0.55, shoulderY + 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.15, shoulderY);
    ctx.lineTo(bx + bw * 0.10, shoulderY + 8);
    ctx.moveTo(bx + bw * 0.85, shoulderY);
    ctx.lineTo(bx + bw * 0.90, shoulderY + 8);
    ctx.stroke();
  }

  drawFaceSimple(npcBoy.x + ninuliOX, npcBoy.y + breathe + ninuliOY, npcBoy.w, npcBoy.h, mood, false);

  const bounceY = player.bounce > 0 ? -Math.sin((player.bounce / 14) * Math.PI) * 8 : 0;

  roundRect(player.x + jheelzOX, player.y + bounceY + jheelzOY, player.w, player.h, 8,
    "rgba(255, 95, 162, 0.92)", "rgba(11,18,32,0.16)"
  );
  drawFaceSimple(player.x + jheelzOX, player.y + bounceY + jheelzOY, player.w, player.h, "calm", true);

  drawNameTag("ninuli", npcBoy.x + npcBoy.w / 2 + ninuliOX, npcBoy.y - 26 + ninuliOY);
  drawNameTag("jheelz", player.x + player.w / 2 + jheelzOX, player.y - 26 + bounceY + jheelzOY);

  // rose shows only when she is near at step>=4 and not yet asked
  const p = playerCenter();
  const boyC = { x: npcBoy.x + npcBoy.w / 2, y: npcBoy.y + npcBoy.h / 2 };
  const nearBoy = dist(p.x, p.y, boyC.x, boyC.y) <= npcBoy.interactRadius;

  if (state.step >= 4 && !state.flags.valentineAsked && nearBoy) {
    ctx.fillStyle = "rgba(255, 95, 162, 0.95)";
    ctx.beginPath();
    ctx.arc(npcBoy.x + npcBoy.w / 2 + ninuliOX, npcBoy.y - 18 + breathe + ninuliOY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(124, 92, 255, 0.65)";
    ctx.fillRect(npcBoy.x + npcBoy.w / 2 - 1 + ninuliOX, npcBoy.y - 10 + breathe + ninuliOY, 2, 12);
  }

  if (interactionEffect) {
    const x = npcBoy.x + npcBoy.w / 2 + ninuliOX;
    const y = npcBoy.y - 30 + ninuliOY;
    if (interactionEffect.type === "hug") drawSpeechBubble("That was cute…", x, y);
    if (interactionEffect.type === "highfive") drawSpeechBubble("Nice one!", x, y);
  }

  drawFart();
  drawHearts();
  drawSparks();

  roundRect(canvas.width - 220, 20, 200, 46, 14, "rgba(255,255,255,0.78)", "rgba(11,18,32,0.10)");
  ctx.fillStyle = "rgba(11,18,32,0.75)";
  ctx.font = "14px system-ui";
  const stepsText = ["Talk to ninuli", "Fix the clock", "Check the bike", "Look at the sun", "Go back to ninuli", "Done 💖"];
  ctx.fillText(`Goal: ${stepsText[state.step]}`, canvas.width - 206, 48);
}

// ----------------- Update & render loop -----------------
let lastInteractPressed = false;

function update() {
  // WATCHDOG: if modal is hidden but flags got stuck, unstick
  if (isModalOpen && modal.classList.contains("hidden")) {
    isModalOpen = false;
    modalMode = "normal";
    modalResolve = null;
    clearActionButtons();
    modalPrimary.classList.remove("hidden");
    modalSecondary.classList.add("hidden");
    modalInputRow.classList.add("hidden");
    modalSecondary.classList.remove("no-btn");
    modalSecondary.style.left = "";
    modalSecondary.style.top = "";
    modalSecondary.style.right = "";
  }

  updateSunProgress();
  updateEffects();

  // disable movement during modal or inspection
  if (!isModalOpen && !inspection) movePlayer();

  const interactPressed = state.keysDown.has("e");
  if (interactPressed && !lastInteractPressed && !isModalOpen && !inspection) handleInteract();
  lastInteractPressed = interactPressed;

  const nearby = getNearbyInteractable();
  if (!state.flags.introDone) hintEl.textContent = "Walk near ninuli and press E to talk.";
  else if (inspection) hintEl.textContent = "ENTER: Interact | ESC: Back";
  else if (nearby?.type === "boy") hintEl.textContent = "Press E to interact with ninuli.";
  else if (nearby?.type === "clock") hintEl.textContent = "Press E to inspect the clock.";
  else if (nearby?.type === "bike") hintEl.textContent = "Press E to inspect the bike.";
  else if (nearby?.type === "sun") hintEl.textContent = "Press E to inspect the sun.";
  else hintEl.textContent = "Explore. The correct item will glow when you’re close.";
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoom();
  drawSun();
  drawFireworksInWindow();

  drawEntities();
  drawPetals();

  drawInspectionUI();
  drawShutterFlash();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();

