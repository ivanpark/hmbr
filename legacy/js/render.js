/**
 * Renders engine runs into the DOM.
 *
 * Uses ordinary inline flow: spans of different font-size share a baseline
 * natively, words wrap at spaces, and the text is selectable/copyable.
 * (The 2023 float:left approach broke wrapping and selection — gone.)
 */

/**
 * @param {HTMLElement} el   container; its font-size is the 1.0em reference
 * @param {Array} runs       output of engine.toRuns()
 */
export function renderRuns(el, runs) {
  el.textContent = '';
  const frag = document.createDocumentFragment();

  for (const run of runs) {
    if (run.type === 'space') {
      frag.appendChild(document.createTextNode(' '));
      continue;
    }
    const word = document.createElement('span');
    word.className = 'hmbr-word';
    for (const u of run.units) {
      const s = document.createElement('span');
      s.className = `hmbr-u hmbr-${u.role}`;
      s.style.fontSize = `${u.weight}em`;
      s.textContent = u.text;
      word.appendChild(s);
    }
    frag.appendChild(word);
  }
  el.appendChild(frag);
}
