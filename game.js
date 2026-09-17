const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const nextEl = document.getElementById('nextFruit');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restart');
const newGameBtn = document.getElementById('newGame');

const W = canvas.width;
const H = canvas.height;
const FLOOR = H - 12;
const GRAVITY = 0.34;
const MAX_DROP = 4;
const fruits = [
  { r: 16, emoji: '🍒', color: '#e94b58', score: 1 },
  { r: 21, emoji: '🍓', color: '#f05b63', score: 3 },
  { r: 27, emoji: '🍇', color: '#8055b7', score: 6 },
  { r: 33, emoji: '🍊', color: '#f39a32', score: 10 },
  { r: 40, emoji: '🍎', color: '#dc4240', score: 15 },
  { r: 47, emoji: '🍐', color: '#86b64b', score: 21 },
  { r: 55, emoji: '🍑', color: '#ee956b', score: 28 },
  { r: 64, emoji: '🍍', color: '#e8b72f', score: 36 },
  { r: 74, emoji: '🥥', color: '#9a6a43', score: 45 },
  { r: 85, emoji: '🍉', color: '#ef5961', score: 60 }
];

let balls = [];
let score = 0;
let currentType = 0;
let nextType = randomType();
let x = W / 2;
let dropping = false;
let over = false;
let lastTime = 0;

function randomType() { return Math.floor(Math.random() * 4); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function fruit(type) { return fruits[type]; }

function reset() {
  balls = [];
  score = 0;
  over = false;
  dropping = false;
  currentType = randomType();
  nextType = randomType();
  x = W / 2;
  scoreEl.textContent = score;
  nextEl.textContent = fruit(nextType).emoji;
  gameOverEl.hidden = true;
}

function drop(px) {
  if (dropping || over) return;
  const f = fruit(currentType);
  x = clamp(px, f.r + 5, W - f.r - 5);
  balls.push({ x, y: 38, vx: 0, vy: 0, type: currentType, r: f.r, settled: false });
  dropping = true;
  currentType = nextType;
  nextType = randomType();
  nextEl.textContent = fruit(nextType).emoji;
}

function update(dt) {
  if (over) return;
  const step = Math.min(dt / 16.67, 2);
  for (const b of balls) {
    b.vy += GRAVITY * step;
    b.x += b.vx * step;
    b.y += b.vy * step;
    b.vx *= 0.995;

    if (b.x - b.r < 6) { b.x = 6 + b.r; b.vx *= -0.35; }
    if (b.x + b.r > W - 6) { b.x = W - 6 - b.r; b.vx *= -0.35; }
  }

  // Resolve vertical collisions repeatedly so the pile settles naturally.
  for (let pass = 0; pass < 3; pass++) {
    balls.sort((a, b) => a.y - b.y);
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.y + a.r >= FLOOR) {
        a.y = FLOOR - a.r;
        a.vy = Math.abs(a.vy) > 1 ? -a.vy * 0.08 : 0;
        a.settled = true;
      }
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const minDist = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist * minDist && d2 > 0) {
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          const overlap = minDist - d;
          b.x += nx * overlap * 0.52;
          b.y += ny * overlap * 0.52;
          a.x -= nx * overlap * 0.48;
          a.y -= ny * overlap * 0.48;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const impulse = -rel * 0.28;
            a.vx -= impulse * nx; a.vy -= impulse * ny;
            b.vx += impulse * nx; b.vy += impulse * ny;
          }
          if (a.type === b.type && a.settled && b.settled && !a.merging && !b.merging) {
            merge(a, b);
            return;
          }
        }
      }
    }
  }

  if (dropping) {
    const last = balls[balls.length - 1];
    if (last && last.y > 35 && Math.abs(last.vy) < 0.45) dropping = false;
  }

  for (const b of balls) {
    if (b.y - b.r < 8 && b.settled && !dropping) {
      over = true;
      finalScoreEl.textContent = score;
      gameOverEl.hidden = false;
      break;
    }
  }
}

function merge(a, b) {
  a.merging = b.merging = true;
  const type = a.type + 1;
  const nx = (a.x + b.x) / 2;
  const ny = (a.y + b.y) / 2;
  balls = balls.filter(v => v !== a && v !== b);
  if (type < fruits.length) {
    const f = fruit(type);
    balls.push({ x: nx, y: ny, vx: 0, vy: -1.8, type, r: f.r, settled: false });
    score += f.score;
    scoreEl.textContent = score;
  } else {
    score += 100;
    scoreEl.textContent = score;
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fffaf1';
  ctx.fillRect(0, 0, W, H);

  // Drop guide
  if (!dropping && !over) {
    const f = fruit(currentType);
    ctx.strokeStyle = 'rgba(36,33,29,.16)';
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(x, 42 + f.r); ctx.lineTo(x, H); ctx.stroke();
    ctx.setLineDash([]);
    drawFruit(x, 42, currentType, .55);
  }

  // Floor
  ctx.fillStyle = '#e6ddcf';
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = '#c9bead';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(W, FLOOR); ctx.stroke();

  for (const b of balls) drawFruit(b.x, b.y, b.type, 1);
}

function drawFruit(px, py, type, alpha) {
  const f = fruit(type);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(px, py, f.r, 0, Math.PI * 2);
  ctx.fillStyle = f.color; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.stroke();
  ctx.font = `${Math.round(f.r * 1.35)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(f.emoji, px, py + 1);
  ctx.restore();
}

function pointerX(e) {
  const rect = canvas.getBoundingClientRect();
  return (e.clientX - rect.left) * (W / rect.width);
}
canvas.addEventListener('pointermove', e => { if (!dropping && !over) x = pointerX(e); });
canvas.addEventListener('pointerdown', e => { e.preventDefault(); drop(pointerX(e)); });
restartBtn.addEventListener('click', reset);
newGameBtn.addEventListener('click', reset);

function loop(t) {
  const dt = t - lastTime || 16.67;
  lastTime = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
