(function () {
  const canvas = document.querySelector('[data-jyoti-rose-canvas]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = 800;
  const H = 800;
  const DURATION = 10000;
  const TICK = 16;
  const ANIM = 38;
  const LIFT = 32;
  const GAP = 3;
  const BG = '#060208';
  const SEED = 17;

  // Only name variants are used here—no love phrases.
  const NAME_VARIANTS = [
    'Jyoti', 'JYOTI', 'ज्योति', 'ज्योती', 'জ্যোতি', 'જ્યોતિ', 'ਜਯੋਤੀ',
    'ஜோதி', 'జ్యోతి', 'ಜ್ಯೋತಿ', 'ജ്യോതി', 'جيوتي', 'Джоти', 'ジョティ',
    '조티', '乔蒂', 'Τζιότι', 'Ջյոթի', 'ჯიოტი', 'Joti'
  ];
  const ACCENTS = ['JYOTI', 'જ્યોતિ', 'ज्योति', 'জ্যোতি', 'జ్యోతి', 'ஜோதி', 'ジョティ', '조티', 'Jyoti'];
  const SHORT_NAMES = NAME_VARIANTS.slice();
  const HEAD_WORDS = NAME_VARIANTS.concat(['JYOTI', 'JYOTI', 'Jyoti', 'ज्योति', 'జ్యోతి', 'জ্যোতি']);

  const HEAD_SIZES = [7, 8, 9, 10, 11, 12, 13, 14];
  const HEAD_WEIGHTS = [2, 4, 5, 5, 4, 2, 1, 0.5];

  function createRng(seed) {
    let state = seed >>> 0;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    return {
      random,
      uniform(min, max) { return min + random() * (max - min); },
      choice(items) { return items[Math.floor(random() * items.length)]; },
      weighted(items, weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let pick = random() * total;
        for (let index = 0; index < items.length; index += 1) {
          pick -= weights[index];
          if (pick <= 0) return items[index];
        }
        return items[items.length - 1];
      },
      shuffle(items) {
        for (let index = items.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(random() * (index + 1));
          [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
        return items;
      }
    };
  }

  function ellipsePoly(cx, cy, rx, ry, points = 160) {
    return Array.from({ length: points }, (_, index) => {
      const angle = 2 * Math.PI * index / points;
      return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
    });
  }

  const HEAD_SHAPES = [
    ellipsePoly(400, 180, 145, 90),
    ellipsePoly(330, 180, 120, 83),
    ellipsePoly(470, 180, 120, 83),
    ellipsePoly(275, 260, 98, 112),
    ellipsePoly(525, 260, 98, 112),
    ellipsePoly(338, 325, 118, 126),
    ellipsePoly(462, 325, 118, 126),
    [[230, 330], [290, 365], [348, 414], [400, 532], [452, 414], [510, 365], [570, 330], [522, 452], [400, 542], [278, 452]]
  ];
  const STEM = [[378, 493], [422, 493], [427, 752], [408, 772], [390, 760], [374, 600]];
  const LEFT_LEAF = [[395, 594], [359, 554], [304, 535], [244, 541], [215, 562], [253, 609], [321, 631], [374, 617]];
  const RIGHT_LEAF = [[406, 619], [442, 581], [491, 561], [553, 578], [578, 600], [535, 640], [476, 660], [425, 649]];

  let rng;
  let phraseCycles;
  let order;
  let active;
  let completed;
  let running = false;
  let animationFrame = 0;
  let startedAt = 0;
  let lastTime = 0;
  let spawnAccumulator = 0;
  let shimmerItem = null;
  let shimmerUntil = 0;
  let nextShimmer = 0;

  function hasAny(text, low, high) {
    return [...text].some((character) => {
      const code = character.codePointAt(0);
      return code >= low && code <= high;
    });
  }

  function fontFamily(text) {
    if (hasAny(text, 0xAC00, 0xD7AF)) return '"Malgun Gothic", "Noto Sans CJK KR", Arial, sans-serif';
    if (hasAny(text, 0x3040, 0x30FF)) return '"Yu Gothic UI", Meiryo, "Noto Sans CJK JP", Arial, sans-serif';
    if (hasAny(text, 0x4E00, 0x9FFF)) return '"Microsoft YaHei", SimHei, "Noto Sans CJK SC", Arial, sans-serif';
    if (hasAny(text, 0x0900, 0x097F)) return '"Nirmala UI", Mangal, "Noto Sans Devanagari", Arial, sans-serif';
    if (hasAny(text, 0x0980, 0x09FF)) return '"Nirmala UI", Vrinda, "Noto Sans Bengali", Arial, sans-serif';
    if (hasAny(text, 0x0C00, 0x0C7F)) return 'Gautami, "Nirmala UI", "Noto Sans Telugu", Arial, sans-serif';
    if (hasAny(text, 0x0B80, 0x0BFF)) return 'Latha, "Noto Sans Tamil", Arial, sans-serif';
    if (hasAny(text, 0x0E00, 0x0E7F)) return '"Leelawadee UI", "Noto Sans Thai", Arial, sans-serif';
    if (hasAny(text, 0x0600, 0x06FF)) return '"Segoe UI", Arial, "Noto Sans Arabic", sans-serif';
    if (hasAny(text, 0x0590, 0x05FF)) return 'Arial, "Noto Sans Hebrew", sans-serif';
    if (hasAny(text, 0x0370, 0x03FF)) return 'Georgia, Arial, sans-serif';
    if (hasAny(text, 0x0400, 0x04FF)) return 'Georgia, Arial, "Segoe UI", sans-serif';
    if (hasAny(text, 0x0530, 0x058F)) return 'Arial, sans-serif';
    return 'Georgia, "Times New Roman", Arial, sans-serif';
  }

  function fontFor(text, size) {
    return `700 ${size}px ${fontFamily(text)}`;
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16) / 255);
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255).toString(16).padStart(2, '0')).join('')}`;
  }

  function mix(first, second, amount) {
    return first.map((value, index) => value + (second[index] - value) * amount);
  }

  function polygonSpans(polygon, y) {
    const intersections = [];
    for (let index = 0; index < polygon.length; index += 1) {
      const [x1, y1] = polygon[index];
      const [x2, y2] = polygon[(index + 1) % polygon.length];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        if (y2 !== y1) intersections.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
      }
    }
    intersections.sort((a, b) => a - b);
    const spans = [];
    for (let index = 0; index + 1 < intersections.length; index += 2) spans.push([intersections[index], intersections[index + 1]]);
    return spans;
  }

  function mergeSpans(spans) {
    if (!spans.length) return [];
    const sorted = spans.slice().sort((a, b) => a[0] - b[0]);
    const merged = [[sorted[0][0], sorted[0][1]]];
    sorted.slice(1).forEach(([low, high]) => {
      const last = merged[merged.length - 1];
      if (low <= last[1] + 1) last[1] = Math.max(last[1], high);
      else merged.push([low, high]);
    });
    return merged;
  }

  function shapeSpans(polygons, y) {
    return mergeSpans(polygons.flatMap((polygon) => polygonSpans(polygon, y)));
  }

  function intersectSpans(first, second, minimum = 15) {
    const intersections = [];
    first.forEach((a) => second.forEach((b) => {
      const low = Math.max(a[0], b[0]);
      const high = Math.min(a[1], b[1]);
      if (high - low >= minimum) intersections.push([low, high]);
    }));
    return mergeSpans(intersections);
  }

  function roseColor(x, y, size, edge = false) {
    const dx = (x - 400) / 210;
    const dy = (y - 300) / 220;
    const radius = Math.sqrt(dx * dx + dy * dy);
    let palette;
    if (radius > .82) palette = ['#8f0b2b', '#ae1238', '#c41d48', '#d52b53'];
    else if (radius > .48) palette = ['#b9143d', '#d21e49', '#e33b60', '#f04e73'];
    else palette = ['#c51b49', '#e83c68', '#f16b8b', '#ff91a9'];
    if (edge) palette.push('#f5a0b3', '#ef6488');
    if (size >= 14) palette.push('#ff9ab1', '#ffd0dc');
    return hexToRgb(rng.choice(palette));
  }

  function greenColor(size) {
    const palette = ['#3e8034', '#559c3c', '#72b84b', '#91cf62', '#b1e184'];
    if (size >= 9) palette.push('#a7d486', '#c0e19a');
    return hexToRgb(rng.choice(palette));
  }

  function phraseFromPool(poolName, size) {
    const pool = size >= 14 ? ACCENTS : (poolName === 'head' ? HEAD_WORDS : SHORT_NAMES);
    const key = `${poolName}-${size >= 14 ? 'accent' : 'normal'}`;
    if (!phraseCycles[key] || !phraseCycles[key].items.length) {
      const items = pool.slice();
      rng.shuffle(items);
      phraseCycles[key] = { items };
    }
    return phraseCycles[key].items.pop();
  }

  function sizeFor(poolName) {
    if (poolName === 'head') return rng.weighted(HEAD_SIZES, HEAD_WEIGHTS);
    return rng.choice(poolName === 'stem' ? [6, 7, 8] : [7, 8, 9, 10]);
  }

  function textWidth(text, size) {
    ctx.font = fontFor(text, size);
    return ctx.measureText(text).width;
  }

  function buildRegion(polygons, yStart, yEnd, rowHeight, kind) {
    const placed = [];
    const half = rowHeight / 2;
    for (let y = yStart + half; y < yEnd - half; y += rowHeight) {
      const top = shapeSpans(polygons, y - half + 1);
      const bottom = shapeSpans(polygons, y + half - 1);
      const row = intersectSpans(top, bottom, kind === 'head' ? 19 : 16);
      row.forEach(([rawLow, rawHigh]) => {
        const margin = kind === 'head' ? 3 : 1;
        const low = rawLow + margin;
        const high = rawHigh - margin;
        const available = high - low;
        if (available < 18) return;
        const line = [];
        let cursor = low + rng.uniform(0, Math.min(3, Math.max(1, available * .02)));
        while (cursor < high - 15) {
          const remaining = high - cursor;
          const targetWidth = Math.min(74, Math.max(19, remaining * .22));
          const candidates = [];
          const tries = kind === 'head' ? 45 : 55;
          for (let attempt = 0; attempt < tries; attempt += 1) {
            const size = sizeFor(kind);
            const text = phraseFromPool(kind, size);
            const width = textWidth(text, size);
            if (width <= remaining && width >= Math.min(18, remaining * .20)) {
              candidates.push({ score: Math.abs(width - targetWidth) + rng.uniform(0, 13), text, size, width });
            }
          }
          if (!candidates.length) break;
          candidates.sort((a, b) => a.score - b.score);
          const pick = rng.choice(candidates.slice(0, Math.min(4, candidates.length)));
          line.push({ x: cursor + pick.width / 2, y, text: pick.text, size: pick.size, width: pick.width, kind });
          cursor += pick.width + (kind === 'head' ? GAP : 1);
        }
        if (!line.length) return;
        const used = line.reduce((sum, item) => sum + item.width, 0) + Math.max(0, line.length - 1) * (kind === 'head' ? GAP : 1);
        const extra = Math.max(0, available - used) / Math.max(1, line.length - 1);
        line.forEach((item, index) => {
          item.x += extra * index;
          item.edge = index === 0 || index === line.length - 1;
          item.color = kind === 'head' ? roseColor(item.x, item.y, item.size, item.edge) : greenColor(item.size);
          placed.push(item);
        });
      });
    }
    return placed;
  }

  function prepare() {
    rng = createRng(SEED);
    phraseCycles = {};
    const headRowHeight = 14;
    const leafRowHeight = 11;
    const stemRowHeight = 10;
    let placed = [];
    placed = placed.concat(buildRegion(HEAD_SHAPES, 88, 540, headRowHeight, 'head'));
    placed = placed.concat(buildRegion([LEFT_LEAF], 543, 618, leafRowHeight, 'leaf'));
    placed = placed.concat(buildRegion([RIGHT_LEAF], 575, 651, leafRowHeight, 'leaf'));
    placed = placed.concat(buildRegion([STEM], 492, 773, stemRowHeight, 'stem'));
    const outer = placed.filter((item) => item.edge).sort((a, b) => Math.atan2(a.y - 300, a.x - 400) - Math.atan2(b.y - 300, b.x - 400));
    const inner = placed.filter((item) => !item.edge);
    rng.shuffle(inner);
    order = outer.concat(inner);
    active = [];
    completed = [];
    shimmerItem = null;
    shimmerUntil = 0;
    nextShimmer = 0;
    drawBackground();
  }

  function drawBackground() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
  }

  function drawText(item, x, y, color) {
    ctx.font = fontFor(item.text, item.size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgbToHex(color);
    ctx.fillText(item.text, x, y);
  }

  function spawn(item) {
    item.frame = 0;
    item.dx = rng.uniform(-6, 6);
    active.push(item);
  }

  function drawFrame(now) {
    drawBackground();
    if (completed.length && now >= nextShimmer) {
      shimmerItem = rng.choice(completed);
      shimmerUntil = now + 210;
      nextShimmer = now + 145;
    }
    completed.forEach((item) => {
      const color = item === shimmerItem && now < shimmerUntil ? mix(item.color, [1, .82, .88], .55) : item.color;
      drawText(item, item.x, item.y, color);
    });
    active = active.filter((item) => {
      item.frame += 1;
      const progress = Math.max(0, Math.min(1, item.frame / ANIM));
      const eased = 1 - (1 - progress) ** 3;
      const x = item.x + item.dx * (1 - eased);
      const y = item.y - LIFT * (1 - eased);
      drawText(item, x + 1, y + 2, mix(hexToRgb(BG), item.color.map((channel) => channel * .23), eased));
      drawText(item, x, y, mix(hexToRgb(BG), item.color.map((channel) => channel * .30), eased * eased));
      const flash = .55 * Math.sin(Math.PI * Math.max(0, Math.min(1, (progress - .58) / .42)));
      drawText(item, x, y, mix(mix(hexToRgb(BG), item.color, eased ** 1.35), [1, .83, .88], flash));
      if (progress >= 1) {
        completed.push(item);
        return false;
      }
      return true;
    });
  }

  function step(now) {
    if (!running) return;
    const elapsed = now - startedAt;
    const delta = Math.min(50, now - lastTime || TICK);
    lastTime = now;
    if (elapsed >= 200 && order.length) {
      const rate = order.length / (DURATION / TICK);
      spawnAccumulator += (delta / TICK) * rate;
      while (spawnAccumulator >= 1 && order.length) {
        spawn(order.shift());
        spawnAccumulator -= 1;
      }
    }
    drawFrame(now);
    if (!order.length && !active.length) {
      // Keep the finished rose softly shimmering until the welcome transition ends.
      animationFrame = window.requestAnimationFrame(step);
      return;
    }
    animationFrame = window.requestAnimationFrame(step);
  }

  function start() {
    stop();
    prepare();
    running = true;
    startedAt = performance.now();
    lastTime = startedAt;
    spawnAccumulator = 0;
    animationFrame = window.requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  window.JyotiRoseAnimation = { start, stop };
})();
