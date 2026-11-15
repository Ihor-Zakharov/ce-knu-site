// Гра на сторінках 404 і «Немає зв'язку»: КІ-Рекс біжить крізь пори року, стрибає, пригинається й з'їдає біти.
// Тут — хід гри: ввід, цикл, пауза, контрольні точки, підказки. Правила — runner/world.js, усе малювання — runner/view.js.
// Клавіші працюють одразу, щойно сторінка відкрилася: гра слухає весь документ і не потребує фокуса.
// Режимів два. Повний — для клавіатури: стрибок і «пригнутися». Гра дотиком — лише стрибок (торкнутися або тримати)
// і легша траса без перешкод, під якими треба пригинатися. Режим визначає те, чим гравець запустив забіг.
import { REDUCED } from './spring.js';
import { EV, createWorld, step, score, seasonNow } from './runner/world.js';
import { createView } from './runner/view.js';

// фіксований крок фізики, с: гра однакова на будь-якій частоті екрана
const STEP = 1 / 120;
// мс після падіння, поки «ще раз» не діє: випадковий натиск не перезапустить гру
const LOCK = 350;
// підказка з'являється, коли до перешкоди лишилося стільки секунд бігу
const TIP_AHEAD = 1.4;
const KEYS = {
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Enter: 'jump',
  NumpadEnter: 'jump',
  ArrowDown: 'down',
  KeyS: 'down',
  KeyP: 'pause',
  Escape: 'pause',
};
// якщо фокус на одному з таких елементів, клавіші належать йому, а не грі (пробіл на кнопці натискає кнопку)
const BUSY = 'a, button, input, select, textarea, summary, [contenteditable], [role=button], [role=link], [role=menuitem]';
// пристрій, яким керують пальцем: до першого старту показуємо гру дотиком
const COARSE = matchMedia('(pointer: coarse)').matches;
// події вводу в черзі; TAP — той самий «стрибок», але пальцем
const JUMP = 1;
const TAP = 2;
const RELEASE = 3;
const DOWN = 4;
const UP = 5;
const PAUSE = 6;
// якої механіки вчить перешкода
const MECH = { spike: 'jump', block: 'jump', gate: 'duck', pad: 'pad', orb: 'orb' };
const store = {
  get: k => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* приватний режим */
    }
  },
};

/* txt — рядки зі сторінки. На екрані: keys і touch — рядок керування (клавіатура, дотик),
   tips — слова підказок { jump, duck, pad, orb }, victory — заголовок на плашці після фінішу.
   Для екранного читача: start, paused, seasons[5], over(рахунок, рекорд), won(рахунок, рекорд), resume(пора року, рахунок) */
export function runner(el, txt) {
  const live = el.querySelector('[data-runner-live]');
  const say = s => {
    live.textContent = s;
  };
  const view = createView(el);

  /* ── стан ─────────────────────────────────────────────────── */
  // idle — чекає, run — гра, paused — пауза, over — КІ-Рекс розсипався, won — карту пройдено
  let mode = 'idle';
  // гра дотиком чи повна; до першого старту — за типом пристрою
  let touch = COARSE;
  let w = createWorld(seasonNow(), { touch });
  const inp = { press: false, hold: false, down: false };
  // черга натискань: гра розбирає її на початку кроку фізики
  const queue = [];
  // вказівники на грі: id → { tap, x, y }; tap — дотик поза грою, спрацює на відпусканні
  const touches = new Map();
  // клавішу «униз» тримають
  let keyDown = false;
  // рекорд; record — у цьому забігу його побито
  let best = +store.get('ki-run-best') || 0;
  let record = false;
  // overAt — з якої миті після падіння можна почати знову; overT — секунд від падіння
  let raf = 0;
  let last = 0;
  let acc = 0;
  let overAt = 0;
  let overT = 0;
  // гру видно хоч трохи — цикл іде
  let visible = false;
  // чого гравець уже навчився за це відкриття сторінки — від цього гаснуть підказки; lift — чим КІ-Рекса підкинуло востаннє
  const done = { jump: false, duck: false, pad: false, orb: false };
  let lift = '';
  // стан на кадр для view.js (один об'єкт на всю гру — щокадру нічого не створюємо)
  const f = {
    mode,
    w,
    touch,
    score: 0,
    best,
    record,
    overT: 0,
    ready: false,
    from: 0,
    title: '',
    line: '',
    tip: { kind: null, o: null, label: '' },
  };
  const ended = () => mode === 'over' || mode === 'won';
  function frame() {
    f.mode = mode;
    f.w = w;
    f.touch = touch;
    f.score = score(w);
    f.best = best;
    f.record = record;
    f.overT = overT;
    f.ready = ended() && performance.now() >= overAt;
    // після фінішу — з початку карти, після падіння — з початку того самого відрізка
    f.from = mode === 'won' ? seasonNow() : w.check.s;
    // заголовок на плашці — лише після фінішу
    f.title = mode === 'won' ? txt.victory || '' : '';
    // рядок керування: до старту й доки гравець не стрибнув і (у повній грі) не пригнувся
    f.line = mode === 'idle' || !(done.jump && (touch || done.duck)) ? (touch ? txt.touch : txt.keys) || '' : '';
  }
  const paint = () => {
    frame();
    view.draw(f);
  };

  /* ── хід гри ──────────────────────────────────────────────── */
  // from — контрольна точка (початок відрізка карти, де КІ-Рекс упав) або null; finger — забіг запустили дотиком
  function start(from, finger) {
    // новий забіг (або падіння ще на першому відрізку): режим — за тим, чим запустили
    if (!from || !from.n) {
      from = null;
      touch = finger;
    }
    w = createWorld(seasonNow(), { ahead: view.vw + 24, touch, from });
    w.behind = view.rexX + 16;
    // після контрольної точки режим лишається тим самим
    touch = w.touch;
    mode = 'run';
    el.classList.add('is-on');
    inp.press = inp.hold = false;
    record = false;
    lift = '';
    view.reset();
    say(from ? txt.resume(txt.seasons[from.s], from.score) : txt.start);
  }
  // рекорд, побитий посеред забігу, зберігаємо й на паузі та коли сторінку ховають або залишають —
  // не лише після падіння
  const keep = () => { if (record) store.set('ki-run-best', best); };
  addEventListener('pagehide', keep);
  function pause() {
    keep();
    if (mode === 'run') {
      mode = 'paused';
      el.classList.remove('is-on');
      inp.hold = false;
      say(txt.paused);
      wake();
    }
  }
  function resume() {
    if (mode === 'paused') {
      mode = 'run';
      el.classList.add('is-on');
      say(txt.start);
    }
  }
  // «стрибок» — єдина кнопка на все: старт, продовження, ще раз (одразу, без екранів), стрибок
  function press(finger) {
    if (mode === 'paused') resume();
    else if (mode === 'run') {
      inp.press = true;
      inp.hold = true;
    } else {
      // після падіння — з контрольної точки: з початку того самого відрізка; після фінішу — з початку карти
      start(mode === 'over' ? w.check : null, finger);
    }
  }
  /* Черга вводу. Обробник події лише кладе натискання в чергу; розбирається вона на початку кроку фізики, по порядку,
     і щонайбільше одне натискання «стрибка» за крок — тож жодне не губиться й два швидкі не зливаються в одне.
     Натискання одразу після падіння не пропадає, а чекає: гра почнеться знову, щойно мине LOCK */
  function drain() {
    while (queue.length) {
      const a = queue[0];
      if ((a === JUMP || a === TAP) && ended() && performance.now() < overAt) return;
      queue.shift();
      if (a === JUMP || a === TAP) {
        press(a === TAP);
        return;
      }
      if (a === RELEASE) inp.hold = false;
      else if (a === DOWN) keyDown = true;
      else if (a === UP) keyDown = false;
      else if (mode === 'paused') resume();
      else pause();
    }
  }
  const post = a => {
    queue.push(a);
    wake();
  };
  // кінець забігу: КІ-Рекс розсипався (won = false) або пройшов усю карту (won = true)
  function finish(won) {
    mode = won ? 'won' : 'over';
    overAt = performance.now() + LOCK;
    overT = 0;
    el.classList.remove('is-on');
    inp.hold = inp.press = false;
    f.tip.kind = null;
    keep();
    say((won ? txt.won : txt.over)(score(w), best));
  }
  // події світу за крок: що гравець уже вміє, оголошення, кінець забігу; ефекти малює view.js
  function react(ev) {
    if (ev & EV.JUMP) lift = 'jump';
    if (ev & EV.PAD) {
      lift = 'pad';
      done.pad = true;
    }
    if (ev & EV.ORB) {
      lift = 'orb';
      done.orb = true;
    }
    if (ev & EV.GATE) done.duck = true;
    if (ev & EV.SEASON) say(txt.seasons[w.marks[w.mi].s]);
    if (ev & EV.DIE) finish(false);
    if (ev & EV.WIN) finish(true);
    frame();
    view.on(ev, f);
  }
  /* Підказки першого відрізка карти (після контрольної точки на пізнішому відрізку їх немає).
     Показуємо найближчу попереду перешкоду, механікою якої гравець ще жодного разу не скористався вдало:
     стрибок через шип чи на блок, «пригнутися» під навісною, пружина, біт.
     У грі дотиком навісних немає — немає й «пригнутися» */
  function tutor(dt) {
    const tip = f.tip;
    tip.kind = null;
    if (w.marks[w.mi].n) return;
    for (const o of w.obs) {
      const k = MECH[o.kind];
      const end = o.x + o.w;
      if (!k || done[k]) continue;
      if (end <= w.dist) {
        // щойно перестрибнув
        if (k === 'jump' && lift === 'jump' && end > w.dist - w.speed * dt) done.jump = true;
        continue;
      }
      if (o.x - w.dist < w.speed * TIP_AHEAD) {
        tip.kind = k;
        tip.o = o;
        tip.label = txt.tips?.[k] || '';
      }
      return;
    }
  }
  function tick(dt) {
    drain();
    if (mode === 'run') {
      inp.down = keyDown;
      step(w, inp, dt);
      const sc = score(w);
      // рекорд побито
      if (sc > best) {
        if (!record && best > 0) view.cheer();
        record = true;
        best = sc;
      }
      if (w.ev) react(w.ev);
      if (mode === 'run') tutor(dt);
    } else if (ended()) overT += dt;
    frame();
    view.update(dt, f);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    acc += Math.min(.1, Math.max(0, (now - last) / 1000));
    last = now;
    while (acc >= STEP) {
      tick(STEP);
      acc -= STEP;
    }
    view.draw(f);
    wake();
  }
  // цикл іде, коли гру видно й вкладка активна: під час гри, поки в черзі є натискання,
  // а без prefers-reduced-motion — ще й в очікуванні
  function wake() {
    const on = visible && !document.hidden && (queue.length > 0 || mode === 'run' || (!REDUCED && mode !== 'paused'));
    if (on && !raf) {
      // acc = STEP — перший же кадр зробить крок і розбере чергу
      last = performance.now();
      acc = STEP;
      raf = requestAnimationFrame(loop);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      paint();
    }
  }

  /* ── ввід ─────────────────────────────────────────────────── */
  // Клавіші слухаємо на всьому документі: грати можна одразу, без клацання по грі. Клавішу НЕ чіпаємо, якщо:
  //   її вже хтось обробив або затиснуто Ctrl/Alt/Cmd/Shift; фокус на посиланні, кнопці чи полі;
  //   відкрито меню або діалог (пошук, фото);
  //   гру видно менш ніж наполовину (тоді пробіл гортає сторінку, як завжди)
  const inView = () => {
    const r = el.getBoundingClientRect();
    return r.height ? (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height : 0;
  };
  const free = e => !(e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)
    && !(e.target instanceof Element && !el.contains(e.target) && e.target.closest(BUSY))
    && !document.querySelector('#menu:not([hidden]), dialog[open]') && inView() >= .5;
  document.addEventListener('keydown', e => {
    const k = KEYS[e.code];
    if (!k || !free(e)) return;
    // «униз» і «пауза» поза грою лишаються браузеру; але якщо старт уже в черзі (пробіл щойно натиснуто),
    // гра вже їхня: інакше «униз» одразу після старту гортав би сторінку
    const starting = queue.includes(JUMP) || queue.includes(TAP);
    if (k !== 'jump' && mode !== 'run' && !starting && !(k === 'pause' && mode === 'paused')) return;
    // забираємо лише ті клавіші, які гра справді використала — сторінка не гортається
    e.preventDefault();
    // автоповтор не рахуємо: «тримати» — це стан між натиском і відпусканням
    if (!e.repeat) post(k === 'jump' ? JUMP : k === 'down' ? DOWN : PAUSE);
  });
  document.addEventListener('keyup', e => {
    const k = KEYS[e.code];
    if (k === 'jump' && (inp.hold || queue.length)) post(RELEASE);
    else if (k === 'down' && (keyDown || queue.length)) post(UP);
  });
  // Миша й дотик: натиск будь-де на грі — стрибок, тримати — стрибати далі, щойно КІ-Рекс приземлиться.
  // Поза грою дотик спрацьовує на відпусканні: так прокрутка сторінки пальцем по грі її не запускає
  el.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const finger = e.pointerType !== 'mouse';
    const tap = finger && mode !== 'run';
    touches.set(e.pointerId, { tap, x: e.clientX, y: e.clientY });
    if (tap) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* вказівник уже зник */
    }
    post(finger ? TAP : JUMP);
  });
  const lifted = e => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    touches.delete(e.pointerId);
    if (t.tap) {
      if (e.type === 'pointerup' && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 12) post(TAP);
    } else if (!touches.size) {
      // відпустили останній палець
      post(RELEASE);
    }
  };
  el.addEventListener('pointerup', lifted);
  el.addEventListener('pointercancel', lifted);
  // довгий дотик не відкриває меню посеред гри
  el.addEventListener('contextmenu', e => {
    if (mode === 'run') e.preventDefault();
  });

  // Пауза сама: вкладку сховали, вікно втратило фокус, гру прокрутили за край екрана,
  // фокус перейшов на кнопку чи посилання (тоді клавіші йдуть уже не грі)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    wake();
  });
  addEventListener('blur', () => {
    keyDown = false;
    touches.clear();
    pause();
  });
  document.addEventListener('focusin', e => {
    if (e.target instanceof Element && !el.contains(e.target) && e.target.closest(BUSY)) pause();
  });
  new IntersectionObserver(es => {
    const e = es[es.length - 1];
    visible = e.isIntersecting;
    if (e.intersectionRatio < .5) pause();
    wake();
  }, { threshold: [0, .5] }).observe(el);
  // до першого спрацювання спостерігача міряємо самі
  visible = inView() > 0;
  // розмір міряємо після появи й на кожну зміну; кольори — на кожну зміну теми (сайт сповіщає подією themechange)
  const size = () => {
    view.size();
    w.ahead = view.vw + 24;
    w.behind = view.rexX + 16;
    paint();
  };
  new ResizeObserver(size).observe(el);
  document.addEventListener('themechange', () => {
    view.theme();
    paint();
  });
  document.fonts?.ready.then(size);
  size();
  wake();
}
