const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = {foundations:'基础技术',text:'语言与代码',image:'图像生成',video:'视频生成',audio:'声音与音乐','3d':'三维与空间',tools:'工具与工作流',industry:'产业与应用',safety:'社会与治理'};
const eras = [
  {start:1943,end:2012,title:'让机器学会学习'},
  {start:2013,end:2016,title:'生成模型的早期实验'},
  {start:2017,end:2021,title:'大模型的基础逐渐齐备'},
  {start:2022,end:2023,title:'生成式 AI 走向大众'},
  {start:2024,end:2024,title:'多模态与视频加速'},
  {start:2025,end:2026,title:'推理、智能体与创作工具'}
];
let events = [], atlas, curation, media = {}, tour = [], current = 0, selectedTab = 'timeline', category = 'all', query = '', archiveScope = 'featured', terminalView = 'archive';
let lastFocus, wheelSum = 0, wheelAt = 0;
const formatDate = value => { const [y,m,d] = value.split('-'); return `${y} 年${m ? ` ${Number(m)} 月` : ''}${d ? ` ${Number(d)} 日` : ''}`; };
const sourceLinks = list => (list || []).map(s => `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>`).join('');
const matches = item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase().trim());

async function init() {
  const intro = wireIntro();
  try {
    const responses = await Promise.all(['foundations','modern','atlas','curation','media','context'].map(name => fetch(`./data/${name}.json`).then(r => { if (!r.ok) throw Error(`${name}: ${r.status}`); return r.json(); })));
    events = [...responses[0], ...responses[1], ...responses[5]].sort((a,b) => a.date.localeCompare(b.date));
    atlas = responses[2];
    curation = responses[3]; media = responses[4];
    tour = events.filter(e => curation.featuredIds.includes(e.id));
    if (!events.length) throw Error('档案为空');
    const initial = decodeURIComponent(location.hash.slice(1)) || 'mcculloch-pitts';
    current = Math.max(0,events.findIndex(e => e.id === initial));
    for (const [value,name] of Object.entries(categories)) $('#category').insertAdjacentHTML('beforeend',`<option value="${value}">${name}</option>`);
    render();
    wireGlobal();
    document.documentElement.dataset.loaded = 'true';
    intro.ready();
  } catch (error) {
    $('#exhibit').innerHTML = `<div class="error"><h1>档案暂时没有打开</h1><p>请通过本地预览地址访问，并检查 data 目录是否完整。</p><button class="museum-button" id="retry">重新打开</button></div>`;
    $('#retry').onclick = () => location.reload();
    intro.fail();
    console.error(error);
  }
}

function wireIntro() {
  const intro = $('#intro'), button = $('#intro-enter');
  const surfaces = $$('.skip,.header,#exhibit,.exhibit-footer');
  const open = !location.hash;
  let entering = false;
  const dismiss = () => {
    intro.hidden = true;
    document.body.classList.remove('intro-open');
    surfaces.forEach(element => { element.inert = false; });
    document.removeEventListener('keydown', onKey, true);
  };
  const enter = () => {
    if (button.disabled || entering) return;
    entering = true;
    button.disabled = true;
    history.replaceState(null, '', '#mcculloch-pitts');
    intro.classList.add('intro-leaving');
    const duration = matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 600;
    setTimeout(() => { dismiss(); $('#exhibit').focus({preventScroll:true}); }, duration);
  };
  const onKey = event => {
    event.stopImmediatePropagation();
    if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); enter(); }
  };
  if (open) {
    intro.hidden = false;
    document.body.classList.add('intro-open');
    surfaces.forEach(element => { element.inert = true; });
    button.onclick = enter;
    document.addEventListener('keydown', onKey, true);
  }
  return {
    ready() { if (open) { button.disabled = false; button.focus({preventScroll:true}); } },
    fail() { if (open) { dismiss(); $('#retry')?.focus({preventScroll:true}); } }
  };
}

function render() {
  const e = events[current]; terminalView = 'archive';
  document.querySelectorAll('video,audio').forEach(player => player.pause());
  document.title = 'AIGC Artifacts｜档案';
  $('#exhibit').innerHTML = `<article class="stage" data-event="${escape(e.id)}"><div class="object"><div class="artifact">${artifactHTML(e)}</div><div class="pedestal"><img class="column-shadow" src="./assets/column-shadow.png" alt=""><img class="column" src="./assets/column.webp" alt="" width="950" height="759"></div></div><section class="plaque" aria-labelledby="event-title"><div class="event-meta"><span>${escape(formatDate(e.date))}</span><span>${escape(categories[e.category])}</span></div><h1 id="event-title">${escape(e.title)}</h1><div class="divider"></div><p class="plaque-subtitle">${escape(e.subtitle)}</p><p>${escape(e.summary)}</p><p class="plaque-why">${escape(e.why)}</p><div class="plaque-actions"><button class="text-button" id="read-detail">资料索引 ↗</button></div></section></article>`;
  const route = tour.includes(e) ? tour : events, routeIndex = route.indexOf(e);
  $('#previous').disabled = routeIndex === 0;
  $('#next').disabled = routeIndex === route.length-1;
  renderYears();
  $('#read-detail').onclick = () => openDetail(e);
  wireArtifact(e);
}

function renderYears() {
  const route = tour.includes(events[current]) ? tour : events;
  const yearPeriods = new Map();
  route.forEach(e => {
    const year = e.date.slice(0,4);
    if (!yearPeriods.has(year)) yearPeriods.set(year,new Set());
    yearPeriods.get(year).add(e.date.slice(0,7));
  });
  const periodOf = e => yearPeriods.get(e.date.slice(0,4)).size > 1 ? e.date.slice(0,7) : e.date.slice(0,4);
  const periods = [...new Set(route.map(periodOf))], selected = periodOf(events[current]);
  $('#years').innerHTML = periods.map(period => `<button class="year${period.length>4?' month':''}" data-period="${period}" aria-label="${formatDate(period)}" aria-current="${period===selected}" tabindex="${period===selected?0:-1}">${period.replace('-','.')}</button>`).join('');
  const active = $('.year[aria-current=true]');
  $('#years').style.transform = `translateX(${$('.year-nav').clientWidth/2 - active.offsetLeft - active.offsetWidth/2}px)`;
  $$('.year').forEach(b => b.onclick = () => navigate(events.indexOf(route.find(e => periodOf(e)===b.dataset.period))));
}
function navigate(index) {
  if (index < 0 || index >= events.length || index === current) return;
  current = index;
  history.pushState(null,'',`#${events[current].id}`);
  render();
}
function step(direction) {
  const route = tour.includes(events[current]) ? tour : events;
  const target = route[route.indexOf(events[current]) + direction];
  if (target) navigate(events.indexOf(target));
}
function goTo(id) {
  const index = events.findIndex(e => e.id === id);
  if (index < 0) return;
  if ($('#catalog').open) $('#catalog').close();
  if ($('#detail').open) $('#detail').close();
  if (current === index) render(); else navigate(index);
}

function artifactHTML(e) {
  if (media[e.id]) {
    const m=media[e.id];
    const visual = m.experience==='eliza' ? `<div class="eliza-experience"><div class="experience-tabs"><button data-eliza-view="demo" aria-pressed="true">试着对话</button><button data-eliza-view="original" aria-pressed="false">1966 打印稿</button></div><div id="eliza-demo" class="teletype"><div class="teletype-heading">ELIZA / 中文规则示意</div><div id="eliza-log" class="teletype-log" role="log" aria-label="对话记录"><p>程序：你想聊些什么？</p></div><form id="eliza-form"><label for="eliza-input">你说</label><input id="eliza-input" placeholder="例如：我有点紧张" maxlength="120" autocomplete="off"><button type="submit">发送 ↵</button></form><p class="experience-note">本站简化重建 · 非原程序 · 输入仅在本页处理</p></div><a id="eliza-original" class="history-zoom reading-room" href="${escape(m.src)}" target="_blank" rel="noopener" hidden><img class="history-image" src="${escape(m.src)}" alt="${escape(m.alt)}"></a></div>`
      : m.pages ? `<div class="document-reader" data-interactive><div class="reader-heading">文献选页 <button id="reader-zoom" aria-pressed="false">放大阅读</button></div><div class="reader-paper" tabindex="0" aria-label="文献页面，可滚动阅读"><img id="reader-image" src="${escape(m.pages[0].src)}" alt="${escape(m.pages[0].alt)}"></div><div class="reader-controls"><button id="reader-prev" aria-label="上一张选页" disabled>←</button><span id="reader-label" aria-live="polite">${escape(m.pages[0].label)}</span><button id="reader-next" aria-label="下一张选页">→</button><a id="reader-original" href="${escape(m.pages[0].src)}" target="_blank" rel="noopener">原页 ↗</a></div></div>`
      : m.explore ? `<div class="comparison-desk" data-interactive><div class="comparison-heading">ControlNet / Canny · 2023</div><div class="archive-panels">${m.panels.slice(0,3).map((panel,i)=>`<figure><svg ${i===2?'id="comparison-result"':''} viewBox="${panel.crop.join(' ')}" role="img" aria-label="${escape(panel.alt)}"><image href="${escape(m.src)}" width="${m.imageSize[0]}" height="${m.imageSize[1]}"></image></svg><figcaption>${escape(panel.label)}</figcaption></figure>`).join('')}</div><div class="comparison-choices" role="group" aria-label="选择原始生成结果"><span>生成结果</span>${m.panels.slice(2).map((p,i)=>`<button data-result="${i+2}" aria-label="查看生成结果 ${i+1}" aria-pressed="${i===0}">${i+1}</button>`).join('')}</div><p class="experience-note">提示词：bird · 切换原始样本</p></div>`
      : m.type==='embed'
      ? `<div class="embedded-film"><button class="film-play" id="play-archive" aria-label="播放原始演示：${escape(m.alt)}"><img src="${escape(m.poster)}" alt="${escape(m.alt)}"><span aria-hidden="true">▶</span></button></div>`
      : m.type==='audio'
        ? `<div class="audio-artifact"><img class="audio-diagram" src="${escape(m.poster)}" alt="WaveNet 2016 年官方博客中的分层卷积结构动图"><div class="audio-samples">${m.samples.map(sample=>`<label class="audio-sample"><span>${escape(sample.label)}</span><audio controls preload="metadata" aria-label="2016 年普通话样本：${escape(sample.label)}"><source src="${escape(sample.src)}" type="${escape(sample.mime)}"></audio></label>`).join('')}</div></div>`
      : m.type==='video'
        ? `<video controls playsinline preload="none" ${m.loop?'loop':''} ${m.muted?'muted':''} ${m.poster?`poster="${escape(m.poster)}"`:''} aria-label="${escape(m.alt)}"><source src="${escape(m.src)}" type="${m.src.endsWith('.webm')?'video/webm':'video/mp4'}">浏览器不支持此视频，请查看原始来源。</video>`
      : m.panels
        ? `<div class="archive-panels${m.panels.length===1?' archive-single':''}">${m.panels.map(panel=>`<figure><svg viewBox="${panel.crop.join(' ')}" role="img" aria-label="${escape(panel.alt)}"><image href="${escape(m.src)}" width="${m.imageSize[0]}" height="${m.imageSize[1]}"></image></svg>${panel.label?`<figcaption>${escape(panel.label)}</figcaption>`:''}</figure>`).join('')}</div>`
        : `<a class="history-zoom${m.reading?' reading-room':''}" href="${escape(m.src)}" target="_blank" rel="noopener" aria-label="放大查看：${escape(m.alt)}"><img class="history-image" src="${escape(m.src)}" alt="${escape(m.alt)}"></a>`;
    return `<div class="historical-artifact ${m.type!=='image'?'historical-video':'historical-image'}${m.presentation==='photograph'?' archive-photograph':''}">${visual}<div class="media-caption"><p>${escape(m.displayCaption || m.caption.split('。').slice(0,2).join('。') + (m.caption.includes('。') ? '。' : ''))}</p></div></div>`;
  }
  const note = '<div class="artifact-note">交互示意 · 本站重建，非历史原件</div>';
  if (['code','terminal'].includes(e.artifact.type) || e.id === 'transformer') {
    return `<div class="terminal"><div class="terminal-tabs" role="tablist" aria-label="展品视图"><button data-view="archive" class="active" role="tab" aria-selected="true">${escape(e.id)}.txt</button><button data-view="mechanism" role="tab" aria-selected="false">原理</button><button data-view="sources" role="tab" aria-selected="false">资料</button></div><div class="terminal-status"><span>AIGC ARCHIVE</span><span>${escape(e.date)} · UTF-8</span></div><div class="terminal-body" id="terminal-body">${terminalContent(e,'archive')}</div>${note}</div>`;
  }
  if (e.artifact.type === 'paper') {
    return `<div class="paper-artifact"><div class="paper-top">AIGC ARCHIVES / ${escape(e.date.slice(0,4))}</div><h2>${escape(e.artifact.label)}</h2><div class="paper-author">${escape(e.org)}</div><div class="paper-abstract">${escape(e.mechanism)}</div><div class="paper-lines">${e.artifact.lines.map(l => `<p>${escape(l)}</p>`).join('')}</div><div class="paper-stamp">ARCHIVE ${String(current+1).padStart(3,'0')}</div>${note}</div>`;
  }
  if (e.artifact.type === 'interface') {
    return `<div class="chat-artifact"><div class="window-title"><span>${escape(e.artifact.label)}</span><span>${e.date.slice(0,4)}</span></div><div class="window-content"><div class="window-label">An interface to imagination</div><h2>${escape(e.tags[0] || e.title)}</h2><div class="prompt-row">${escape(e.artifact.lines[0])}</div><div class="answer" id="demo-answer">${e.artifact.lines.slice(1).map(escape).join('<br>')}</div>${e.id === 'eliza' ? '<form class="chat-form" id="eliza-form"><input aria-label="对 ELIZA 说句话" placeholder="试着说一句话……" maxlength="120"><button type="submit">发送</button></form>' : `<button class="demo-button" id="interface-explain">看看背后的原理</button>`}</div>${note}</div>`;
  }
  return `<div class="canvas-artifact"><h2>${escape(e.artifact.label)}</h2><canvas id="demo-canvas" width="1000" height="500" aria-label="${escape(e.artifact.type === 'waveform' ? '声音波形示意' : e.artifact.type === 'image' ? '噪声逐渐减少的图像示意' : '信息在网络中流动的示意')}" role="img"></canvas><p class="canvas-caption" id="canvas-caption">${escape(e.artifact.lines.slice(0,2).join(' · '))}</p><label class="canvas-control">${e.artifact.type === 'image' ? '从噪声到结构' : '探索生成过程'}<input type="range" id="demo-range" min="0" max="100" value="55" aria-label="调整示意进度"><output id="demo-output">55%</output></label>${note}</div>`;
}
function terminalContent(e, view) {
  if (view === 'mechanism') return `<div class="terminal-concept">${escape(e.mechanism)}<br><br><span class="code-comment">// 为什么这一步重要</span><br>${escape(e.why)}</div>`;
  if (view === 'sources') return `<div class="terminal-concept"><span class="code-comment">// 直接阅读原始资料</span><br><br>${sourceLinks(e.sources)}<br><br>本展品文字为中文解说，蓝色界面为本站原创示意。</div>`;
  if (e.id === 'transformer') return `<pre><span class="code-comment">// Attention Is All You Need · 2017
// 教学伪代码，展示信息流</span>

tokens = embed(text) + position

Q = tokens @ W_query
K = tokens @ W_key
V = tokens @ W_value

scores = (Q @ K.T) / sqrt(d_k)
attention = softmax(scores) @ V

output = multi_head(attention)

<span class="code-comment">// 每个词，重新看见整句话。</span></pre>`;
  return `<pre><span class="code-comment">// ${escape(e.artifact.label)}
// ${escape(e.org)}
// ${escape(e.date)}</span>

${e.artifact.lines.map(escape).join('\n\n')}

<span class="code-comment">// 点“原理”，读懂这一步。</span></pre>`;
}
function wireArtifact(e) {
  const m=media[e.id];
  if (m?.pages) {
    let page=0;
    const turn=direction=>{
      page=Math.max(0,Math.min(m.pages.length-1,page+direction));
      const item=m.pages[page];
      $('#reader-image').src=item.src;$('#reader-image').alt=item.alt;
      $('#reader-label').textContent=item.label;$('#reader-original').href=item.src;
      $('.media-caption p').textContent=page===0?(m.displayCaption||m.caption):`当前选页：${item.label}。${m.date} 年材料；可放大滚动阅读，或打开原页。`;
      $('#reader-prev').disabled=page===0;$('#reader-next').disabled=page===m.pages.length-1;
      $('.reader-paper').scrollTop=0;
    };
    $('#reader-prev').onclick=()=>turn(-1);$('#reader-next').onclick=()=>turn(1);
    $('#reader-zoom').onclick=()=>{
      const zoomed=$('.reader-paper').classList.toggle('is-zoomed');
      $('#reader-zoom').setAttribute('aria-pressed',String(zoomed));$('#reader-zoom').textContent=zoomed?'整页查看':'放大阅读';
    };
    $('.document-reader').onkeydown=ev=>{if(['ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();ev.stopPropagation();turn(ev.key==='ArrowRight'?1:-1);}};
  }
  $$('[data-result]').forEach(button=>button.onclick=()=>{
    const panel=m.panels[Number(button.dataset.result)],svg=$('#comparison-result');
    svg.setAttribute('viewBox',panel.crop.join(' '));svg.setAttribute('aria-label',panel.alt);
    $$('[data-result]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  });
  $$('[data-eliza-view]').forEach(button=>button.onclick=()=>{
    const original=button.dataset.elizaView==='original';
    $('#eliza-original').hidden=!original;$('#eliza-demo').hidden=original;
    $('.media-caption p').textContent=original?m.caption:'输入一句话，观察关键词怎样被改写成追问。这是本站的中文简化示意；上方可切换查看 1966 年的真实打印稿。';
    $$('[data-eliza-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  });
  if(m?.experience==='eliza')$('.media-caption p').textContent='输入一句话，观察关键词怎样被改写成追问。这是本站的中文简化示意；上方可切换查看 1966 年的真实打印稿。';
  $$('audio').forEach(player => player.onplay = () => {
    $$('audio').forEach(other => { if (other !== player) other.pause(); });
  });
  if ($('#play-archive')) $('#play-archive').onclick = () => {
    const m = media[e.id];
    $('.embedded-film').innerHTML = `<iframe src="${escape(m.src)}" title="${escape(m.alt)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  };
  $$('.terminal-tabs button').forEach(button => button.onclick = () => {
    terminalView = button.dataset.view;
    $$('.terminal-tabs button').forEach(b => {b.classList.toggle('active',b===button);b.setAttribute('aria-selected',String(b===button));});
    $('#terminal-body').innerHTML = terminalContent(e,terminalView);
  });
  if ($('#interface-explain')) $('#interface-explain').onclick = () => {
    $('#demo-answer').textContent = e.mechanism;
    $('#interface-explain').textContent = '阅读完整档案 ↗';
    $('#interface-explain').onclick = () => openDetail(e);
  };
  if ($('#eliza-form')) $('#eliza-form').onsubmit = ev => {
    ev.preventDefault();
    const input = $('input',ev.currentTarget), text = input.value.trim();
    if (!text) return;
    const reply = /我(?:很|有点|感到)?(.+)/.exec(text);
    const answer = reply ? `你为什么觉得自己${reply[1]}？` : /妈妈|爸爸|父亲|母亲|家人/.test(text) ? '你能再说说你的家人吗？' : /你好|您好/.test(text) ? '你好。你最近在想什么？' : '你能再多说一点吗？';
    if ($('#eliza-log')) {
      const log=$('#eliza-log');
      for(const line of [`你：${text}`,`程序：${answer}`]){const p=document.createElement('p');p.textContent=line;log.append(p);}
      while(log.children.length>41)log.firstElementChild.remove();
      log.scrollTop=log.scrollHeight;
    } else $('#demo-answer').textContent=answer;
    input.value = '';
  };
  if ($('#demo-canvas')) {
    drawDemo(e,55);
    $('#demo-range').oninput = event => {$('#demo-output').textContent = `${event.target.value}%`;drawDemo(e,Number(event.target.value));};
  }
}
function drawDemo(e, amount) {
  const canvas = $('#demo-canvas'), ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#151a17';ctx.fillRect(0,0,w,h);
  if (e.artifact.type === 'image') {
    let seed = 49;
    const rand = () => {seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const p = amount/100;
    for(let y=0;y<h;y+=7) for(let x=0;x<w;x+=7) {
      const nx=x/w,ny=y/h;
      const circle=Math.hypot(nx-.53,ny-.38)<.15;
      const mountain=ny>.78-Math.sin(nx*7)*.15;
      const clean=circle ? [224,185,119] : mountain ? [80,115,93] : [27+ny*45,49+ny*50,60+ny*45];
      const noise=rand()*220;
      ctx.fillStyle=`rgb(${clean.map(c=>Math.round(c*p+noise*(1-p))).join(',')})`;ctx.fillRect(x,y,7,7);
    }
    ctx.fillStyle='#e9e7c9';ctx.font='16px monospace';ctx.fillText('SYNTHETIC LANDSCAPE / teaching visualization',20,h-15);
  } else if (e.artifact.type === 'waveform') {
    ctx.strokeStyle='#b8c49a';ctx.lineWidth=2;ctx.beginPath();
    const freq=amount/10+2;
    for(let x=0;x<w;x++){const envelope=Math.sin(Math.PI*x/w)**2;const y=h/2+Math.sin(x*.017*freq)*Math.sin(x*.005)*envelope*h*.32;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.stroke();ctx.strokeStyle='#475140';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
    ctx.fillStyle='#97a488';ctx.font='19px monospace';ctx.fillText('AMPLITUDE',18,30);ctx.fillText('TIME →',w-120,h-20);
  } else {
    const layers=[4,6,6,3], columns=[95,350,645,905];
    for(let l=0;l<layers.length-1;l++)for(let a=0;a<layers[l];a++)for(let b=0;b<layers[l+1];b++){
      const pulse=((a*7+b*13+l*11+amount)%100)/100;
      ctx.strokeStyle=`rgba(171,187,140,${.07+pulse*.45})`;ctx.lineWidth=pulse>.8?2:1;ctx.beginPath();ctx.moveTo(columns[l],60+a*(h-120)/(layers[l]-1));ctx.lineTo(columns[l+1],60+b*(h-120)/(layers[l+1]-1));ctx.stroke();
    }
    layers.forEach((count,l)=>{for(let n=0;n<count;n++){const y=60+n*(h-120)/(count-1);ctx.beginPath();ctx.arc(columns[l],y,13,0,Math.PI*2);ctx.fillStyle=(n*17+l*12)%100<amount?'#ced5b1':'#263b2d';ctx.fill();ctx.strokeStyle='#91a17e';ctx.stroke();}});
    ctx.fillStyle='#aeba9a';ctx.font='18px monospace';['INPUT','REPRESENTATION','TRANSFORM','OUTPUT'].forEach((t,i)=>ctx.fillText(t,columns[i]-t.length*5.5,h-9));
  }
}

function openDetail(e) {
  const material = media[e.id];
  const materialNote = material?.sourceNote || (material && material.caption !== material.displayCaption ? material.caption : '');
  const originals = [...e.sources];
  if (material && !originals.some(s=>s.url===material.sourceUrl)) originals.unshift({title:material.sourceTitle,url:material.sourceUrl});
  if (material?.panels) originals.unshift({title:material.originalLabel || '查看完整原始界面',url:material.src});
  if (material?.originalSrc) originals.push({title:'查看原始动图',url:material.originalSrc});
  for (const sample of material?.samples || []) originals.push({title:`官方语音样本 · ${sample.label}`,url:sample.sourceUrl});
  $('#detail-content').innerHTML = `<h1>资料索引</h1><p class="detail-meta">${escape(e.title)}</p><p class="detail-addition">${escape(e.mechanism)}</p><div class="source-list">${originals.map(s=>`<div class="source-entry"><a class="original-link" href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>${s.url===material?.sourceUrl?`${materialNote?`<p class="source-description">${escape(materialNote)}</p>`:''}<p class="source-kind">展出材料 · ${escape(material.date)}<br>${escape(material.credit)}</p>`:''}</div>`).join('')}</div>`;
  if (!$('#detail').open) $('#detail').showModal();
  $('#detail').scrollTop=0;
}
function openCatalog(tab='timeline') {
  lastFocus=document.activeElement;
  selectedTab=tab;query='';category='all';$('#search').value='';$('#category').value='all';
  renderCatalog();
  if (!$('#catalog').open) $('#catalog').showModal();
  $('.catalog-body').scrollTop=0;
}
function renderCatalog() {
  $$('.collection-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===selectedTab)));
  $('.catalog-tools').hidden=selectedTab==='about';
  $('#filter-label').hidden=selectedTab!=='timeline';
  let content;
  if(selectedTab==='timeline') {
    const filtered=(query.trim()?events:archiveScope==='featured'?tour:events).filter(e=>(category==='all'||e.category===category)&&matches(e));
    content=`<div class="archive-scope"><button data-scope="featured" aria-pressed="${archiveScope==='featured'}">主展览</button><button data-scope="all" aria-pressed="${archiveScope==='all'}">全部档案</button></div>`+eras.map(era=>{
      const group=filtered.filter(e=>Number(e.date.slice(0,4))>=era.start&&Number(e.date.slice(0,4))<=era.end);
      if(!group.length)return '';
      return `<section class="timeline-group"><div class="group-heading"><h2>${era.start}${era.start===era.end?'':`—${era.end}`}</h2><span>${era.title}</span></div><div class="event-grid">${group.map(e=>`<button class="event-entry" data-go="${escape(e.id)}"><span class="entry-year">${e.date.slice(0,7).replace('-','.')}</span><span><span class="entry-title">${escape(e.title)}</span><span class="entry-description">${escape(e.subtitle)}</span><span class="entry-tag">${escape(categories[e.category])} / ${escape(e.tags.slice(0,2).join(' · '))}</span></span></button>`).join('')}</div></section>`;
    }).join('');
    if(!filtered.length) content=emptyState();
  } else if(selectedTab==='concepts') {
    const filtered=atlas.concepts.filter(matches);
    content=`<div class="knowledge-list">${filtered.map(c=>`<article class="concept-entry"><h2>${escape(c.term)}</h2><div class="alias">${escape(c.alias)} · ${escape(c.category)}</div><p>${escape(c.definition)}</p><p><strong>打个比方：</strong>${escape(c.analogy)}</p><p><strong>什么时候用：</strong>${escape(c.usedFor)}</p><p><strong>别踩这个坑：</strong>${escape(c.pitfall)}</p><div class="small-sources">${sourceLinks(c.sources)}</div></article>`).join('')}</div>`;
    if(!filtered.length) content=emptyState();
  } else if(selectedTab==='platforms') {
    const filtered=atlas.platforms.filter(matches);
    content=`<table class="platform-table"><thead><tr><th>名称 / 官方入口</th><th>谁在做</th><th>主要用途与边界</th></tr></thead><tbody>${filtered.map(p=>`<tr><td><a href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">${escape(p.name)} ↗</a></td><td>${escape(p.company)}<small>${escape(p.region)}</small></td><td>${escape(p.focus)}<small>${escape(p.note)}</small></td></tr>`).join('')}</tbody></table>`;
    if(!filtered.length) content=emptyState();
  } else {
    content=`<article class="about"><section><h2>AIGC 是什么</h2>
<p>AIGC（AI-Generated Content），即人工智能生成内容，泛指通过生成式人工智能技术产生的文字、图像、声音、视频及三维模型等内容。</p>
<p>与主要承担识别、分类和预测任务的传统人工智能不同，AIGC 的核心能力在于「生成」。通过学习海量数据中的模式与关联，生成式模型能够根据文字指令、图像、音频等输入，合成符合特定条件的新内容。</p>
<p>其技术基础涵盖深度学习、生成对抗网络（GAN）、扩散模型（Diffusion Model）及 Transformer 架构等。从早期模糊的低分辨率图像，到如今高度逼真的数字影像，生成式人工智能的表现形式与应用范围不断扩展。</p>
<p>创作由此从“亲手塑造”，转向“引导发生”。语言成为召唤图像的咒式，数据成为机器的记忆，概率则进入美学本身。作品不再只是作者意志的延伸，而成为人类经验、算法推演与偶然性共同留下的痕迹。</p>
<h2>来源与致意</h2><p>展厅形式与墙面、石柱等资源参考 <a href="https://neal.fun/internet-artifacts/" target="_blank" rel="noopener noreferrer">Neal Agarwal 的 Internet Artifacts ↗</a>。本项目独立整理中文解说与 AIGC 资料。原始媒体归各自权利人，资源记录保存在项目中。</p></section><section><h2>创作理念</h2><div class="about-statement">
<p>一切崭新的事物，终将成为遗迹。</p>
<p>技术的历史，总是由胜利者书写。</p>
<p>每一次迭代，都以进步之名，将昨日的奇观贬为今日的谬误。那些曾经令人惊异的形态，在更精确的轮廓、更逼真的幻象面前，逐渐丧失了被凝视的资格。</p>
<p>而我偏偏迷恋那些尚未被驯服的瞬间。</p>
<p>失真的面孔、游离的肢体、不合逻辑的光影。机器尚未学会如何取悦人类时，曾无意间创造出一种不属于人类的视觉语言。</p>
<p>本档案馆试图收藏、考证并串联这些被时代遗弃的实验与影像，让散落的痕迹彼此印证，构成一部不以进步为唯一尺度的生成史。</p>
<p>我只想循着这些失真的痕迹回望：在机器学会模仿现实之前，它曾如何误解现实；而那些被称为错误的瞬间，又曾孕育怎样的美。</p>
</div></section></article>`;
  }
  $('#catalog-content').innerHTML=content;
  $$('#catalog-content [data-scope]').forEach(b=>b.onclick=()=>{archiveScope=b.dataset.scope;renderCatalog();});
  $$('#catalog-content [data-go]').forEach(b=>b.onclick=()=>goTo(b.dataset.go));
  if($('#clear-search'))$('#clear-search').onclick=()=>{$('#search').value='';$('#category').value='all';query='';category='all';renderCatalog();};
  if($('#random-exhibit'))$('#random-exhibit').onclick=()=>goTo(events[Math.floor(Math.random()*events.length)].id);
}
function emptyState(){return '<div class="empty"><p>这组条件下没有找到馆藏。</p><button class="text-button" id="clear-search">清空搜索，查看全部</button></div>';}
function wireGlobal() {
  $('#previous').onclick=()=>step(-1);$('#next').onclick=()=>step(1);
  $('#catalog-open').onclick=()=>openCatalog();
  $('#catalog-close').onclick=()=>$('#catalog').close();$('#detail-close').onclick=()=>$('#detail').close();
  $('#catalog').addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus();});
  $$('.collection-tabs button').forEach(button=>button.onclick=()=>{selectedTab=button.dataset.tab;renderCatalog();});
  $('#search').oninput=event=>{query=event.target.value;renderCatalog();};
  $('#category').onchange=event=>{category=event.target.value;renderCatalog();};
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,video,audio,[data-interactive],.eliza-experience'))return;
    if($('#detail').open||$('#catalog').open)return;
    if(event.key==='ArrowRight'){event.preventDefault();step(1);}
    if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
    if(event.key.toLowerCase()==='c'){event.preventDefault();openCatalog();}
    if(event.key==='/'){event.preventDefault();openCatalog();$('#search').focus();}
  });
  window.addEventListener('hashchange',()=>{const index=events.findIndex(e=>e.id===decodeURIComponent(location.hash.slice(1)));if(index>=0){current=index;render();}});
  window.addEventListener('resize',renderYears);
  $('#exhibit').addEventListener('wheel',event=>{
    if(event.target.closest('.plaque,.terminal-body,.reading-room,[data-interactive],.eliza-experience,input')||$('#catalog').open||$('#detail').open)return;
    if(Math.abs(event.deltaX)<Math.abs(event.deltaY))return;
    if(Date.now()-wheelAt<650)return;
    wheelSum+=event.deltaX;
    if(Math.abs(wheelSum)>75){step(wheelSum>0?1:-1);wheelSum=0;wheelAt=Date.now();}
  },{passive:true});
  let touch;
  $('#exhibit').addEventListener('touchstart',event=>{if(event.target.closest('input,button,a,video,audio'))return;touch={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
  $('#exhibit').addEventListener('touchend',event=>{if(!touch)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);touch=null;},{passive:true});
}
init();
