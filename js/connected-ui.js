import { createConnectedModel, evaluateConnected, recommendedConnections } from './connected.js?v=20261012-connected';
import { proportionalDisplayBlocks } from './display.js?v=20261012-haerye';

const el = (tag,text,cls) => {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const $ = id => document.getElementById(id);
export function connectedController() {
  let model=null, options={}, selected=[], renderRun=null, snapshot=null;
  const box=(id,text,checked,change)=>{
    const label=el('label',undefined,'connection-choice'), input=el('input');input.type='checkbox';input.id=id;input.checked=checked;
    input.addEventListener('change',()=>{change(input.checked);draw(id);});label.append(input,el('span',text));return label;
  };
  const set=(key,i,on)=>{const values=new Set(options[key]);on?values.add(i):values.delete(i);options[key]=[...values];};
  function draw(focus) {
    if(!model)return;
    snapshot=evaluateConnected(model,options,selected);selected=snapshot.applied;
    $('connected-count').textContent=`${snapshot.applied.length}개 적용 · ${snapshot.candidates.filter(c=>c.recommended).length}개 추천`;
    $('connected-original').textContent='/'+snapshot.original_ipa+'/';
    $('connected-ipa').textContent=snapshot.connected_ipa;
    const hasUnknown=model.words.some(w=>!w.usable);
    $('connected-warning').textContent=hasUnknown?'미결 단어가 닿는 경계는 추천하지 않습니다. 원문 IPA를 확인해 주세요.':model.records.some(r=>r.source.provenance.review_status==='unreviewed')?'사전의 미검수 IPA를 바탕으로 한 연습 제안입니다. 원문 발음도 확인해 주세요.':'추천은 강조·속도·쉼 설정을 바탕으로 한 선택지이며, 하나의 정답이 아닙니다.';
    $('connected-words').replaceChildren();
    model.words.forEach((w,i)=>{
      const card=el('div',undefined,'connected-word');card.append(el('strong',w.label));
      card.append(box(`cs-emphasis-${i}`,'강조 보호',options.emphasis.includes(i),on=>set('emphasis',i,on)));
      if(i<model.words.length-1)card.append(box(`cs-pause-${i}`,'뒤에서 쉼',options.pauses.includes(i),on=>set('pauses',i,on)));
      $('connected-words').append(card);
    });
    $('connected-candidates').replaceChildren();
    for(const c of snapshot.candidates){
      const item=el('li',undefined,'connection-card'+(c.active?' active':''));
      const id='cs-'+c.id.replace(':','-');
      const toggle=box(id,`${c.label} · ${c.title}`,c.active,on=>{selected=on?[...selected,c.id]:selected.filter(x=>x!==c.id);});
      toggle.querySelector('input').disabled=!!c.blocked;
      const badge=el('span',c.blocked?'보호됨':c.recommended?'추천':'선택 가능','connection-badge');
      item.append(toggle,badge,el('p',c.before+' → '+c.after,'ipa connection-change'),el('p',c.blocked||c.reason,'connection-reason'));
      const details=el('details'),summary=el('summary','어떻게 발음하나요?');details.append(summary,el('p',c.practice));
      const source=el('a','설명 근거 ↗');source.href=c.source;details.append(source);item.append(details);$('connected-candidates').append(item);
    }
    $('connected-empty').hidden=snapshot.candidates.length>0;
    $('connected-hmbr').replaceChildren();
    snapshot.records.forEach((r,i)=>{
      const part=el('span',undefined,'connected-render-word');part.title=model.words[i].label;
      if(r.serialization.status==='available' && renderRun){
        const display=el('span',undefined,'hmbr');
        for(const b of proportionalDisplayBlocks(r.display.blocks)){
          const block=el('span',undefined,'block');block.append(el('span','〔','bracket'));
          b.runs.forEach(run=>block.append(renderRun(run)));block.append(el('span','〕','bracket'));display.append(block);
        }
        part.append(display);
      }else part.append(el('span','자형 미결','artic-unresolved'));
      $('connected-hmbr').append(part);
      if(i<snapshot.records.length-1){const mark=options.pauses.includes(i)?' | ':snapshot.joins.includes(i)?'‿':'·';$('connected-hmbr').append(el('span',mark,'connected-join'));}
    });
    if(focus)document.getElementById(focus)?.focus({preventScroll:true});
  }
  $('connected-pace').addEventListener('change',e=>{options.pace=e.target.value;draw();});
  $('connected-apply').addEventListener('click',()=>{if(!model)return;selected=recommendedConnections(model,options);draw();});
  $('connected-reset').addEventListener('click',()=>{selected=[];draw();});
  return {
    clear(){model=null;snapshot=null;selected=[];$('connected-panel').hidden=true;},
    start(records,settings,renderer){
      this.clear();if(records.length<2)return;
      model=createConnectedModel(records,settings);renderRun=renderer;
      options={pace:$('connected-pace').value,emphasis:[],pauses:model.words.flatMap((w,i)=>w.pause?[i]:[])};
      $('connected-panel').hidden=false;draw();
    },
    export(){if(!snapshot)return null;return {version:snapshot.version,accent:snapshot.accent,options:structuredClone(options),
      original_ipa:snapshot.original_ipa,connected_ipa:snapshot.connected_ipa,applied:[...snapshot.applied],
      joins:[...snapshot.joins],candidates:structuredClone(snapshot.candidates),records:structuredClone(snapshot.records)};}
  };
}
