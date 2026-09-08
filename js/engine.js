import { CONSONANTS, VOWELS, VERSION } from './registry.js';

const chr = code => String.fromCodePoint(parseInt(code, 16));
export const codepoints = text => [...text].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
const issue = (code, message, extra = {}) => ({ code, message, ...extra });
const ALIASES = { g: 'ɡ', r: 'ɹ', 'ʧ': 'tʃ', 'ʤ': 'dʒ', 't͡ʃ': 'tʃ', 'd͡ʒ': 'dʒ' };
const SPECIAL = ['ɚ', 'ɝ', 'ʔ', 'ɾ', 'ɫ', 'n̩', 'l̩', 'm̩', 'r̩', 'ɹ̩'];
const SYMBOLS = [...new Set([...Object.keys(CONSONANTS), ...Object.keys(VOWELS), ...Object.keys(ALIASES), ...SPECIAL])].sort((a, b) => b.length - a.length);
// A declared implementation heuristic, not a new rule in the books.
const ONSETS = new Set(['pɹ','bɹ','tɹ','dɹ','kɹ','ɡɹ','fɹ','θɹ','ʃɹ','pl','bl','kl','ɡl','fl','sl','sm','sn','sp','st','sk','sw','tw','kw','ɡw','spɹ','stɹ','skɹ','spl','skl','skw']);
const HST = cp => ((cp >= 0x1100 && cp <= 0x115e) || (cp >= 0xa960 && cp <= 0xa97c)) ? 'L'
  : ((cp >= 0x1161 && cp <= 0x11a7) || (cp >= 0xd7b0 && cp <= 0xd7c6)) ? 'V'
  : ((cp >= 0x11a8 && cp <= 0x11ff) || (cp >= 0xd7cb && cp <= 0xd7fb)) ? 'T' : null;
const allowed = new Set(['110B', '110A', '11BE', ...Object.values(CONSONANTS).flatMap(e => [e.onset, e.coda]), ...Object.values(VOWELS).flatMap(e => e.codes)].filter(Boolean).map(chr));

export function parseCanonical(text) {
  if (typeof text !== 'string' || !text) throw new Error('E-ORDER: 빈 부호열');
  const blocks = []; let block = null; let phase = 'L';
  for (const c of text) {
    if (!allowed.has(c)) throw new Error(`E-CHAR: ${codepoints(c)[0]}`);
    const type = HST(c.codePointAt(0));
    if (type === 'L') {
      if (!block || phase !== 'L') { block = { onset: '', nucleus: '', coda: '' }; blocks.push(block); }
      phase = 'L'; block.onset += c;
    } else if (type === 'V') {
      if (!block || phase === 'T') throw new Error('E-ORDER: 중성 위치 오류');
      phase = 'V'; block.nucleus += c;
    } else if (type === 'T') {
      if (!block?.nucleus) throw new Error('E-ORDER: 종성 앞 음절핵 없음');
      phase = 'T'; block.coda += c;
    } else throw new Error('E-CHAR: 허용되지 않은 문자');
  }
  if (blocks.some(b => !b.nucleus)) throw new Error('E-ORDER: 음절핵 없음');
  return blocks;
}

export function validateModel(model) {
  const tokens = new Set(model.phonemeTokens.map(t => t.id));
  const units = new Map(model.mappingUnits.map(u => [u.id, u]));
  if (tokens.size !== model.phonemeTokens.length || units.size !== model.mappingUnits.length) throw new Error('E-REFERENCE: 중복 ID');
  const consumed = new Set(); const elements = new Set();
  for (const unit of units.values()) for (const id of unit.token_ids) {
    if (!tokens.has(id)) throw new Error('E-REFERENCE: 없는 음소');
    if (consumed.has(id)) throw new Error('E-COVERAGE: 음소 중복 소비');
    consumed.add(id);
  }
  for (const b of model.blocks) for (const role of ['onset', 'nucleus', 'coda']) for (const [id, n] of b[role]) {
    const u = units.get(id); const key = `${id}:${n}`;
    if (!u || !Number.isInteger(n) || n < 0 || n >= u.jamo_values.length) throw new Error('E-REFERENCE: 없는 자모 요소');
    if (elements.has(key)) throw new Error('E-COVERAGE: 자모 요소 중복');
    elements.add(key);
  }
  if (consumed.size !== tokens.size || elements.size !== [...units.values()].reduce((n, u) => n + u.jamo_values.length, 0)) throw new Error('E-COVERAGE: 미소비 항목');
  return true;
}

function tokenize(source, accent, rules, issues) {
  let text = source.normalize('NFC');
  if (text !== source) rules.push({ rule_id: 'ipa-nfc', before: source, after: text });
  if (text.includes(':')) { const next = text.replaceAll(':', 'ː'); rules.push({ rule_id: 'length-colon', before: text, after: next }); text = next; }
  const segments = [{ tokens: [], stress: 'unknown', explicit: false }];
  const all = []; let pendingBoundary = false;
  for (let i = 0; i < text.length;) {
    const c = text[i]; let segment = segments.at(-1);
    if (c === '.' || c === 'ˈ' || c === 'ˌ') {
      if (segment.tokens.length) { segment = { tokens: [], stress: 'unknown', explicit: true }; segments.push(segment); }
      else if (c === '.' && (i === 0 || pendingBoundary)) issues.push(issue('E-BOUNDARY', '빈 음절 경계가 있습니다.'));
      if (c !== '.') {
        if (segment.stress !== 'unknown') issues.push(issue('E-STRESS', '한 음절에 강세 표지가 중복되었습니다.'));
        segment.stress = c === 'ˈ' ? 'primary' : 'secondary';
      }
      segment.explicit = true; pendingBoundary = true; i++; continue;
    }
    const found = SYMBOLS.find(s => text.startsWith(s, i));
    if (!found) { issues.push(issue('E-IPA', `대응 규칙이 없는 기호: ${c}`, { symbol: c, offset: i })); i += c.length; continue; }
    const normalized = ALIASES[found] || found;
    if (found !== normalized) rules.push({ rule_id: 'ipa-symbol-alias', before: found, after: normalized, offset: i });
    let symbols = [normalized];
    if (normalized === 'ɚ' && accent === 'ga') {
      symbols = ['ə', 'ɹ']; rules.push({ rule_id: 'ga-schwa-r', before: found, after: 'əɹ', offset: i });
    }
    for (const sym of symbols) {
      const syllabic = sym.includes('̩');
      const kind = VOWELS[sym] || ['ɚ', 'ɝ'].includes(sym) || syllabic ? 'nucleus' : 'consonant';
      const t = { id: `t${all.length + 1}`, ipa: sym, source_symbol: found, source_offset: i, kind, ...(syllabic ? { syllabic: true } : {}) };
      all.push(t); segment.tokens.push(t);
    }
    i += found.length; pendingBoundary = false;
  }
  if (pendingBoundary) issues.push(issue('E-BOUNDARY', '음절 경계 뒤에 소리가 없습니다.'));
  return { segments: segments.filter(s => s.tokens.length), tokens: all };
}

function syllabify(segments, warnings, issues) {
  const blocks = []; let inferred = false;
  for (const segment of segments) {
    const ts = segment.tokens; const nuclei = ts.map((t, i) => t.kind === 'nucleus' ? i : -1).filter(i => i >= 0);
    if (!nuclei.length) { issues.push(issue('E-NUCLEUS', '모음핵이 없는 음절입니다. 모음을 임의로 넣지 않았습니다.')); blocks.push({ tokens: ts, stress: segment.stress }); continue; }
    const cuts = [0];
    for (let i = 1; i < nuclei.length; i++) {
      inferred = true;
      const left = nuclei[i - 1] + 1, right = nuclei[i]; let cut = right;
      for (let k = left; k < right; k++) {
        const cluster = ts.slice(k, right).map(t => t.ipa).join('');
        if ((right - k === 1 && CONSONANTS[cluster]?.onset) || ONSETS.has(cluster)) { cut = k; break; }
      }
      cuts.push(cut);
    }
    cuts.push(ts.length);
    for (let i = 0; i < cuts.length - 1; i++) blocks.push({ tokens: ts.slice(cuts[i], cuts[i + 1]), stress: i === 0 ? segment.stress : 'unknown' });
  }
  if (inferred) warnings.push(issue('W-SYLLABLE-INFERRED', '음절 경계를 자동 추정했습니다. IPA에 점(.)을 넣으면 경계를 직접 지정할 수 있습니다.'));
  return { blocks, inferred };
}

export function convertWord(sourceIPA, { accent = 'rp', spelling = '', provenance = { kind: 'user-input' } } = {}) {
  if (!['rp', 'ga'].includes(accent)) throw new Error('지원하지 않는 발음 기준');
  if (typeof sourceIPA !== 'string' || !sourceIPA.trim()) throw new Error('IPA를 입력해 주세요.');
  if (sourceIPA.length > 1000 || /\s/.test(sourceIPA.trim())) throw new Error('한 레코드에는 1,000자 이내의 한 단어 IPA를 넣어 주세요.');
  const issues = [], warnings = [], normalization_rules = [];
  let input = sourceIPA.trim();
  if (/^\/.*\/$/.test(input)) { normalization_rules.push({ rule_id: 'remove-ipa-delimiters', before: input, after: input.slice(1, -1) }); input = input.slice(1, -1); }
  // [ ] indicates phonetic input; don't silently treat it as phonemic.
  if (input.startsWith('[') || input.endsWith(']')) issues.push(issue('E-NARROW', '이 변환기는 Broad용입니다. 좁은 표기 [ ]는 별도 음성층이 필요합니다.'));
  const { tokens, segments } = tokenize(input, accent, normalization_rules, issues);
  const split = syllabify(segments, warnings, issues);
  const hasStress = split.blocks.some(b => b.stress !== 'unknown');
  const model = { status: 'complete', phonemeTokens: tokens, mappingUnits: [], blocks: [] };
  const displays = []; const serializedBlocks = [];
  const add = (ts, ids, codes, rule, extra = {}) => {
    const u = { id: `m${model.mappingUnits.length + 1}`, token_ids: ts.map(t => t.id), jamo_values: ids, codepoints: codes, rule_id: rule, ...extra };
    model.mappingUnits.push(u); return ids.map((_, i) => [u.id, i]);
  };
  for (const raw of split.blocks) {
    const nucleusAt = raw.tokens.findIndex(t => t.kind === 'nucleus');
    const b = { id: `b${model.blocks.length + 1}`, stress: raw.stress === 'unknown' && hasStress ? 'none' : raw.stress, onset: [], nucleus: [], coda: [] };
    const chunks = { onset: [], nucleus: [], coda: [] }; const codes = [];
    const consume = (role, ts, ids, cp, rule, extra) => {
      b[role].push(...add(ts, ids, cp, rule, extra));
      chunks[role].push(...cp.map(c => c ? chr(c) : '□'));
      codes.push(...cp.filter(Boolean));
    };
    if (nucleusAt === 0) consume('onset', [], ['JV-ZERO'], ['110B'], 'zero-onset', { silent: true });
    for (let i = 0; i < raw.tokens.length; i++) {
      const t = raw.tokens[i]; const role = i < nucleusAt ? 'onset' : i === nucleusAt ? 'nucleus' : 'coda';
      const entry = CONSONANTS[t.ipa];
      if (role === 'nucleus') {
        const v = VOWELS[t.ipa];
        if (!v || !v.modules.includes(accent) || (t.ipa === 'ɔ' && accent !== 'ga')) {
          issues.push(issue(t.syllabic ? 'E-SYLLABIC' : 'E-VOWEL', t.syllabic ? `음절자음 /${t.ipa}/의 모음핵 직렬화는 미결입니다.` : `/${t.ipa}/는 선택한 모듈에서 대응이 미결이거나 지원 범위 밖입니다.`, { token_id: t.id }));
          consume(role, [t], t.syllabic && CONSONANTS[t.ipa.replace('̩','')] ? [CONSONANTS[t.ipa.replace('̩','')].id] : [], t.syllabic && CONSONANTS[t.ipa.replace('̩','')] ? [null] : [], 'unresolved-nucleus');
          chunks.nucleus.push(`/${t.ipa}/`);
        } else consume(role, [t], v.ids, v.codes, `nucleus-${t.ipa}`, { rule_status: v.ids.length > 1 ? 'trial' : 'mapped', ...(v.ids.length > 1 ? { composition: true } : {}) });
      } else if (role === 'coda' && t.ipa === 't' && raw.tokens[i + 1]?.ipa === 's') {
        consume(role, [t, raw.tokens[++i]], ['JV-TS'], ['11BE'], 'coda-ts', { reverse_ipa: ['t', 's'] });
      } else if (entry) {
        let cp = entry[role];
        if (t.ipa === 's' && role === 'onset') cp = raw.tokens[i + 1]?.kind === 'nucleus' && !['uː', 'ʊ'].includes(raw.tokens[i + 1].ipa) ? '110A' : '1109';
        if (!cp) issues.push(issue('E-POSITION', `/${t.ipa}/의 ${role === 'coda' ? '종성' : '초성'} 부호가 미배당입니다.`, { token_id: t.id, role }));
        if (['j', 'w'].includes(t.ipa)) warnings.push(issue('W-GLIDE', `/${t.ipa}/는 기저값 명시형입니다. 모음과의 최종 결합형은 미결입니다.`));
        consume(role, [t], [entry.id], [cp], `${role}-${t.ipa}`, t.ipa === 's' ? { rule_status: 'trial' } : {});
      } else {
        issues.push(issue('E-PHONE', `/${t.ipa}/의 Broad 대응을 확정하지 않았습니다.`, { token_id: t.id }));
        consume(role, [t], [], [], 'unresolved-phone');
      }
    }
    b.ipa = raw.tokens.map(t => t.ipa).join('');
    model.blocks.push(b); serializedBlocks.push(codes.map(chr).join(''));
    displays.push({ ...chunks, stress: b.stress, ipa: b.ipa });
  }
  if (!tokens.length) issues.push(issue('E-EMPTY', '분석할 음소가 없습니다.'));
  validateModel(model);
  let canonical = serializedBlocks.join('');
  if (!issues.length) parseCanonical(canonical);
  if (issues.length) { model.status = 'unresolved'; canonical = null; }
  const normalized = model.blocks.map(b => (b.stress === 'primary' ? 'ˈ' : b.stress === 'secondary' ? 'ˌ' : '') + b.ipa).join('.');
  return {
    schema_version: VERSION, module_id: `en-${accent.toUpperCase()}`, registry_version: VERSION,
    source: { spelling, ipa: sourceIPA, provenance },
    normalized_ipa: issues.some(e => ['E-IPA','E-VOWEL','E-NARROW','E-EMPTY'].includes(e.code)) ? null : normalized,
    normalization_rules,
    analysis: { syllabification: split.inferred ? 'inferred-maximal-onset-trial-v1' : model.blocks.length > 1 ? 'source-boundaries' : 'single-nucleus', status: issues.length ? 'unresolved' : split.inferred ? 'review-needed' : 'mapped' },
    canonicalModel: model,
    serialization: { profile: 'hmbr-broad-nfd-draft-2026-09-08', status: canonical === null ? 'unavailable' : 'available', text: canonical, codepoints: canonical === null ? [] : codepoints(canonical) },
    display: { profile: 'linear-elements-v1', blocks: displays }, issues, warnings
  };
}

export function convertPhrase(ipa, options = {}) {
  let body = ipa.trim();
  if (body.startsWith('/') && body.endsWith('/')) body = body.slice(1, -1);
  if (body.length > 5000) throw new Error('입력은 5,000자 이내로 줄여 주세요.');
  const words = body.split(/\s+/).filter(Boolean);
  if (!words.length) throw new Error('IPA를 입력해 주세요.');
  if (words.length > 100) throw new Error('한 번에 100단어까지 변환할 수 있습니다.');
  return { schema_version: VERSION, source_input: ipa, records: words.map((word, i) => convertWord(word, { ...options, spelling: options.spellings?.[i] || '' })) };
}
