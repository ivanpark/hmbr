/* 컬렉터S Threads 수집 스크립트 v1.2
 * 사용법: 크롬에서 로그인한 상태로 https://www.threads.com/@collector___s 를 열고,
 * F12(맥: Cmd+Option+J) → Console 탭에 이 코드 전체를 붙여 넣고 Enter.
 * 처음 붙여 넣을 때 크롬이 막으면 "allow pasting" 을 입력하고 Enter 한 뒤 다시 붙여 넣기.
 * 사람이 읽는 속도로 아래로 스크롤하면서 지나가는 글을 모두 기록하고, 끝나면 JSON 파일을 내려받습니다.
 * 오른쪽 위 검은 상자를 누르면 언제든 멈추고 그때까지 모은 것을 저장합니다.
 * '답글'(/replies), '리포스트'(/reposts) 탭에서도 같은 방법으로 한 번씩 더 실행하세요.
 * 수집 중에는 이 탭을 화면에 띄워 두세요. 탭이 가려지면 자동으로 멈췄다가, 다시 보이면 이어서 진행합니다.
 */
(() => {
  if (window.__csCapture) { console.warn('이미 실행 중입니다. 페이지를 새로고침한 뒤 다시 붙여 넣으세요.'); return; }
  const m = location.pathname.match(/^\/@([^/]+)(?:\/(replies|reposts|media))?\/?$/);
  if (!/(^|\.)threads\.(com|net)$/.test(location.hostname) || !m) { alert('Threads 프로필 페이지에서 실행하세요: https://www.threads.com/@collector___s'); return; }
  const HANDLE = decodeURIComponent(m[1]);
  const TAB = m[2] || 'threads';
  const FAST = window.__CS_FAST === true;
  const POST_RE = /\/@([^/?#]+)\/post\/([A-Za-z0-9_-]+)/;
  const ACTION_RE = /^(Like|Unlike|Reply|Comment|Repost|Share|좋아요|좋아요 취소|답글|댓글|리포스트|공유|공유하기)$/;
  const posts = new Map();
  const steps = [];
  const state = { stopped: false, order: 0, gaps: 0, pauses: 0, stalls: 0 };
  const startedAt = new Date().toISOString();
  const sleep = ms => new Promise(r => setTimeout(r, FAST ? Math.min(ms, 60) : ms));
  const profileHeader = ((document.querySelector('main') || document.body).innerText || '').slice(0, 1500);
  const ogDescription = document.querySelector('meta[property="og:description"]')?.content || '';

  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font:14px/1.4 sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35);max-width:320px';
  badge.title = '누르면 멈추고 지금까지 모은 것을 저장합니다';
  badge.onclick = () => { state.stopped = true; paint('멈추는 중…'); };
  document.body.appendChild(badge);
  const paint = msg => { badge.textContent = msg; };
  paint('준비 중…');

  function scroller() {
    const se = document.scrollingElement || document.documentElement;
    if (se.scrollHeight > innerHeight + 50) return se;
    const cands = [...document.querySelectorAll('div')].filter(d => {
      const s = getComputedStyle(d);
      return /(auto|scroll)/.test(s.overflowY) && d.scrollHeight > d.clientHeight + 50;
    });
    return cands.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || se;
  }

  function containerOf(el) {
    const p = el.closest('div[data-pressable-container="true"]');
    if (p) return p;
    let cur = el;
    for (let i = 0; i < 15 && cur.parentElement; i++) {
      cur = cur.parentElement;
      const n = [...cur.querySelectorAll('svg[aria-label]')].filter(s => ACTION_RE.test(s.getAttribute('aria-label').trim())).length;
      if (n >= 2) return cur;
    }
    return null;
  }

  const inside = (nested, node) => nested.some(n => n.contains(node));

  function textParts(c, nested) {
    const out = [], seen = new Set();
    c.querySelectorAll('span[dir="auto"], div[dir="auto"]').forEach(s => {
      if (inside(nested, s) || s.closest('time') || s.querySelector('span[dir="auto"], div[dir="auto"]')) return;
      const t = (s.innerText || '').trim();
      if (t && !seen.has(t)) { seen.add(t); out.push(t); }
    });
    return out;
  }

  function images(c, nested) {
    return [...c.querySelectorAll('img')].filter(img => !inside(nested, img)).map(img => {
      const best = (img.getAttribute('srcset') || '').split(',').map(s => s.trim().split(/\s+/))
        .filter(x => x[0]).sort((a, b) => (parseInt(b[1]) || 0) - (parseInt(a[1]) || 0))[0];
      return { src: (best && best[0]) || img.currentSrc || img.src, alt: img.alt || '', w: img.naturalWidth, h: img.naturalHeight, rw: img.width, rh: img.height };
    }).filter(i => i.src && !i.src.startsWith('data:') && !/profile picture|프로필 사진/i.test(i.alt) && Math.max(i.rw, i.rh) > 60);
  }

  function cleanHTML(c) {
    const k = c.cloneNode(true);
    k.querySelectorAll('svg, style, script, video source').forEach(e => e.remove());
    const keep = new Set(['href', 'src', 'alt', 'datetime', 'title', 'aria-label', 'dir', 'role', 'data-pressable-container', 'poster']);
    [k, ...k.querySelectorAll('*')].forEach(e => { for (const a of [...e.attributes]) if (!keep.has(a.name)) e.removeAttribute(a.name); });
    return k.outerHTML.slice(0, 40000);
  }

  function harvest(step) {
    const byC = new Map(), list = [];
    document.querySelectorAll('a[href*="/post/"]').forEach(a => {
      if (!a.querySelector('time[datetime]')) return;
      const c = containerOf(a);
      if (!c) return;
      if (!byC.has(c)) { byC.set(c, []); list.push(c); }
      byC.get(c).push(a);
    });
    const top = list.filter(c => !list.some(o => o !== c && o.contains(c)))
      .sort((x, y) => (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
    const visible = [], fresh = [];
    let prev = null;
    for (const c of top) {
      const nested = list.filter(o => o !== c && c.contains(o));
      const own = byC.get(c);
      const primary = own.find(a => !inside(nested, a)) || own[0];
      const mm = (primary.getAttribute('href') || '').match(POST_RE);
      if (!mm) continue;
      const [, author, code] = mm;
      visible.push(code);
      const raw = c.innerText || '';
      const imgs = images(c, nested);
      if (!posts.has(code)) {
        const t = primary.querySelector('time[datetime]');
        const quoted = [...own.filter(a => a !== primary), ...nested.flatMap(n => byC.get(n))]
          .map(a => (a.getAttribute('href') || '').match(POST_RE)).filter(Boolean)
          .map(x => ({ author: x[1], code: x[2] }))
          .filter((q, i, arr) => q.code !== code && arr.findIndex(z => z.code === q.code) === i);
        posts.set(code, {
          code, author, url: `https://www.threads.com/@${author}/post/${code}`,
          author_is_handle: author.toLowerCase() === HANDLE.toLowerCase(),
          tab: TAB, order: state.order++, first_step: step, prev_code: prev,
          datetime: t.getAttribute('datetime'), time_title: t.getAttribute('title') || '',
          pinned: /(^|\n)\s*(Pinned|고정됨|고정된 게시물)\s*(\n|$)/.test(raw) || !!c.querySelector('svg[aria-label="Pinned"], svg[aria-label="고정됨"]'),
          context_before: ((c.previousElementSibling && c.previousElementSibling.innerText) || '').trim().slice(0, 160),
          text_parts: textParts(c, nested), text_raw: raw, images: imgs,
          videos: [...c.querySelectorAll('video')].filter(v => !inside(nested, v)).map(v => ({ src: v.currentSrc || v.src || '', poster: v.poster || '' })),
          links: [...c.querySelectorAll('a[href^="http"]')].map(a => a.href).filter(h => !/threads\.(com|net)\//.test(h) || /l\.threads/.test(h)),
          quoted, html: cleanHTML(c), seen: 1,
        });
        fresh.push(code);
      } else {
        const r = posts.get(code);
        r.seen++;
        if (raw.length > r.text_raw.length) { r.text_raw = raw; r.text_parts = textParts(c, nested); r.html = cleanHTML(c); }
        if (imgs.length > r.images.length) r.images = imgs;
      }
      prev = code;
    }
    const s = scroller();
    steps.push({ step, y: Math.round(s.scrollTop), h: s.scrollHeight, visible, fresh, at: new Date().toISOString() });
    return fresh.length;
  }

  function save(reason) {
    const all = [...posts.values()];
    const own = all.filter(p => p.author_is_handle).length;
    const gaps = steps.slice(1).filter((s, i) => s.visible.length && steps[i].visible.length && !s.visible.some(c => steps[i].visible.includes(c))).map(s => s.step);
    const out = {
      meta: {
        script_version: '1.2', handle: HANDLE, tab: TAB, page: location.href, started_at: startedAt,
        finished_at: new Date().toISOString(), finish_reason: reason, user_agent: navigator.userAgent,
        total_seen: all.length, own_posts: own, steps: steps.length, gap_steps: gaps, hidden_pauses: state.pauses, render_stalls: state.stalls,
        profile_header_text: profileHeader, og_description: ogDescription,
      },
      posts: all, steps,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = `collector_s_${TAB}_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    paint(`저장 완료: 전체 ${all.length}개(본인 글 ${own}개)${gaps.length ? `, ⚠ 끊긴 구간 ${gaps.length}곳` : ''}${state.pauses ? `, 탭 가림으로 ${state.pauses}번 일시정지` : ''}. 내려받은 파일을 Claude에 올려 주세요.`);
    console.log('[수집 완료]', out.meta);
    return out;
  }

  // 마지막으로 실제 화면에 그려진 글(컨테이너)을 찾는다. 스크롤은 항상 이 글을 기준으로만 움직인다.
  function lastRendered() {
    const cs = [...document.querySelectorAll('a[href*="/post/"] time[datetime]')]
      .map(t => containerOf(t.closest('a'))).filter(c => c && c.getBoundingClientRect().height > 0);
    return cs.sort((x, y) => (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1).pop() || null;
  }

  async function waitVisible() {
    if (document.visibilityState !== 'hidden') return false;
    state.pauses++;
    console.warn('[일시정지] 탭이 가려져 수집을 멈췄습니다. 이 탭을 다시 화면에 띄우면 이어서 진행합니다.');
    while (document.visibilityState === 'hidden' && !state.stopped) await sleep(1000);
    paint('다시 이어서 진행합니다…');
    await sleep(2500);
    return true;
  }

  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

  async function run() {
    const s0 = scroller();
    s0.scrollTop = 0;
    await sleep(1500);
    harvest(0);
    let idle = 0, sameRuns = 0, lastFreshAt = Date.now();
    const END_MS = FAST ? 8000 : 60000; // 새 글 없이 이 시간이 지나야 끝으로 본다(탭이 가려진 시간은 제외)
    for (let i = 1; !state.stopped; i++) {
      if (await waitVisible()) lastFreshAt = Date.now();
      const s = scroller();
      const last = lastRendered();
      const before = s.scrollTop;
      if (last) {
        // 마지막으로 그려진 글을 화면 위쪽으로 올린다. 화면 갱신이 멈춰도 그 이상 앞질러 가지 않는다.
        const top = last.getBoundingClientRect().top;
        s.scrollTop += Math.max(Math.min(top - 80, innerHeight * 0.9), 120);
      } else {
        s.scrollTop += Math.round(innerHeight * 0.5);
      }
      await sleep(1300 + Math.random() * 900);
      if (await waitVisible()) { lastFreshAt = Date.now(); i--; continue; }
      const n = harvest(i);
      if (n > 0) lastFreshAt = Date.now();
      const cur = steps[steps.length - 1], prevStep = steps[steps.length - 2];
      if (n > 0 && prevStep && prevStep.visible.length && !cur.visible.some(c => prevStep.visible.includes(c))) {
        state.gaps++;
        console.warn(`[끊김 의심] 구간 ${i}: 앞 화면과 겹치는 글이 없습니다.`);
      }
      // 같은 글 묶음만 계속 보이면 화면 갱신이 멈춘 것이다. 위치를 되돌리고 기다린다.
      sameRuns = (prevStep && sameSet(cur.visible, prevStep.visible)) ? sameRuns + 1 : 0;
      if (sameRuns >= 2 && last) {
        state.stalls++;
        last.scrollIntoView({ block: 'start' });
        window.dispatchEvent(new Event('scroll'));
        await sleep(3000);
        if (harvest(i) > 0) { sameRuns = 0; idle = 0; lastFreshAt = Date.now(); }
      }
      const atBottom = s.scrollTop + s.clientHeight >= s.scrollHeight - 8;
      const stuck = Math.abs(s.scrollTop - before) < 2;
      if (n === 0 && (atBottom || stuck || sameRuns >= 2)) {
        idle++;
        if (idle % 3 === 0) {
          // 맨 아래에서 다음 묶음을 불러오도록 살짝 올렸다가 제자리로 돌아온다.
          const y = s.scrollTop;
          s.scrollTop = y - 400; await sleep(800);
          s.scrollTop = y; await sleep(2500);
          if (harvest(i) > 0) { idle = 0; lastFreshAt = Date.now(); }
        }
      } else if (n > 0) idle = 0;
      const own = [...posts.values()].filter(p => p.author_is_handle).length;
      const oldest = [...posts.values()].reduce((a, p) => (!a || p.datetime < a ? p.datetime : a), '');
      paint(`수집 중: 전체 ${posts.size}개 · 본인 글 ${own}개 · 가장 오래된 글 ${oldest.slice(0, 10)}${state.gaps ? ` · ⚠ 끊김 의심 ${state.gaps}곳` : ''} (누르면 멈추고 저장)`);
      if (i === 5 && posts.size === 0) { paint('글을 찾지 못했습니다. 이 화면을 캡처해서 Claude에 알려 주세요.'); console.warn('[수집 실패] 글 요소를 찾지 못함'); return save('no_posts_found'); }
      if (idle >= 6 && Date.now() - lastFreshAt > END_MS) break;
    }
    return save(state.stopped ? 'stopped_by_user' : 'reached_end');
  }

  window.__csCapture = { posts, steps, stop: () => { state.stopped = true; }, save: () => save('manual_save') };
  window.__csDone = run().catch(e => { console.error(e); return save('error: ' + e.message); });
})();
