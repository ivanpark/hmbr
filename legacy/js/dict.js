/**
 * English → IPA dictionary (CMU-derived, GA & RP variants).
 * Loaded lazily on first lookup, cached per accent.
 *
 * Data provenance note: the RP set was partially generated with an LLM in
 * 2023 and has not been audited. Treat unexpected RP transcriptions as a
 * data problem before an engine problem.
 */

const cache = {};

async function load(accent) {
  if (!cache[accent]) {
    cache[accent] = fetch(`../data/dict-${accent}.json`).then((r) => {
      if (!r.ok) throw new Error(`dictionary ${accent} failed to load (${r.status})`);
      return r.json();
    });
  }
  return cache[accent];
}

/**
 * @param {string} phrase  space-separated English words
 * @param {'ga'|'rp'} accent
 * @returns {{ipa: string|null, missing: string[]}}
 */
export async function lookup(phrase, accent) {
  const dict = await load(accent);
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  const parts = [];
  const missing = [];

  for (const w of words) {
    const clean = w.replace(/[.,!?;:"“”'‘’()]+$/g, '').replace(/^["“”'‘’()]+/g, '');
    const ipa = dict[clean.toUpperCase()] ?? dict[clean.toLowerCase()] ?? dict[clean];
    if (ipa === undefined) missing.push(clean);
    else parts.push(ipa);
  }
  return { ipa: missing.length ? null : parts.join(' '), missing };
}

/** Preload a dictionary in the background (e.g. on accent toggle). */
export function preload(accent) {
  load(accent).catch(() => {});
}
