#!/usr/bin/env python3
"""js/registry.js 생성기.

표기규격 v2.0 의 「음소–자모값 대응 등록부」(제19조 ⑨)를 웹앱이 동기적으로
읽을 수 있는 ES 모듈로 옮긴다. 값의 정본은 어디까지나 문서와 그 문서에서
뽑아낸 hmbr_registry_v2_0.json 이고, 이 스크립트는 그것을 옮겨 적기만 한다.

    python3 tools/gen_registry_js.py

등록부 값을 고칠 일이 생기면 webapp/gen_registry.py 를 고쳐 JSON 을 다시
만든 다음 이 스크립트를 돌린다. js/registry.js 를 직접 손대지 않는다.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
SRC = os.environ.get(
    'HMBR_REGISTRY_JSON',
    '/root/webapp/hmbr_registry_v2_0.json',
)
OUT = os.path.join(WEB, 'js', 'registry.js')


def esc(s):
    return json.dumps(s, ensure_ascii=False)


def main():
    if not os.path.exists(SRC):
        sys.exit('등록부 JSON 을 찾을 수 없다: %s' % SRC)
    with open(SRC, encoding='utf-8') as fh:
        reg = json.load(fh)

    meta = reg.get('_meta', {})
    entries = reg['entries']
    rules = reg.get('reverse_rules', {})

    rows = []
    for e in entries:
        pos = {k: v['text'] for k, v in e['위치별부호열'].items()}
        rows.append({
            'id': e['음소ID'],
            'jv': e['자모값ID'],
            'ipa': e['IPA표기'],
            'bare': e['IPA표기'].strip('/[]'),
            'mode': e['모드구분'],
            'canonical': e['정본문자열'],
            'pos': pos,
            'rules': e['역변환규칙'],
            'context': e.get('문맥조건', ''),
            'slug': e.get('_슬러그', ''),
            'cls': e.get('_부류', ''),
            'status': e.get('_상태', ''),
            'example': e.get('_예시', ''),
        })

    lines = []
    w = lines.append
    w('/**')
    w(' * 훈민바름 — 음소–자모값 대응 등록부 (표기규격 v2.0, 제19조 ⑨).')
    w(' *')
    w(' * ⚠ 자동 생성 파일이다. 직접 고치지 말 것.')
    w(' *   생성: python3 tools/gen_registry_js.py')
    w(' *   원본: hmbr_registry_v2_0.json (문서 별첨 표 11 · 마스터 표 15)')
    w(' *')
    w(' * 문서와 값이 어긋나면 문서가 정본이다. 여기 실린 부호열은 모두')
    w(' * 조합용 자모(U+1100–U+11FF, U+A960–, U+D7B0–)이며 호환용 자모')
    w(' * U+3130–U+318F 는 정본에서 배제한다(부호 정책).')
    w(' */')
    w('')
    w('export const SPEC_VERSION = %s;' % esc(meta.get('spec_version', '2.0')))
    w('export const DOC_BUILD = %s;' % esc(meta.get('document_build', 'v18')))
    w('export const MODULE_ID = %s;' % esc(meta.get('언어모듈ID', 'EN')))
    w('export const JAMO_POLICY = %s;' % esc(meta.get('jamo_policy', '')))
    w('export const DISPLAY_NOTE = %s;' % esc(meta.get('display_note', '')))
    w('')
    w('/** 부록 E 의 역변환 규칙. MAJOR 판올림 시 공개 의무(제24조 ③). */')
    w('export const REVERSE_RULES = {')
    for rid in sorted(rules):
        r = rules[rid]
        down = {}
        for k, v in (r.get('map_down') or {}).items():
            down[chr(int(k[2:], 16))] = chr(int(v[2:], 16))
        w('  %s: {' % esc(rid))
        w('    name: %s,' % esc(r.get('name', '')))
        w('    direction: %s,' % esc(r.get('direction', '')))
        w('    lossless: %s,' % ('true' if r.get('lossless', True) else 'false'))
        w('    requires: %s,' % json.dumps(r.get('requires') or [], ensure_ascii=False))
        w('    mapDown: %s,' % json.dumps(down, ensure_ascii=False))
        w('    note: %s,' % esc(r.get('description', '')))
        w('  },')
    w('};')
    w('')
    w('/**')
    w(' * 등록부 항목. 표 15 의 12개 항목을 그대로 옮기되, 자바스크립트에서')
    w(' * 다루기 쉬운 이름을 쓴다.')
    w(' *   id/jv        음소 ID · 자모값 ID   (EN-P-015 / JV-EN-015)')
    w(' *   ipa/bare     IPA 표기 · 구분기호를 뗀 형태')
    w(' *   mode         phonemic | phonetic   (이음은 기본 표에서 뺀다)')
    w(' *   canonical    정본 부호열')
    w(' *   pos          위치별 부호열 (초성 · 종성 · 중성 · 문맥별 초성)')
    w(' *   rules        역변환 규칙 식별자')
    w(' *   context      문맥 조건 (규범 서술)')
    w(' *   status       확정 | 잠정 | 시험 | 시범값 | 미정 …  (참고 항목)')
    w(' */')
    w('export const ENTRIES = [')
    for r in rows:
        w('  {')
        w('    id: %s, jv: %s,' % (esc(r['id']), esc(r['jv'])))
        w('    ipa: %s, bare: %s,' % (esc(r['ipa']), esc(r['bare'])))
        w('    mode: %s, canonical: %s,' % (esc(r['mode']), esc(r['canonical'])))
        w('    pos: %s,' % json.dumps(r['pos'], ensure_ascii=False))
        w('    rules: %s,' % json.dumps(r['rules'], ensure_ascii=False))
        w('    slug: %s, cls: %s, status: %s,'
          % (esc(r['slug']), esc(r['cls']), esc(r['status'])))
        w('    context: %s,' % esc(r['context']))
        w('    example: %s,' % esc(r['example']))
        w('  },')
    w('];')
    w('')
    w('/** bare IPA → 항목. 음소(/x/)와 이음([x])이 같은 글자를 쓰므로 모드로 가른다. */')
    w('export const BY_IPA = new Map();')
    w("for (const e of ENTRIES) {")
    w("  const key = e.mode === 'phonetic' ? '[' + e.bare + ']' : e.bare;")
    w('  BY_IPA.set(key, e);')
    w('}')
    w('')
    w('export const PHONEMIC = ENTRIES.filter((e) => e.mode === %s);'
      % esc('phonemic'))
    w('export const PHONETIC = ENTRIES.filter((e) => e.mode === %s);'
      % esc('phonetic'))
    w('')

    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print('%s — 항목 %d, 역변환 규칙 %d' % (OUT, len(rows), len(rules)))


if __name__ == '__main__':
    main()
