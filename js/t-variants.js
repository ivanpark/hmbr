// Optional GA surface annotations. No new HMBR glyphs or Broad phonemes.
export const T_SOURCES = {
  allophones:'https://pronuncian.com/when-t-doesnt-sound-like-t/',
  glottal:'https://pages.ucsd.edu/~mgarellek/files/Seyfarth_Garellek_2020_LabPhon.pdf',
  nasal:'https://languagelog.ldc.upenn.edu/nll/?p=62989',
  deletion:'https://tfcs.baruch.cuny.edu/deletion/',
  unreleased:'https://corpus.eduhk.hk/english_pronunciation/index.php/3-2-acoustic-aspects-of-consonants/'
};
const vowel=/^[aeiouæɑɒɔəɛɜɪʊʌɐɚɝ]$/u;
const sonorant=/^[mnŋlɹ]$/u;
const consonant=/^[pbtdkɡfvθðszhʃʒmnŋlɹjw]$/u;
const withoutMarks=s=>s.replace(/[ˈˌ.ː]/gu,'');

export function tVariants(model,{pace,emphasis,pauses}) {
  if(model.accent!=='ga')return [];
  const result=[];
  model.words.forEach((w,i)=>{
    if(!w.usable)return;
    const record=model.records[i],tokens=record.canonicalModel.phonemeTokens;
    let cursor=0;
    tokens.forEach((token,j)=>{
      const offset=w.ipa.indexOf(token.ipa,cursor);
      if(offset<0)return;
      cursor=offset+token.ipa.length;
      if(token.ipa!=='t')return;
      const left=withoutMarks(w.ipa.slice(0,offset)).at(-1)||'';
      const tail=w.ipa.slice(offset+1),right=withoutMarks(tail)[0]||'';
      const final=j===tokens.length-1;
      const next=model.words[i+1];
      const nextSound=final && next?.usable && !pauses.has(i) ? withoutMarks(next.ipa)[0]||'' : right;
      const nextToken=tokens[j+1];
      const nextUnit=record.canonicalModel.mappingUnits.find(u=>u.token_ids.includes(nextToken?.id));
      const nextBlock=record.canonicalModel.blocks.find(b=>[...b.onset,...b.nucleus,...b.coda].some(ref=>ref[0]===nextUnit?.id));
      const unstressed=nextBlock?.stress==='none';
      const group=final?`t-final:${i}`:`t:${i}:${token.id}`;
      const context=final ? (pauses.has(i)||!next?'쉼 앞':`${next.label} 앞`) : `${w.label} 내부`;
      const add=(suffix,title,replacement,length,reason,practice,source,extra={})=>{
        const after=w.ipa.slice(0,offset)+replacement+w.ipa.slice(offset+length);
        const affected=tokens.slice(j,j+(extra.tokenCount||1));
        result.push({id:`${suffix}:${i}:${token.id}`,kind:suffix,index:i,boundary:final&&next?i:null,
          group,title,label:final&&next?`${w.label} → ${next.label}`:w.label,
          before:`/${w.ipa}/`,after:`[${after}]`,blocked:'',recommended:false,priority:2,
          reason,practice,source,offset,length,replacement,
          annotation:{word_index:i,token_ids:affected.map(t=>t.id),underlying_ipa:affected.map(t=>t.ipa).join(''),
            surface_ipa:replacement,feature_id:suffix,environment:context,source},...extra});
      };
      // /nt/ before a non-prominent vowel; /tən/ is reserved for the nasal/glottal case.
      if(!final && left==='n' && vowel.test(right) && unstressed && !/^[.]*ən(?:$|[.])/u.test(tail)) {
        add('ntdrop','GA n 뒤 t 탈락','',1,
          '/n/ 뒤에서 다음 모음이 무강세일 때 /t/가 들리지 않는 변이가 가능합니다. 비음 탄설음 등 다른 실현도 있어 단순 탈락은 연습용 표면형입니다.',
          '혀끝으로 /n/을 낸 뒤 별도의 /t/ 폐쇄·파열을 더하지 않고 다음 약한 모음으로 넘어가세요. 강세 음절 앞에서는 이 규칙을 적용하지 않습니다.',T_SOURCES.allophones,
          {broad:true,blocked:emphasis.has(i)?'강조 보호 중에는 t 탈락을 적용하지 않습니다.':'',recommended:pace==='fast'&&!emphasis.has(i)});
      }
      const eligibleLeft=vowel.test(left)||sonorant.test(left);
      const nasalEnding=!final && /^[.]*ən$/u.test(tail) && unstressed;
      const beforeConsonant=consonant.test(nextSound) && (final || !/^[.]*[ˈˌ]/u.test(tail));
      const beforePause=final && (!next||pauses.has(i));
      if(eligibleLeft && (nasalEnding||beforeConsonant||beforePause)) {
        const length=nasalEnding?1+tail.length:1;
        add('glottal',nasalEnding?'GA t + ən → ʔn̩':'GA t 성문음화 · [ʔ]',nasalEnding?'ʔn̩':'ʔ',length,
          nasalEnding?'button형의 무강세 /ən/에서 성문음화와 모음 약화가 함께 나타나는 선택지입니다. /ə/ 없이 [n̩]이 음절핵이 되는 실현을 표시합니다.':
          '성대를 가까이해 성문에서 흐름을 잠시 제한하는 실현입니다. t가 완전히 없어진 탈락과 다르며, 치경 폐쇄를 함께 유지하는 성문 강화 [ʔt]도 가능합니다.',
          '“uh-oh” 사이처럼 목청에서 짧게 끊기는 느낌을 내 보세요. 목을 세게 조이지 마세요. '+(nasalEnding?'그 뒤 별도의 모음을 끼우지 않고 코로 [n̩]을 이어 한 음절을 만드세요.':'입술·혀의 다음 소리 준비와 함께 가볍게 이어 보세요.'),T_SOURCES.glottal,
          {tokenCount:nasalEnding?3:1,narrow:true,displayNote:nasalEnding?'원형 참조 · [ʔ, n̩] 자형 미결':'원형 참조 · [ʔ] 자형 미정',
            recommended:pace!=='slow'&&!emphasis.has(i)&&(nasalEnding||/^[mnl]$/u.test(nextSound)||(pace==='fast'&&beforeConsonant))});
      }
      if(final && (beforeConsonant||beforePause)) {
        add('unreleased','미파열 t · [t̚]','t̚',1,
          '혀의 치경 폐쇄는 유지하지만 분명한 파열을 내지 않는 실현입니다. 무음 ∅나 성문파열 [ʔ]과 동일하지 않습니다.',
          '혀끝을 윗잇몸에 댄 채 /t/를 막고, 별도의 “트”나 강한 파열을 덧붙이지 마세요. 성문을 닫는 동작은 이 선택의 필수 조건이 아닙니다.',T_SOURCES.unreleased,
          {narrow:true,displayNote:'원형 참조 · 미파열 [t̚] 주석'});
      }
    });
  });
  return result;
}

export function resolveTChoices(selection,candidates) {
  const groups=new Map(candidates.map(c=>[c.id,c.group]));
  // Boundary elision competes with other realisations of that same final /t/.
  const group=id=>groups.get(id)||(/^elision:\d+$/u.test(id)?id.replace('elision:','t-final:'):null);
  const result=[];
  for(const id of selection){const g=group(id);if(g){const n=result.findIndex(x=>group(x)===g);if(n>=0)result.splice(n,1);}if(!result.includes(id))result.push(id);}
  return result;
}
