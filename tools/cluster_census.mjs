#!/usr/bin/env node
// 제3본 §21 「훈민바름 연쇄가 막히는 지점」 재현 스크립트.
//
// RP·GA 발음사전에서 낱말 첫머리·끝의 자음군과 2요소 음절핵을 전수 추출하고,
// 각 연쇄를 제2본 §3·§8 등록부의 초성형·종성형 자모로 옮긴 뒤,
// 그 연쇄에 해당하는 겹낱자 부호가 Unicode에 배당되어 있는지를 공식 이름으로 대조한다.
//
//   node tools/cluster_census.mjs            → 표 출력
//   node tools/cluster_census.mjs --json     → JSON 출력
//
// 방법·한계는 제3본 부록 C와 같다. 어두·어말만 다루므로 종수는 실제 필요량의 하한이다.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const NAMES = read('data/jamo-names.json').names;                 // 'U+XXXX' 없이 'XXXX' → 이름
const BYNAME = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [v, k]));

// ── IPA 정규화·분절 (제3본 부록 C.2) ────────────────────────────────
const NORM = { r:'ɹ', g:'ɡ', 'ʧ':'tʃ', 'ʤ':'dʒ', 'ʦ':'ts', 'ɘ':'ə', 'ɐ':'ʌ', 'ɵ':'ə', 'ɫ':'l', 'ɬ':'l', 'ɭ':'l', 'ɲ':'n', 'ɳ':'n', 'ɾ':'t', 'ʀ':'ɹ', 'ʁ':'ɹ', 'ɚ':'əɹ', 'ɝ':'ɜː', 'ᵻ':'ɪ', 'ᵿ':'ʊ', 'ᵊ':'ə', 'ǝ':'ə', 'ʝ':'j', 'ʍ':'w', 'ʔ':'', x:'k', 'ɣ':'ɡ', 'β':'v', 'ɥ':'j', 'ʋ':'v', 'ʂ':'ʃ', 'ʐ':'ʒ' };
const DROP = new Set([...'ˈˌ.-‿ ‖|’‘\'`,;:#+<=>?[]_1235']);
const CONS = ['tʃ','dʒ','p','b','t','d','k','ɡ','f','v','θ','ð','s','z','ʃ','ʒ','h','m','n','ŋ','l','ɹ','j','w'];
const BASE = ['i','ɪ','e','ɛ','æ','a','ɑ','ɒ','ɔ','o','ʊ','u','ʌ','ə','ɜ','y'];
const DIPH = ['ɪə','ʊə','eə','aɪ','aʊ','eɪ','ɔɪ','əʊ','oʊ','ɛə','ɔə','ɑɪ','ɑʊ'];
const VOW = [...DIPH, ...BASE.map(b => b + 'ː'), ...BASE];
const TOK = [...CONS, ...VOW].sort((a, b) => b.length - a.length);
const VS = new Set(VOW);
const norm = s => [...s].filter(c => !DROP.has(c)).map(c => NORM[c] ?? c).join('');
function toks(s) { const r = []; let i = 0; outer: while (i < s.length) { for (const t of TOK) if (s.startsWith(t, i)) { r.push(t); i += t.length; continue outer; } return null; } return r; }

// ── 훈민바름 자모 (제2본 §3·§8 · 제3본 §4) ──────────────────────────
const CHO = { p:'1111', b:'1107', t:'1110', d:'1103', k:'110F', 'ɡ':'1100', f:'114B', v:'1144', 'θ':'1145', 'ð':'1142', s:'1109', z:'1136', 'ʃ':'1140', 'ʒ':'1146', 'tʃ':'1149', 'dʒ':'1148', h:'1112', m:'1106', n:'1102', l:'1105', 'ɹ':'A976', j:'1159', w:'1147' };
const JON = { p:'11C1', b:'11B8', t:'11C0', d:'11AE', k:'11BF', 'ɡ':'11A8', f:'11F4', v:'11E6', s:'11BA', z:'D7EF', 'ʃ':'11EB', m:'11B7', n:'11AB', 'ŋ':'11BC', l:'11AF', 'ɹ':'D7DB' };
const JUNG = { 'ㅣ':'1175', 'ㅏ':'1161', 'ㅗ':'1169', 'ㅜ':'116E', 'ㅓ':'1165', 'ㅔ':'1166', 'ᆝ':'119D', 'ᆍ':'118D', 'ᆞ':'119E' };
const NUCLEI = [['/iː/','ㅣㅣ'],['/ɑː/','ㅏㅏ'],['/ɔː/','ㅗㅗ'],['/uː/','ㅜㅜ'],['/ɜː/','ㅓㅓ'],['/ɛː/','ㅔㅔ'],['/eɪ/','ㅔᆝ'],['/aɪ/','ㅏᆝ'],['/ɔɪ/','ㅗᆝ'],['/aʊ/','ㅏᆍ'],['/əʊ/','ᆞᆍ'],['/oʊ/','ㅗᆍ'],['/ɪə/','ᆝᆞ'],['/ʊə/','ᆍᆞ']];
const ASSIGNED = { '118D': '/ʊ/', '1182': '/ɔ/ (GA)', '119D': '/ɪ/', '119E': '/ə/' };

const part = cp => NAMES[cp].split(' ').slice(2).join(' ');
function registered(kind, cps) { if (cps.some(c => !c)) return null; return BYNAME[`HANGUL ${kind} ${cps.map(part).join('-')}`] ?? null; }

function scan(dict) {
  const ons = new Map(), cod = new Map(); let ok = 0, skip = 0;
  const inc = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const ipa of Object.values(dict)) {
    const t = toks(norm(ipa));
    if (!t || !t.some(x => VS.has(x))) { skip++; continue; }
    ok++;
    const first = t.findIndex(x => VS.has(x)); let last = t.length - 1; while (!VS.has(t[last])) last--;
    inc(ons, t.slice(0, first).join(' ')); inc(cod, t.slice(last + 1).join(' '));
  }
  return { ons, cod, ok, skip };
}
function classify(counter, MAP, kind, skipTS = false) {
  const reg = [], unreg = [], unmapped = []; let ts = 0;
  for (const [k, n] of counter) {
    const seq = k ? k.split(' ') : [];
    if (seq.length < 2) continue;
    if (skipTS && seq.join('') === 'ts') { ts = 1; continue; }     // /t+s/ = 복합값 ㅊ (종류 수에는 넣고 대조에서는 뺀다)
    const cps = seq.map(x => MAP[x]);
    if (cps.some(c => !c)) { unmapped.push([k, n]); continue; }
    const r = registered(kind, cps);
    (r ? reg : unreg).push([k, n, r]);
  }
  const by = a => a.sort((x, y) => y[1] - x[1]);
  return { reg: by(reg), unreg: by(unreg), unmapped: by(unmapped), ts };
}

const out = {};
for (const [tag, file] of [['RP', 'data/dict-rp.json'], ['GA', 'data/dict-ga.json']]) {
  const { ons, cod, ok, skip } = scan(read(file));
  const O = classify(ons, CHO, 'CHOSEONG'), C = classify(cod, JON, 'JONGSEONG', true);
  const total = ok + skip;
  // 해소율 곡선
  const need = [...O.unreg, ...C.unreg].sort((a, b) => b[1] - a[1]); const sum = need.reduce((s, x) => s + x[1], 0);
  let acc = 0; const curve = {}; need.forEach(([, n], i) => { acc += n; if ([10, 20, 30, 40, 50, 60, 80, 100, 150, 200].includes(i + 1)) curve[i + 1] = +(100 * acc / sum).toFixed(1); });
  out[tag] = {
    entries: total, parsed: ok, parsed_pct: +(100 * ok / total).toFixed(1),
    onset: { types: O.reg.length + O.unreg.length + O.unmapped.length, registered: O.reg.length, unregistered: O.unreg.length, jamo_unassigned: O.unmapped.length, top_unregistered: O.unreg.slice(0, 12).map(([k, n]) => [k.replace(/ /g, ''), n]), registered_list: O.reg.map(([k, n, r]) => [k.replace(/ /g, ''), n, 'U+' + r]) },
    coda:  { types: C.reg.length + C.unreg.length + C.unmapped.length + C.ts, compound_ts: C.ts, registered: C.reg.length, unregistered: C.unreg.length, jamo_unassigned: C.unmapped.length, top_unregistered: C.unreg.slice(0, 12).map(([k, n]) => [k.replace(/ /g, ''), n]) },
    new_codepoints_needed: need.length, resolution_curve_pct: curve,
  };
}
out.nuclei = NUCLEI.map(([ipa, jl]) => { const r = registered('JUNGSEONG', [...jl].map(c => JUNG[c])); return { nucleus: ipa, jamo: jl, registered: r ? 'U+' + r : null, conflict: r && ASSIGNED[r] ? `U+${r} 는 이미 ${ASSIGNED[r]} 에 배당됨` : null }; });

if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const tag of ['RP', 'GA']) {
  const o = out[tag];
  console.log(`== ${tag}  표제어 ${o.entries.toLocaleString()} · 해석 ${o.parsed.toLocaleString()} (${o.parsed_pct}%)`);
  for (const [nm, x] of [['어두 초성군', o.onset], ['어말 종성군', o.coda]])
    console.log(`   ${nm}  ${x.types}종 · 겹낱자 부호 있음 ${x.registered} · 없음 ${x.unregistered} · 자모 미배당 ${x.jamo_unassigned}`);
  console.log(`   미등록 상위: ${o.onset.top_unregistered.slice(0, 8).map(([k, n]) => `/${k}/ ${n}`).join(' · ')}`);
  console.log(`   완전 해소에 필요한 새 겹낱자 ${o.new_codepoints_needed}종 · 상위 60종이면 ${o.resolution_curve_pct[60]}% 해소`);
}
console.log('== 2요소 음절핵 14종');
for (const n of out.nuclei) console.log(`   ${n.nucleus.padEnd(6)} ${n.jamo}  ${n.registered ?? '없음'}${n.conflict ? '  ← ' + n.conflict : ''}`);
