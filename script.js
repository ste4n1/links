const desktop = () => matchMedia('(min-width: 721px)').matches;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const dock = document.getElementById('dock');
const footdock = document.getElementById('footdock');
const wins = [...document.querySelectorAll('.win')];
const edge = 15;

function clamp(win) {
  if (!desktop() || win.classList.contains('min')) return;
  const r = win.getBoundingClientRect();
  const left = Math.min(Math.max(r.left, edge), Math.max(innerWidth - r.width - edge, edge));
  const top = Math.min(Math.max(r.top, edge), Math.max(innerHeight - r.height - edge, edge));
  if (left !== r.left || top !== r.top) {
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
  }
}

const offsets = new WeakMap();
function remember(win) {
  if (!desktop() || win.classList.contains('min')) return;
  const r = win.getBoundingClientRect();
  const left = win.style.left ? parseFloat(win.style.left) : r.left;
  const top = win.style.top ? parseFloat(win.style.top) : r.top;
  offsets.set(win, { ox: left + r.width / 2 - innerWidth / 2, oy: top + r.height / 2 - innerHeight / 2 });
}
function placeBack(win) {
  if (!desktop() || win.classList.contains('min')) return;
  const o = offsets.get(win);
  if (!o) return;
  const r = win.getBoundingClientRect();
  win.style.left = `${innerWidth / 2 + o.ox - r.width / 2}px`;
  win.style.top = `${innerHeight / 2 + o.oy - r.height / 2}px`;
  clamp(win);
}

let topZ = 0;
function focus(win) {
  topZ += 1;
  wins.forEach(w => { w.style.zIndex = String(1); });
  win.style.zIndex = String(topZ + 1);
}

const gap = 12;
const placed = [];
function overlap(a, b) {
  return a.left < b.left + b.w + gap && b.left < a.left + a.w + gap &&
         a.top < b.top + b.h + gap && b.top < a.top + a.h + gap;
}
function scatter(win) {
  if (!desktop() || win.dataset.pinned !== undefined) return;
  const r = win.getBoundingClientRect();
  const maxX = Math.max(innerWidth - r.width - 30, 0);
  const maxY = Math.max(innerHeight - r.height - 30, 0);
  let best = null;
  let least = Infinity;
  for (let i = 0; i < 120; i += 1) {
    const box = { left: edge + Math.random() * maxX, top: edge + Math.random() * maxY, w: r.width, h: r.height };
    if (!placed.some(p => overlap(box, p))) { best = box; break; }
    const score = placed.reduce((sum, p) => {
      const x = Math.max(0, Math.min(box.left + box.w, p.left + p.w) - Math.max(box.left, p.left));
      const y = Math.max(0, Math.min(box.top + box.h, p.top + p.h) - Math.max(box.top, p.top));
      return sum + x * y;
    }, 0);
    if (score < least) { least = score; best = box; }
  }
  if (!best) return;
  placed.push(best);
  win.style.left = `${best.left}px`;
  win.style.top = `${best.top}px`;
}

function hint(win) {
  const expand = win.querySelector('.expand .hint-text');
  if (!expand) return;
  expand.parentElement.classList.add('hint');
  clearTimeout(expand.dataset.timer);
  expand.dataset.timer = String(setTimeout(() => expand.parentElement.classList.remove('hint'), 2000));
}

wins.forEach((win, i) => {
  const ghost = win.querySelector('.ghost');
  const bar = win.querySelector('.bar');
  const target = win.dataset.ghostFoot !== undefined ? footdock : dock;
  if (ghost && target) target.append(ghost);

  if (win.dataset.startMin !== undefined && desktop()) {
    win.classList.add('min');
    ghost?.classList.add('show');
  }

  if (desktop() && win.dataset.pinned === undefined && !reduced()) {
    win.classList.add('boot');
    scatter(win);
  }
  clamp(win);
  remember(win);
  if (desktop() && win.dataset.pinned === undefined && !reduced()) {
    setTimeout(() => {
      win.classList.remove('boot');
      setTimeout(() => { clamp(win); remember(win); }, 350);
    }, 150 + i * 110);
  }
  setTimeout(() => hint(win), 600 + i * 110);

  win.addEventListener('pointerdown', () => focus(win), true);

  win.querySelector('.close')?.addEventListener('click', () => {
    if (!desktop()) return;
    if (!win.classList.contains('min')) {
      if (win.classList.contains('closing')) return;
      win.classList.add('closing');
      setTimeout(() => {
        win.classList.add('min');
        win.classList.remove('closing');
        ghost?.classList.add('show');
      }, 320);
    } else {
      win.classList.toggle('min');
      ghost?.classList.toggle('show', win.classList.contains('min'));
    }
  });

  ghost?.addEventListener('click', () => {
    win.classList.remove('min');
    ghost.classList.remove('show');
    if (desktop()) {
      focus(win);
      placeBack(win);
      if (!reduced()) {
        win.classList.add('closing');
        win.offsetHeight;
        win.classList.remove('closing');
      }
    }
    hint(win);
  });

  win.querySelector('.expand')?.addEventListener('click', () => {
    win.classList.toggle('open');
    hint(win);
    setTimeout(() => clamp(win), 350);
  });

  bar?.addEventListener('pointerdown', event => {
    if (!desktop() || (event.target instanceof Element && event.target.closest('button, a'))) return;
    const r = win.getBoundingClientRect();
    const dx = event.clientX - r.left;
    const dy = event.clientY - r.top;
    bar.setPointerCapture(event.pointerId);
    const move = e => {
      win.style.left = `${e.clientX - dx}px`;
      win.style.top = `${e.clientY - dy}px`;
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', () => {
      bar.removeEventListener('pointermove', move);
      remember(win);
    }, { once: true });
  });
});

addEventListener('resize', () => wins.forEach(win => {
  if (!desktop()) {
    win.classList.remove('min', 'closing');
    return;
  }
  placeBack(win);
}));

const lights = document.getElementById('lights');
function syncLights() {
  if (!lights) return;
  lights.textContent = document.documentElement.classList.contains('dark') ? 'Turn lights on' : 'Turn lights off';
}
lights?.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  syncLights();
});
syncLights();

const updated = document.getElementById('updated');
if (updated) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  updated.textContent = `Updated on: ${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
}

const nick = document.getElementById('nick');
nick?.addEventListener('pointerdown', event => {
  if (reduced()) return;
  nick.classList.remove('boing');
  nick.offsetHeight;
  nick.classList.add('boing');
  const count = 12;
  for (let i = 0; i < count; i += 1) {
    const leaf = document.createElement('span');
    leaf.className = 'leaf';
    leaf.style.left = `${event.clientX}px`;
    leaf.style.top = `${event.clientY}px`;
    leaf.style.setProperty('--size', `${12 + Math.random() * 18}px`);
    leaf.style.setProperty('--drift', `${(Math.random() - .5) * 320}px`);
    leaf.style.setProperty('--rot', `${(Math.random() < .5 ? -1 : 1) * (180 + Math.random() * 360)}deg`);
    leaf.style.setProperty('--dur', `${1 + Math.random() * .8}s`);
    document.body.append(leaf);
    leaf.addEventListener('animationend', () => leaf.remove());
  }
});
