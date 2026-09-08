/**
 * 연음 — connected-speech processing. PHRASE MODE ONLY.
 *
 * ── Architectural rule ──────────────────────────────────────────────────
 * All phrase-mode rules live HERE, and they operate on IPA, upstream of
 * the deterministic engine. This module transforms IPA → IPA; it never
 * touches jamos or HMBR. AI likewise only ever supplies IPA. The engine
 * (engine.js) remains the sole producer of HMBR output.
 *
 * Word mode must never call this module — dictionary-level forms are
 * preserved by simply not applying these transforms.
 * ────────────────────────────────────────────────────────────────────────
 *
 * The linking marker is '‿' (U+203F, the IPA liaison undertie). The engine
 * understands it as: "the consonant after this mark resyllabifies onto the
 * following vowel" — so a word-final /l/ links as a clear, onset-like L
 * instead of darkening.
 *
 * Implemented rules (v1):
 *   L-linking  — word-final /l/ + vowel-initial word:  fʊl əv → fʊ‿ləv
 *
 * Future rules belong here, same shape (IPA in, IPA out), e.g.:
 *   r-linking (RP):    fɑː‿r‿əweɪ patterns
 *   flapping (GA):     t/d → ɾ between vowels across boundaries
 *   elision:           nex(t) week
 * Each new rule must be canon-approved before implementation.
 */

import { IPA_VOWELS } from './map.js';

export const LINK = '\u203f'; // ‿

/**
 * Apply connected-speech transforms to a multi-word IPA string.
 * Deterministic; returns a new IPA string.
 */
export function applyConnectedSpeech(ipa) {
  const s = ipa.normalize('NFC');
  let out = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    // L-linking: /l/ + space + (optional stress mark) + vowel
    if ((ch === 'l' || ch === 'ɫ') && s[i + 1] === ' ') {
      let j = i + 2;
      let marks = '';
      while (s[j] === 'ˈ' || s[j] === 'ˌ') { marks += s[j]; j++; }
      if (IPA_VOWELS.has(s[j])) {
        // resyllabify: move the L across the boundary as a clear onset
        out += LINK + marks + 'l';
        i = j - 1; // continue from the vowel
        continue;
      }
    }
    out += ch;
  }
  return out;
}
