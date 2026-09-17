const cache = new Map();
export async function loadJSON(relative) {
  if (!cache.has(relative)) {
    const url = new URL(relative, import.meta.url);
    cache.set(relative, fetch(url).then(r => {
      if (!r.ok) throw new Error('사전 파일을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.');
      return r.json();
    }).catch(error => { cache.delete(relative); throw error; }));
  }
  return cache.get(relative);
}
export async function lookup(phrase, accent = 'rp') {
  if (!['rp','ga'].includes(accent)) throw new Error('지원하지 않는 사전');
  if (phrase.length > 5000) throw new Error('입력은 5,000자 이내로 줄여 주세요.');
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (words.length > 100) throw new Error('한 번에 100단어까지 찾을 수 있습니다.');
  const [examples, corrections] = await Promise.all([
    loadJSON('../data/examples.json'),
    loadJSON('../data/ipa-corrections.json?v=20260917-international'),
  ]);
  const needsDict = words.some(w => {
    const key = cleanWord(w).toLowerCase();
    return !examples[accent][key] && !corrections[accent][key];
  });
  const dict = needsDict ? await loadJSON(`../data/dict-${accent}.json`) : null;
  const entries = [], missing = [];
  for (const raw of words) {
    const word = cleanWord(raw);
    if (!word) continue;
    const checked = examples[accent][word.toLowerCase()];
    const correction = corrections[accent][word.toLowerCase()];
    const ipa = checked?.ipa ?? correction?.ipa ?? dict?.[word] ?? dict?.[word.toUpperCase()] ?? dict?.[word.toLowerCase()];
    if (typeof ipa !== 'string') { missing.push(word); continue; }
    entries.push({ spelling: word, input_token: raw, ipa, provenance: checked
      ? { kind: checked.kind, ref: checked.ref, review_status: 'document-example' }
      : correction ? { kind: 'dictionary-correction', file: 'ipa-corrections.json', source_archive: 'hmbr-web-v2.0(2).zip', accent,
        original_ipa: correction.original_ipa, reference_ipa: correction.reference_ipa, ref: correction.ref,
        checked_on: correction.checked_on, review_scope: correction.review_scope, review_status: 'unreviewed', note: correction.note }
      : { kind: 'supplied-dictionary', file: `dict-${accent}.json`, source_archive: 'hmbr-web-v2.0(2).zip', accent, review_status: 'unreviewed', note: accent === 'rp' ? '기존 자료 설명: 2023년 일부 기계 생성, 검수 전' : '기존 자료 설명: CMU 계열. 개별 IPA와 변이 미검수' } });
  }
  return { entries, missing, source_input: phrase };
}
export function cleanWord(word) { return word.replace(/^[“”"‘’()\[\]]+|[.,!?;:“”"‘’()\[\]]+$/g, ''); }
