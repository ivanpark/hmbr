import { convert, UnmappedIPAError } from './engine.js';
import { lookup, preload } from './dict.js';
import { renderRuns } from './render.js';
import { MAP_VERSION, SPEC_VERSION } from './map.js';
import { articulationCards } from './articulation.js';
import { applyConnectedSpeech } from './connected.js';

const $ = (id) => document.getElementById(id);

const els = {
  english: $('in-english'),
  ipa: $('in-ipa'),
  convert: $('btn-convert'),
  copy: $('btn-copy'),
  out: $('hmbr-out'),
  outPanel: $('out-panel'),
  gloss: $('out-gloss'),
  outIpa: $('out-ipa'),
  status: $('status'),
  sizeDown: $('size-down'),
  sizeUp: $('size-up'),
  version: $('map-version'),
  articPanel: $('artic-panel'),
  articCards: $('artic-cards'),
};

let accent = 'rp';
let narrow = false;
let phrase = false;
let baseSize = 44; // px, the 1.0em stress reference
let lastText = '';       // 정본 부호열. 복사 단추가 내보내는 값.

els.version.textContent = `표기규격 v${SPEC_VERSION} · map ${MAP_VERSION}`;
preload('rp');

function setStatus(msg, kind = '') {
  els.status.textContent = msg;
  els.status.className = `status ${kind}`;
}

function showOutput(res, glossText, ipaText) {
  renderRuns(els.out, res.runs);
  els.out.style.fontSize = `${baseSize}px`;
  els.gloss.textContent = glossText;
  els.outIpa.textContent = ipaText ? `/${ipaText}/` : '';
  els.outPanel.hidden = false;
  els.copy.disabled = false;
  // 화면은 표시 프로파일을 태운 가독형이지만, 밖으로 나가는 값은
  // 등록부의 정본 부호열이다(정본과 표시의 분리). 가독형만 복사하면
  // ᆝ 같이 접힌 자모가 사라져 되돌릴 수 없다.
  lastText = res.canonical;
  showArticulation(ipaText, { narrow });
}

function showArticulation(ipa, mode) {
  const cards = articulationCards(ipa, mode);
  els.articCards.textContent = '';
  if (!cards.length) { els.articPanel.hidden = true; return; }

  for (const c of cards) {
    const card = document.createElement('article');
    card.className = 'artic-card' + (c.key === 'prosody' ? ' artic-prosody' : '');

    const head = document.createElement('div');
    head.className = 'artic-head';
    const sym = document.createElement('span');
    sym.className = 'artic-symbol';
    sym.lang = 'ko';
    sym.textContent = c.symbol || '·';
    const ipaEl = document.createElement('span');
    ipaEl.className = 'artic-ipa';
    ipaEl.textContent = `/${c.ipa}/`;
    const role = document.createElement('span');
    role.className = 'artic-role';
    role.textContent = c.role;
    head.append(sym, ipaEl, role);

    const inst = document.createElement('p');
    inst.className = 'artic-inst';
    inst.textContent = c.instruction;

    const warn = document.createElement('p');
    warn.className = 'artic-warn';
    warn.textContent = c.warning;

    card.append(head, inst, warn);
    if (c.variant) {
      const v = document.createElement('p');
      v.className = 'artic-variant';
      v.textContent = c.variant;
      card.append(v);
    }
    els.articCards.appendChild(card);
  }
  els.articPanel.hidden = false;
}

async function doConvert() {
  const eng = els.english.value.trim();
  let ipa = els.ipa.value.trim();
  setStatus('');

  try {
    if (eng) {
      setStatus('사전 찾는 중…');
      const { ipa: found, missing } = await lookup(eng, accent);
      if (missing.length) {
        setStatus(`사전에 없는 단어: ${missing.join(', ')} — IPA를 직접 입력하면 변환할 수 있습니다.`, 'warn');
        els.outPanel.hidden = true;
        els.articPanel.hidden = true;
        els.copy.disabled = true;
        return;
      }
      ipa = found.trim();
      els.ipa.value = ipa;
    }

    if (!ipa) {
      setStatus('영어 단어나 IPA를 입력해 주세요.', 'warn');
      return;
    }

    if (phrase) ipa = applyConnectedSpeech(ipa);
    const res = convert(ipa, { narrow });
    showOutput(res, eng || '', ipa);
    setStatus('');
  } catch (e) {
    if (e instanceof UnmappedIPAError) {
      setStatus(`대응값이 없는 IPA 기호: “${e.char}” — 음소–자모값 대응 등록부에 아직 실려 있지 않습니다.`, 'error');
    } else {
      setStatus(`오류: ${e.message}`, 'error');
    }
    els.outPanel.hidden = true;
    els.articPanel.hidden = true;
    els.copy.disabled = true;
  }
}

els.convert.addEventListener('click', doConvert);
for (const input of [els.english, els.ipa]) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doConvert(); }
  });
}
// Typing English invalidates the stale IPA; typing IPA invalidates English.
els.english.addEventListener('input', () => { els.ipa.value = ''; });
els.ipa.addEventListener('input', () => { els.english.value = ''; });

function wireToggle(attr, apply) {
  for (const btn of document.querySelectorAll(`[data-${attr}]`)) {
    btn.addEventListener('click', () => {
      apply(btn.dataset[attr]);
      document.querySelectorAll(`[data-${attr}]`).forEach((b) =>
        b.setAttribute('aria-pressed', String(b === btn)));
      if (els.english.value.trim() || els.ipa.value.trim()) doConvert();
    });
  }
}
wireToggle('depth', (v) => { narrow = v === 'narrow'; });
wireToggle('flow', (v) => { phrase = v === 'phrase'; });

for (const btn of document.querySelectorAll('[data-accent]')) {
  btn.addEventListener('click', () => {
    accent = btn.dataset.accent;
    document.querySelectorAll('[data-accent]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)));
    preload(accent);
    if (els.english.value.trim()) doConvert();
  });
}

els.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastText);
    setStatus('정본 부호열을 복사했습니다. (화면에 보이는 가독형이 아니라 조합용 자모 그대로입니다)', 'ok');
  } catch {
    setStatus('복사에 실패했습니다. 결과를 드래그해서 복사해 주세요.', 'warn');
  }
});

els.sizeDown.addEventListener('click', () => {
  baseSize = Math.max(24, baseSize - 4);
  els.out.style.fontSize = `${baseSize}px`;
});
els.sizeUp.addEventListener('click', () => {
  baseSize = Math.min(96, baseSize + 4);
  els.out.style.fontSize = `${baseSize}px`;
});
