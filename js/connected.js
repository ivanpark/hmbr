import { convertWord } from './engine.js';
import { tVariants, resolveTChoices } from './t-variants.js?v=20261012-t-variants';

export const CONNECTED_VERSION = 'connected-speech-t-variants-20261012';
export const CONNECTED_SOURCES = {
  linking: 'https://www.teachingenglish.org.uk/professional-development/teachers/knowing-subject/connected-speech-part-2',
  weak: 'https://www.teachingenglish.org.uk/professional-development/teachers/knowing-subject/connected-speech-part-1',
  assimilation: 'https://www.britishcouncil.org.br/sites/default/files/lesson_plan_-_eng.pdf',
  r: 'https://www.collinsdictionary.com/dictionary/english/linking-r'
};
const vowel = /^[aeiouæɑɒɔəɛɜɪʊʌɐɚɝ]/u;
const consonant = /^[pbtdkɡfvθðszhʃʒmnŋlɹjw]$/u;
const plain = s => s.replace(/[\/ˈˌ.]/gu, '').replaceAll(':', 'ː');
const first = s => [...plain(s)][0] || '';
const last = s => [...plain(s)].at(-1) || '';
const weakForms = { a:'ə', an:'ən', and:'ənd', of:'əv', to:'tə', the:'ðə', can:'kən' };

// Original records are immutable. This is an explicitly separate practice layer.
export function createConnectedModel(records, { accent = 'rp', tokens = [] } = {}) {
  return {
    accent, records,
    words: records.map((r, i) => ({
      label: r.source.spelling || `IPA ${i + 1}`,
      spelling: r.source.spelling.toLowerCase(),
      ipa: r.normalized_ipa || r.source.ipa.replace(/^\/|\/$/gu, ''),
      usable: r.serialization.status === 'available',
      pause: /[,;:.!?…—–][”'’")\]]*$/u.test(tokens[i] || '')
    }))
  };
}

export function evaluateConnected(model, options = {}, selection = []) {
  const pace = ['slow','normal','fast'].includes(options.pace) ? options.pace : 'normal';
  const emphasis = new Set(options.emphasis || []);
  const pauses = new Set(options.pauses ?? model.words.flatMap((w,i) => w.pause ? [i] : []));
  const variants=tVariants(model,{pace,emphasis,pauses});
  const selected = new Set(resolveTChoices(selection,variants));
  const words = model.words.map(w => ({ ...w }));
  const candidates = [], applied = [], joins = new Set();
  const add = (c, run) => {
    const active = !c.blocked && selected.has(c.id);
    candidates.push({ ...c, active });
    if (active) { run(); applied.push(c.id); }
  };
  // Weak forms first: following boundary suggestions see the selected form.
  words.forEach((w,i) => {
    const target = weakForms[w.spelling], next = words[i + 1];
    if (!w.usable || !next?.usable || !target || plain(w.ipa) === target) return;
    // The /tə, ðə/ versions here are restricted to a following consonant.
    if (['to','the'].includes(w.spelling) && vowel.test(first(next.ipa))) return;
    const blocked = emphasis.has(i) ? '강조할 단어는 약화하지 않습니다.' : pauses.has(i) ? '쉼 앞에서는 이 약형을 제안하지 않습니다.' : '';
    add({id:`weak:${i}`,kind:'weak',title:'약형',index:i,boundary:null,
      label:w.label,before:w.ipa,after:target,blocked,
      recommended:!blocked && pace !== 'slow',source:CONNECTED_SOURCES.weak,
      reason:w.spelling === 'can' ? '조동사 can을 강조하지 않을 때의 선택지입니다. 명사·동사 can이면 적용하지 마세요.' : '강조하지 않는 기능어를 짧고 가볍게 읽는 선택지입니다.',
      practice:'모음을 /ə/로 짧게 내고 다음 단어로 이어 가세요. 뜻을 강조하려면 원형을 유지하세요.'}, () => { w.ipa = target; });
  });
  for (let i=0; i < words.length - 1; i++) {
    const left = words[i], right = words[i+1];
    if (!left.usable || !right.usable) continue;
    const a = last(left.ipa), b = first(right.ipa);
    const label = `${left.label} → ${right.label}`;
    const blocked = pauses.has(i) ? '이 경계에 쉼이 설정돼 있습니다.' : '';
    const protectedWord = emphasis.has(i) || emphasis.has(i+1);
    const before = `${left.ipa} | ${right.ipa}`;
    if (consonant.test(a) && vowel.test(b)) {
      add({id:`link:${i}`,kind:'link',title:'자음–모음 연결',index:i,boundary:i,label,before,
        after:`${left.ipa}‿${right.ipa}`,blocked,recommended:!blocked && !protectedWord,
        source:CONNECTED_SOURCES.linking,reason:'끝 자음 뒤에 모음이 와 끊지 않고 이어 읽을 수 있습니다.',
        practice:'끝 자음을 낸 뒤 입을 다시 준비하며 쉬지 말고 다음 모음으로 이어 가세요. 새 모음을 덧붙이지 마세요.'}, () => joins.add(i));
    } else if (model.accent === 'rp' && /r(?:e)?$/iu.test(left.spelling) && /[əɑɔɜ]ː?$|[ɪɛʊ]ə$/u.test(plain(left.ipa)) && vowel.test(b)) {
      add({id:`r:${i}`,kind:'link',title:'RP linking r',index:i,boundary:i,label,before,
        after:`${left.ipa}ɹ‿${right.ipa}`,blocked,recommended:!blocked && !protectedWord,
        source:CONNECTED_SOURCES.r,reason:'철자에 r이 있는 단어 뒤에 모음이 올 때의 RP 연결입니다.',
        practice:'혀끝을 입천장에 붙이지 않는 /ɹ/로 다음 모음을 연결하세요.'}, () => {left.ipa += 'ɹ'; joins.add(i);});
    }
    // Deliberately narrow assimilation family; no guessed substitutions.
    if (a === 'n' && /[pbm]/u.test(b)) {
      const nasalEnding = variants.some(c=>c.index===i&&c.annotation.token_ids.length>1&&selected.has(c.id));
      const stop = blocked || (protectedWord ? '강조한 단어 주변의 동화는 보호합니다.' : '') || (nasalEnding ? '[ʔn̩] 선택에는 마지막 n도 포함됩니다. 이 선택을 끈 뒤 n → m을 비교하세요.' : '');
      add({id:`assim:${i}`,kind:'assimilation',title:'동화 · n → m',index:i,boundary:i,label,before,
        after:`${left.ipa.slice(0,-1)}m‿${right.ipa}`,blocked:stop,recommended:!stop && pace === 'fast',
        source:CONNECTED_SOURCES.assimilation,reason:'뒤의 양순음에 맞춰 /n/의 조음 위치가 입술 쪽으로 옮겨갈 수 있습니다.',
        practice:'혀끝으로 /n/을 완전히 만든 뒤 이동하기보다, 입술을 미리 닫아 /m/에서 다음 소리로 이어 보세요.'}, () => {left.ipa = left.ipa.slice(0,-1)+'m'; joins.add(i);});
    }
    const preceding = [...plain(left.ipa)].at(-2);
    if (/[td]/u.test(a) && consonant.test(preceding || '') && consonant.test(b) && b !== 'h' && b !== 'j') {
      const stop = blocked || (protectedWord ? '강조한 단어 주변의 탈락은 보호합니다.' : '');
      add({id:`elision:${i}`,kind:'elision',title:`탈락 · ${a} → ∅`,index:i,boundary:i,label,before,
        group:`t-final:${i}`,priority:1,
        after:`${left.ipa.slice(0,-1)}‿${right.ipa}`,blocked:stop,recommended:!stop && pace === 'fast',
        source:CONNECTED_SOURCES.linking,reason:'자음군 끝의 /t, d/ 뒤에 자음이 올 때 생길 수 있는 선택적 탈락입니다.',
        practice:'가운데 /t, d/의 별도 폐쇄·파열을 생략하고 앞 자음에서 다음 단어로 이동해 보세요. 혀의 폐쇄를 유지한 미파열 [t̚]나 성문파열 [ʔ]과는 다릅니다. 원형을 유지하는 것도 가능합니다.'}, () => {left.ipa = left.ipa.slice(0,-1); joins.add(i);});
    }
  }
  const edits=words.map(()=>[]),surface_annotations=[];
  for(const c of variants)add(c,()=>{
    edits[c.index].push(c);surface_annotations.push(c.annotation);
    if(c.boundary!==null&&!pauses.has(c.boundary))joins.add(c.boundary);
  });
  words.forEach((w,i)=>{
    w.surface_ipa=w.ipa;w.display_notes=[];
    for(const c of edits[i].sort((a,b)=>b.offset-a.offset)){
      w.surface_ipa=w.surface_ipa.slice(0,c.offset)+c.replacement+w.surface_ipa.slice(c.offset+c.length);
      if(c.broad)w.ipa=w.ipa.slice(0,c.offset)+c.replacement+w.ipa.slice(c.offset+c.length);
      if(c.displayNote)w.display_notes.push(c.displayNote);
    }
  });
  // Offer only one default for competing realisations; manual choice remains reversible.
  for(const c of candidates)if(c.recommended&&c.group&&candidates.some(other=>other.recommended&&other.group===c.group&&(other.priority||0)>(c.priority||0)))c.recommended=false;
  const phrase = values => values.map((s,i) => s + (i === values.length-1 ? '' : pauses.has(i) ? ' | ' : joins.has(i) ? '‿' : ' ')).join('');
  const records = words.map((w,i) => w.ipa === model.words[i].ipa ? model.records[i] : convertWord(w.ipa, {
    accent:model.accent,spelling:model.records[i].source.spelling,
    provenance:{kind:'connected-speech-practice',original_ipa:model.records[i].source.ipa,ref:CONNECTED_VERSION}
  }));
  return { version:CONNECTED_VERSION, accent:model.accent, pace, emphasis:[...emphasis], pauses:[...pauses],
    candidates, applied, joins:[...joins], words, records,surface_annotations,
    surface_records:words.map((w,i)=>({word_index:i,ipa:w.surface_ipa,hmbr_reference_ipa:w.ipa,display_status:w.display_notes.length?'broad-reference':'derived',display_notes:w.display_notes})),
    original_ipa:model.words.map(w=>w.ipa).join(' '), connected_ipa:phrase(words.map(w=>w.surface_ipa)) };
}

export function recommendedConnections(model, options = {}) {
  const weak = evaluateConnected(model,options).candidates.filter(c=>c.kind === 'weak' && c.recommended).map(c=>c.id);
  return evaluateConnected(model,options,weak).candidates.filter(c=>c.recommended).map(c=>c.id);
}
