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
const WALL = 7;
const FLOOR = H - 12;
const GRAVITY = 0.42;
const AIR_DRAG = 0.996;
const RESTITUTION = 0.12;
const SOLVER_PASSES = 7;
const DEADLINE = 34;

// Suika-style progression: the falling fruit is chosen only from the
// small fruits. Two fruits of exactly the same level make ONE next-level fruit.
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
let nextType = 0;
let x = W / 2;
let dropping = false;
let over = false;
let lastTime = 0;
let dropTimer = 0;
let mergeQueue = [];
let mergeLock = false;
let topPressure = 0;

// The real game gives only the first few fruit levels as normal drops.
function randomType() {
  const roll = Math.random();
  if (roll < 0.42) return 0;
  if (roll < 0.73) return 1;
  if (roll < 0.90) return 2;
  return 3;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function fruit(type) { return fruits[type]; }

function reset() {
  balls = [];
  score = 0;
  over = false;
  dropping = false;
  mergeLock = false;
  mergeQueue = [];
  dropTimer = 0;
  topPressure = 0;
  currentType = randomType();
  nextType = randomType();
  x = W / 2;
  scoreEl.textContent = score;
  nextEl.textContent = fruit(nextType).emoji;
  gameOverEl.hidden = true;
}

function drop(px) {
  if (dropping || over || dropTimer > 0) return;
  const f = fruit(currentType);
  x = clamp(px, f.r + WALL, W - f.r - WALL);

  balls.push({
    x,
    y: 42,
    vx: 0,
    vy: 0,
    type: currentType,
    r: f.r,
    active: true,
    grounded: false,
    restFrames: 0,
    age: 0,
    merging: false
  });

  dropping = true;
  dropTimer = 18;
  currentType = nextType;
  nextType = randomType();
  nextEl.textContent = fruit(nextType).emoji;
}

function integrate(step) {
  for (const b of balls) {
    if (!b.active) continue;
    b.age += step;
    b.vy += GRAVITY * step;
    b.x += b.vx * step;
    b.y += b.vy * step;
    b.vx *= Math.pow(AIR_DRAG, step);

    if (b.x - b.r < WALL) {
      b.x = WALL + b.r;
      b.vx = Math.abs(b.vx) * RESTITUTION;
    } else if (b.x + b.r > W - WALL) {
      b.x = W - WALL - b.r;
      b.vx = -Math.abs(b.vx) * RESTITUTION;
    }

    if (b.y + b.r > FLOOR) {
      b.y = FLOOR - b.r;
      if (Math.abs(b.vy) > 0.45) b.vy = -Math.abs(b.vy) * RESTITUTION;
      else b.vy = 0;
      b.grounded = true;
    }
  }
}

function solveContacts() {
  for (let pass = 0; pass < SOLVER_PASSES; pass++) {
    // Stable order helps prevent tunneling through a settled pile.
    balls.sort((a, b) => a.y - b.y || a.x - b.x);

    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (!a.active) continue;

      if (a.y + a.r > FLOOR) {
        a.y = FLOOR - a.r;
        a.vy = Math.min(a.vy, 0);
        a.grounded = true;
      }

      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (!b.active) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minDist * minDist) continue;

        const d = Math.sqrt(d2) || 0.0001;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = minDist - d;

        // Push both bodies apart. Larger fruit is given slightly more weight.
        const wa = 1 / (a.r * a.r);
        const wb = 1 / (b.r * b.r);
        const total = wa + wb;
        a.x -= nx * overlap * (wa / total);
        a.y -= ny * overlap * (wa / total);
        b.x += nx * overlap * (wb / total);
        b.y += ny * overlap * (wb / total);

        const relativeNormal = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relativeNormal < 0) {
          const impulse = -relativeNormal * 0.34;
          a.vx -= impulse * nx * (wa / total);
          a.vy -= impulse * ny * (wa / total);
          b.vx += impulse * nx * (wb / total);
          b.vy += impulse * ny * (wb / total);
        }

        // IMPORTANT: exactly TWO equal fruits create the next fruit.
        // Do not merge three or more at once and do not merge different levels.
        if (a.type === b.type && !a.merging && !b.merging &&
            a.age > 2 && b.age > 2) {
          queueMerge(a, b);
        }
      }
    }
  }
}

function queueMerge(a, b) {
  if (a.merging || b.merging) return;
  a.merging = true;
  b.merging = true;
  mergeQueue.push([a, b]);
}

function processMerges() {
  if (mergeLock || mergeQueue.length === 0) return;
  mergeLock = true;

  // Resolve one pair at a time, allowing the newly-created fruit to
  // immediately collide and trigger a second merge (chain reaction).
  const pair = mergeQueue.shift();
  const [a, b] = pair;
  if (!balls.includes(a) || !balls.includes(b)) {
    mergeLock = false;
    return;
  }

  const type = a.type + 1;
  const nx = (a.x + b.x) / 2;
  const ny = (a.y + b.y) / 2;
  const vx = (a.vx + b.vx) / 2;
  const vy = Math.min((a.vy + b.vy) / 2 - 1.7, -1.1);

  balls = balls.filter(v => v !== a && v !== b);

  if (type < fruits.length) {
    const f = fruit(type);
    balls.push({
      x: nx,
      y: ny,
      vx,
      vy,
      type,
      r: f.r,
      active: true,
      grounded: false,
      restFrames: 0,
      age: 0,
      merging: false
    });
    score += f.score;
  } else {
    // Two watermelons disappear, as in the end of the merge chain.
    score += 100;
  }

  scoreEl.textContent = score;
  mergeLock = false;
}

function updateResting(step) {
  for (const b of balls) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed < 0.18) b.restFrames += step;
    else b.restFrames = 0;
    if (b.restFrames > 5) {
      b.vx *= 0.96;
      b.vy *= 0.90;
    }
  }
}

function updateGameOver(step) {
  // Suika's danger is the pile reaching the top/overflow line.
  let pressure = 0;
  for (const b of balls) {
    if (b.age < 30 || b.merging) continue;
    const distance = b.y - b.r;
    if (distance < DEADLINE) pressure = Math.max(pressure, DEADLINE - distance);
  }

  if (pressure > 0) topPressure += step;
  else topPressure = Math.max(0, topPressure - step * 2);

  // Require the fruit to remain in the danger area briefly so a bouncing
  // fruit touching the line does not instantly end the game.
  if (topPressure > 22 && !dropping) {
    over = true;
    finalScoreEl.textContent = score;
    gameOverEl.hidden = false;
  }
}

function update(dt) {
  if (over) return;
  const step = Math.min(dt / 16.67, 2.2);
  dropTimer = Math.max(0, dropTimer - step);

  integrate(step);
  solveContacts();
  updateResting(step);

  if (dropping) {
    const last = balls[balls.length - 1];
    // The next fruit becomes available after the just-dropped fruit has
    // actually entered the pile, not merely after a fixed timeout.
    if (last && last.age > 7 && Math.abs(last.vy) < 0.35 && last.y > 55) {
      dropping = false;
    }
  }

  processMerges();
  updateGameOver(step);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fffaf1';
  ctx.fillRect(0, 0, W, H);

  // Danger line is subtle, but visible enough to understand the rule.
  ctx.strokeStyle = 'rgba(220,70,70,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WALL, DEADLINE);
  ctx.lineTo(W - WALL, DEADLINE);
  ctx.stroke();

  if (!dropping && !over) {
    const f = fruit(currentType);
    ctx.strokeStyle = 'rgba(36,33,29,.14)';
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.moveTo(x, 42 + f.r);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.setLineDash([]);
    drawFruit(x, 42, currentType, 0.58);
  }

  ctx.fillStyle = '#e6ddcf';
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = '#c9bead';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR);
  ctx.lineTo(W, FLOOR);
  ctx.stroke();

  for (const b of balls) {
    if (b.active) drawFruit(b.x, b.y, b.type, 1);
  }
}

function drawFruit(px, py, type, alpha) {
  const f = fruit(type);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(px, py, f.r, 0, Math.PI * 2);
  ctx.fillStyle = f.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.stroke();
  ctx.font = `${Math.round(f.r * 1.35)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.emoji, px, py + 1);
  ctx.restore();
}

function pointerX(e) {
  const rect = canvas.getBoundingClientRect();
  return (e.clientX - rect.left) * (W / rect.width);
}

canvas.addEventListener('pointermove', e => {
  if (!dropping && !over) x = pointerX(e);
});
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  drop(pointerX(e));
});
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
