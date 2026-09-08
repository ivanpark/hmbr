import { convertWord, convertPhrase } from './engine.js';
import { lookup } from './dict.js';
import { VERSION } from './registry.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
let request = 0, bundle = null;
const mode = () => document.querySelector('[name="mode"]:checked').value;
const accent = () => document.querySelector('[name="accent"]:checked').value;
function status(text = '', type = '') { $('status').textContent = text; $('status').className = `status ${type}`; }
function busy(value) { $('btn-convert').disabled = value; $('out-panel').setAttribute('aria-busy', String(value)); }
function invalidate() {
  request++; bundle = null; busy(false); status();
  $('btn-copy').disabled = true; $('btn-json').disabled = true;
  $('manual-copy').hidden = true; $('result-notes').hidden = true;
  $('word-results').replaceChildren(el('p', '입력을 바꿨습니다. 변환하면 새 결과가 나타납니다.', 'empty-message'));
  $('record-inspector').replaceChildren(el('p', '변환 후 대응 정보를 확인할 수 있습니다.'));
  $('result-state').textContent = '입력 대기'; $('result-state').className = 'state';
}
function addNote(text) { $('result-notes').append(el('p', text)); $('result-notes').hidden = false; }
function render(result) {
  bundle = result;
  const records = result.records;
  const ready = records.length > 0 && records.every(r => r.serialization.status === 'available');
  const review = records.some(r => r.analysis.status !== 'mapped' || r.source.provenance.review_status === 'unreviewed');
  $('word-results').replaceChildren(); $('record-inspector').replaceChildren(); $('result-notes').replaceChildren(); $('result-notes').hidden = true;
  $('manual-copy').hidden = true;
  $('result-state').textContent = !ready ? '미결 항목 있음' : review ? '검토 필요 · 시범 변환' : '시범 변환';
  $('result-state').className = `state${!ready || review ? ' warning' : ''}`;
  const notes = new Set();
  for (const r of records) {
    const article = el('article', undefined, 'word-result');
    const label = el('p', undefined, 'word-label'); label.append(el('span', r.source.spelling || 'IPA 직접 입력'));
    const provenance = r.source.provenance;
    label.append(el('span', provenance.kind === 'document-example' ? '문서 예시' : provenance.kind === 'supplied-dictionary' ? '사전 · 검수 전' : '직접 입력', 'source-chip'));
    article.append(label);
    if (r.serialization.status === 'available') {
      const display = el('div', undefined, 'hmbr');
      display.setAttribute('aria-label', `${r.source.spelling || r.source.ipa}, ${r.canonicalModel.blocks.length}개 음절블록`);
      for (const b of r.display.blocks) {
        const block = el('span', undefined, 'block');
        block.style.fontSize = `${({primary:1.25, secondary:1, none:.75, unknown:1})[b.stress]}em`;
        block.title = `/${b.ipa}/ · ${{primary:'제1강세',secondary:'제2강세',none:'무강세',unknown:'강세 미지정'}[b.stress]}`;
        block.append(el('span', '〔', 'bracket'));
        for (const role of ['onset','nucleus','coda']) for (const character of b[role]) {
          block.append(el('span', character, `element${role === 'coda' && character === 'ᆺ' ? ' s-coda' : ''}`));
        }
        block.append(el('span', '〕', 'bracket')); display.append(block);
      }
      article.append(display);
    } else {
      const unavailable = el('p', '직렬화 미결', 'unavailable');
      unavailable.append(el('small', '원문과 음소 구조는 전체 기록에 보존됩니다.'));
      article.append(unavailable);
    }
    article.append(el('p', `/${r.source.ipa.replace(/^\/|\/$/g,'')}/`, 'word-ipa'));
    $('word-results').append(article);
    for (const msg of [...r.issues, ...r.warnings]) notes.add(`${r.source.spelling || r.source.ipa}: ${msg.message}`);
    if (provenance.review_status === 'unreviewed') notes.add(provenance.note + '. 사전의 IPA가 올바른지는 별도로 확인해 주세요.');
    renderInspector(r);
  }
  for (const note of notes) addNote(note);
  if (!ready) addNote('미결 단어가 포함되어 자모열 전체 복사를 제공하지 않습니다. 전체 기록에는 모든 단어의 상태가 함께 저장됩니다.');
  $('btn-copy').disabled = !ready; $('btn-json').disabled = false;
  status(!ready ? '변환 가능한 항목과 미결 사유를 확인해 주세요.' : '변환했습니다.', !ready ? '' : 'ok');
}
function renderInspector(r) {
  const section = el('section', undefined, 'record-inspect'); section.append(el('h3', r.source.spelling || r.source.ipa));
  const dl = el('dl');
  const pairs = [['원문 IPA',r.source.ipa],['분석 IPA',r.normalized_ipa || '미결 · 원문 참조'],['발음 기준',r.module_id],['음절 경계',r.analysis.syllabification.startsWith('inferred') ? '자동 추정 · 확인 필요' : r.analysis.syllabification === 'source-boundaries' ? '입력 경계·강세 표지' : '단일 모음핵'],['출처',r.source.provenance.ref || r.source.provenance.note || '사용자 직접 입력']];
  for (const [k,v] of pairs) dl.append(el('dt',k),el('dd',v)); section.append(dl);
  section.append(el('p', r.serialization.text === null ? '평문 unavailable · 미배당값을 대신 채우지 않았습니다.' : r.serialization.codepoints.join(' '), 'code'));
  const scroll = el('div',undefined,'table-scroll'), table = el('table');
  const caption = el('caption','음소와 자모 요소의 대응');caption.className='sr-only'; table.append(caption);
  const head = el('tr');for (const title of ['입력 음소','자모값','자리별 코드']) { const th = el('th',title); th.scope='col';head.append(th); }
  const thead=el('thead');thead.append(head);table.append(thead);const body=el('tbody');
  for (const m of r.canonicalModel.mappingUnits) {
    const row=el('tr');const sounds=m.token_ids.map(id=>r.canonicalModel.phonemeTokens.find(t=>t.id===id).ipa).join(' + ') || '무음 초성';
    row.append(el('td',sounds),el('td',m.jamo_values.join(' + ') || '미결'),el('td',m.codepoints.map(c=>c ? `U+${c}`:'미배당').join(' ') || '미결'));body.append(row);
  }
  table.append(body);scroll.append(table);section.append(scroll);
  if (r.normalization_rules.length) section.append(el('p','기호 정규화: '+r.normalization_rules.map(x=>`${x.before} → ${x.after}`).join(', ')));
  $('record-inspector').append(section);
}
async function doConvert(event) {
  event?.preventDefault(); const id=++request; const selectedMode=mode(), selectedAccent=accent();
  const input=(selectedMode==='english' ? $('in-english'):$('in-ipa')).value.trim();
  bundle=null;$('btn-copy').disabled=true;$('btn-json').disabled=true;busy(true);status('소리를 살펴보는 중…');
  try {
    if (!input) throw new Error('영어 단어나 IPA를 입력해 주세요.');
    let result;
    if (selectedMode==='english') {
      const found=await lookup(input,selectedAccent);if(id!==request)return;
      if(found.missing.length)throw new Error(`사전에 없는 단어: ${found.missing.join(', ')}. IPA 직접 입력을 이용해 주세요.`);
      if(!found.entries.length)throw new Error('영어 단어를 입력해 주세요.');
      result={schema_version:VERSION,source_input:input,records:found.entries.map(e=>convertWord(e.ipa,{accent:selectedAccent,spelling:e.spelling,provenance:e.provenance}))};
    } else result=convertPhrase(input,{accent:selectedAccent});
    if(id===request)render(result);
  }catch(error){if(id===request){$('word-results').replaceChildren(el('p','결과를 만들지 못했습니다. 입력을 확인해 주세요.','empty-message'));$('record-inspector').replaceChildren();$('result-notes').hidden=true;$('manual-copy').hidden=true;$('result-state').textContent='입력 확인';status(error.message,'error');}}
  finally{if(id===request)busy(false);}
}
$('convert-form').addEventListener('submit',doConvert);
for(const input of [$('in-english'),$('in-ipa')]){
  input.addEventListener('input',()=>{invalidate();document.querySelectorAll('[data-example]').forEach(b=>b.classList.remove('selected'));});
  input.addEventListener('keydown',e=>{if(e.key==='Enter' && (e.ctrlKey||e.metaKey))doConvert(e);});
}
for(const input of document.querySelectorAll('[name="mode"]'))input.addEventListener('change',()=>{invalidate();$('english-field').hidden=mode()!=='english';$('ipa-field').hidden=mode()!=='ipa';(mode()==='english'?$('in-english'):$('in-ipa')).focus();});
for(const input of document.querySelectorAll('[name="accent"]'))input.addEventListener('change',()=>{invalidate();doConvert();});
for(const button of document.querySelectorAll('[data-example]'))button.addEventListener('click',()=>{
  invalidate();document.querySelectorAll('[data-example]').forEach(b=>b.classList.toggle('selected',b===button));
  const word=button.dataset.example;
  if(word==='catch') {document.querySelector('[name="mode"][value="ipa"]').checked=true;$('in-ipa').value='/kætʃ/';}
  else {document.querySelector('[name="mode"][value="english"]').checked=true;$('in-english').value=word;}
  $('english-field').hidden=mode()!=='english';$('ipa-field').hidden=mode()!=='ipa';doConvert();
});
$('font-size').addEventListener('input',e=>{$('word-results').style.setProperty('--output-size',`${e.target.value}px`);$('size-value').value=e.target.value;});
$('btn-copy').addEventListener('click',async()=>{
  if(!bundle || bundle.records.some(r=>r.serialization.text===null))return;
  const text=bundle.records.map(r=>r.serialization.text).join(' ');const id=request;
  try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);if(id===request)status('자모열을 복사했습니다. 강세·출처도 보존하려면 전체 기록을 저장하세요.','ok');}
  catch{if(id!==request)return;$('copy-value').value=text;$('manual-copy').hidden=false;$('copy-value').focus();$('copy-value').select();status('아래 자모열을 선택해 직접 복사해 주세요.');}
});
$('btn-json').addEventListener('click',()=>{
  if(!bundle)return;const blob=new Blob([JSON.stringify(bundle,null,2)+'\n'],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='hmbr-records.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('원문·강세·대응·미결 상태를 담은 기록을 저장했습니다.','ok');
});
doConvert();
