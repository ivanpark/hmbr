// Core/vowel heights follow the optical display sizes. Loose consonants keep
// their native font proportions at 75%; never enlarge them to a core's height.
const SVG_NS = 'http://www.w3.org/2000/svg';
const MEASURE_SIZE = 1000;

export function inkBox(metrics, role = 'core') {
  const x = -metrics.actualBoundingBoxLeft;
  const y = -metrics.actualBoundingBoxAscent;
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error('글자 모양의 크기를 측정하지 못했습니다. 페이지를 새로고침해 주세요.');
  }
  const reference = role === 'onset' || role === 'coda' ? MEASURE_SIZE : height;
  return { x, y, width, height, widthEm: width / reference, heightEm: height / reference };
}

export function displayUnits(run) {
  // Keep old-Hangul shaping intact inside the core. Loose letters each receive
  // their own size, so two consonants are not squeezed into one 75% box.
  return run.role === 'core' ? [run.text] : Array.from(run.text);
}

let context;
const boxes = new Map();

export async function prepareOpticalRenderer() {
  // Never measure a fallback font and then display the subsequently loaded font.
  const loaded = await document.fonts.load(`${MEASURE_SIZE}px HMBR`, '캐ᄏᆞꥶᆝ');
  if (!loaded.length) throw new Error('훈민바름 글꼴을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
  if (!context) {
    context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('이 브라우저에서 글자 크기를 측정할 수 없습니다.');
    context.font = `${MEASURE_SIZE}px HMBR`;
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
  }
  return renderOpticalRun;
}

function renderOpticalRun(run) {
  const piece = document.createElement('span');
  piece.className = `element syllable el-${run.role}`;
  piece.style.fontSize = `${run.scale}em`;
  piece.dataset.scale = String(run.scale);
  piece.title = `${Math.round(run.scale * 100)}%`;
  for (const text of displayUnits(run)) {
    const key = `${run.role}:${text}`;
    if (!boxes.has(key)) boxes.set(key, inkBox(context.measureText(text), run.role));
    const box = boxes.get(key);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.classList.add('ink-glyph');
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
    svg.style.width = `${box.widthEm}em`;
    svg.style.height = `${box.heightEm}em`;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', text);
    svg.setAttribute('focusable', 'false');
    const glyph = document.createElementNS(SVG_NS, 'text');
    glyph.setAttribute('x', '0');
    glyph.setAttribute('y', '0');
    glyph.setAttribute('font-size', String(MEASURE_SIZE));
    glyph.setAttribute('font-family', 'HMBR');
    glyph.setAttribute('fill', 'currentColor');
    glyph.textContent = text;
    svg.append(glyph);
    piece.append(svg);
  }
  return piece;
}
