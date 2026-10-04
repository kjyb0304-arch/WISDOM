/* WISDOM v4 shared data rules. No network requests, storage, or code evaluation. */
window.WisdomCore = (() => {
  'use strict';
  const categories = Object.freeze({chemical:'화학물질·화학제품',mfds:'식약처 인허가',land:'농지·토지',procurement:'공공조달',administration:'행정기관 대응',general:'기업·개인 행정지원'});
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeJSON = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const defaults = () => ({schemaVersion:1, office:{phone:'',email:'',address:'',hours:'',visitNote:'',parking:'',representative:'',registration:''},links:{kakao:'',blog:'',map:'',form:'',privacy:''},website:{baseUrl:'',searchEnabled:false}});
  function string(value, max, name) {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') throw new Error(name+'은(는) 문자로 입력해 주세요.');
    const cleaned = value.trim();
    if (cleaned.length > max) throw new Error(name+'은(는) '+max+'자 이내로 입력해 주세요.');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cleaned)) throw new Error(name+'에 사용할 수 없는 제어문자가 있습니다.');
    return cleaned;
  }
  function https(value, name, base=false) {
    const result=string(value,1000,name); if(!result)return '';
    if(/[\s\\]/.test(result))throw new Error(name+'에 공백이나 역슬래시를 넣을 수 없습니다.');
    let url; try{url=new URL(result);}catch(_){throw new Error(name+' 주소를 확인해 주세요.');}
    if(url.protocol!=='https:'||url.username||url.password)throw new Error(name+'은(는) 로그인 정보가 없는 https 주소만 사용할 수 있습니다.');
    if(base){if(url.search||url.hash)throw new Error('홈페이지 주소에는 검색조건이나 #을 넣지 마세요.');if(!url.pathname.endsWith('/'))url.pathname+='/';}
    return url.href;
  }
  function settings(raw) {
    if(!raw||raw.schemaVersion!==1)throw new Error('지원하는 사무소 정보 형식이 아닙니다.');
    const o=raw.office||{},l=raw.links||{},w=raw.website||{},out=defaults();
    for(const [key,max,label] of [['phone',40,'전화번호'],['email',160,'이메일'],['address',250,'주소'],['hours',180,'상담시간'],['visitNote',600,'방문 안내'],['parking',400,'주차 안내'],['representative',40,'대표자'],['registration',40,'사업자등록번호']])out.office[key]=string(o[key],max,label);
    if(out.office.phone&&!/^\+?[0-9 ()-]{7,40}$/.test(out.office.phone))throw new Error('전화번호는 숫자, 공백, 괄호, 하이픈과 맨 앞의 +만 입력해 주세요.');
    if(out.office.phone){const count=out.office.phone.replace(/\D/g,'').length;if(count<7||count>15)throw new Error('전화번호의 숫자는 7~15자리로 입력해 주세요.');}
    if(out.office.email&&!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(out.office.email))throw new Error('이메일 주소 형식을 확인해 주세요.');
    for(const [key,label] of [['kakao','카카오톡 상담'],['blog','블로그'],['map','지도'],['form','외부 상담 접수'],['privacy','개인정보 처리방침']])out.links[key]=https(l[key],label);
    out.website.baseUrl=https(w.baseUrl,'홈페이지 주소',true);
    out.website.searchEnabled=w.searchEnabled===true;
    if(out.website.searchEnabled&&!out.website.baseUrl)throw new Error('검색 수집을 허용하려면 홈페이지 주소를 먼저 입력해 주세요.');
    return out;
  }
  function validDate(raw) {
    if(!raw)return '';
    if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error('작성일 형식을 확인해 주세요.');
    const date=new Date(raw+'T00:00:00Z');
    if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==raw)throw new Error('실제로 존재하는 날짜를 입력해 주세요.');
    return raw;
  }
  function catalog(raw) {
    if(!raw||raw.schemaVersion!==1||!Array.isArray(raw.posts)||raw.posts.length>200)throw new Error('지원하는 원고 형식이 아닙니다. 최대 200편까지 사용할 수 있습니다.');
    const ids=new Set();
    const posts=raw.posts.map(record=>{
      if(!record||typeof record.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(record.id)||ids.has(record.id))throw new Error('글 주소가 올바르지 않거나 중복되었습니다.');
      if(!['insights','cases'].includes(record.kind)||!Object.hasOwn(categories,record.category))throw new Error('게시판과 업무 분야를 확인해 주세요.');
      if(!['visible','draft'].includes(record.status))throw new Error('표시 상태를 확인해 주세요.');
      const title=string(record.title,150,'제목'),body=string(record.body,30000,'본문');
      if(!title||!body)throw new Error('제목과 본문이 필요합니다.');
      if(record.kind==='cases'&&record.status==='visible'&&record.caseConfirmed!==true)throw new Error('업무사례는 사실관계·의뢰인 정보 보호·공개 범위를 확인한 뒤 표시할 수 있습니다.');
      ids.add(record.id);
      return {id:record.id,kind:record.kind,category:record.category,status:record.status,caseConfirmed:record.caseConfirmed===true,title,summary:string(record.summary,600,'짧은 소개'),body,date:validDate(record.date),sourceUrl:https(record.sourceUrl,'관련 원문')};
    });
    return {schemaVersion:1,posts};
  }
  function bundle(raw,existing=defaults()) {
    if(raw&&raw.schemaVersion===1&&Array.isArray(raw.posts))return {schemaVersion:4,settings:settings(existing),content:catalog(raw)};
    if(!raw||raw.schemaVersion!==4)throw new Error('4차 운영 백업 또는 3차 원고 JSON을 선택해 주세요.');
    return {schemaVersion:4,settings:settings(raw.settings),content:catalog(raw.content)};
  }
  function renderBody(body) {
    let html='',paragraph=[],bullets=[];
    const p=()=>{if(paragraph.length){html+='<p>'+paragraph.map(escape).join('<br>')+'</p>';paragraph=[];}};
    const b=()=>{if(bullets.length){html+='<ul>'+bullets.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>';bullets=[];}};
    for(const line of String(body).replace(/\r\n/g,'\n').split('\n')){
      if(line.startsWith('## ')){p();b();html+='<h2>'+escape(line.slice(3))+'</h2>';}
      else if(line.startsWith('- ')){p();bullets.push(line.slice(2));}
      else if(!line.trim()){p();b();}else{b();paragraph.push(line);}
    }p();b();return html;
  }
  function routeFile(route){return route==='/home'?'index.html':route==='/not-found'?'404.html':route.replace(/^\//,'')+'/index.html';}
  function href(doc,route,params={}) {
    const q=new URLSearchParams(params).toString();
    return (doc.body.dataset.mode==='static'?(doc.body.dataset.root||'')+routeFile(route):'#'+route)+(q?'?'+q:'');
  }
  const tel = value => 'tel:'+value.replace(/[^0-9+]/g,'');
  function makeChannels(s) {
    return [
      s.office.phone&&{key:'phone',label:'전화 상담',value:s.office.phone,note:'전화 앱으로 연결',url:tel(s.office.phone),external:false},
      s.office.email&&{key:'email',label:'이메일 문의',value:s.office.email,note:'메일 앱에서 직접 작성·발송',url:'mailto:'+s.office.email,external:false},
      s.links.kakao&&{key:'kakao',label:'카카오톡 상담',value:'상담 채널 열기',note:'등록한 카카오톡 채널로 이동',url:s.links.kakao,external:true},
      s.links.form&&{key:'form',label:'온라인 상담',value:'접수 페이지 열기',note:'외부 페이지에서 직접 접수',url:s.links.form,external:true}
    ].filter(Boolean);
  }
  const icon = key => ({phone:'↗',email:'@',kakao:'…',form:'↗'})[key]||'↗';
  function linkAttributes(url,external){return 'href="'+escape(url)+'"'+(external?' target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"':'');}
  function applySettings(doc,raw) {
    const s=settings(raw),channels=makeChannels(s),o=s.office;
    doc.querySelectorAll('[data-office-channels]').forEach(container=>{
      container.innerHTML=channels.map(channel=>'<a class="office-channel" '+linkAttributes(channel.url,channel.external)+'><span class="channel-symbol" aria-hidden="true">'+escape(icon(channel.key))+'</span><span><small>'+escape(channel.label)+'</small><strong>'+escape(channel.value)+'</strong><span class="channel-note">'+escape(channel.note)+'</span></span><span aria-hidden="true" class="channel-arrow">↗</span></a>').join('');
      container.hidden=!channels.length;
    });
    doc.querySelectorAll('[data-channels-empty]').forEach(el=>el.hidden=channels.length>0);
    doc.querySelectorAll('[data-channel-hint]').forEach(el=>el.hidden=!channels.length);
    const fields=[['주소',o.address],['상담시간',o.hours],['방문 안내',o.visitNote],['주차 안내',o.parking]].filter(item=>item[1]);
    doc.querySelectorAll('[data-office-details]').forEach(el=>{el.innerHTML=fields.map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value).replace(/\n/g,'<br>')+'</dd></div>').join('');el.hidden=!fields.length;});
    doc.querySelectorAll('[data-office-empty]').forEach(el=>el.hidden=fields.length>0);
    doc.querySelectorAll('[data-map-button]').forEach(el=>{el.hidden=!s.links.map;if(s.links.map){el.href=s.links.map;el.target='_blank';el.rel='noopener noreferrer';el.referrerPolicy='no-referrer';}else el.removeAttribute('href');});
    doc.querySelectorAll('[data-address-copy]').forEach(el=>{el.hidden=!o.address;el.dataset.copyText=o.address;});
    doc.querySelectorAll('[data-footer-info]').forEach(el=>{
      const details=[o.address&&escape(o.address),o.phone&&'<a href="'+escape(tel(o.phone))+'">TEL. '+escape(o.phone)+'</a>',o.email&&'<a href="mailto:'+escape(o.email)+'">'+escape(o.email)+'</a>',o.hours&&escape(o.hours),o.representative&&'대표 '+escape(o.representative),o.registration&&'사업자등록번호 '+escape(o.registration)].filter(Boolean);
      el.innerHTML=details.map(item=>'<span>'+item+'</span>').join('');el.hidden=!details.length;
    });
    doc.querySelectorAll('[data-footer-external]').forEach(el=>{
      el.innerHTML=[s.links.blog&&'<a '+linkAttributes(s.links.blog,true)+'>블로그 ↗</a>',s.links.privacy&&'<a '+linkAttributes(s.links.privacy,true)+'>개인정보 처리방침 ↗</a>'].filter(Boolean).join('');el.hidden=!el.innerHTML;
    });
    doc.querySelectorAll('[data-mobile-phone]').forEach(el=>{el.href=o.phone?tel(o.phone):href(doc,'/guide');el.textContent=o.phone?'전화 상담':'업무안내';el.setAttribute('aria-label',o.phone?'전화 상담 '+o.phone:'업무안내');});
    doc.querySelectorAll('[data-draft-channels]').forEach(el=>el.hidden=!channels.length);
    return s;
  }
  function card(doc,record,index=0) {
    return '<a class="insight-card" href="'+escape(href(doc,'/'+record.kind+'/'+record.id))+'"><div class="insight-card-top"><span class="category-pill">'+escape(categories[record.category])+'</span><span class="card-count" aria-hidden="true">'+String(index+1).padStart(2,'0')+'</span></div><h3>'+escape(record.title)+'</h3><p>'+escape(record.summary)+'</p><div class="insight-card-footer"><span>'+(record.kind==='cases'?'업무사례':'상담 준비 가이드')+'</span><strong>읽어보기 <span aria-hidden="true">→</span></strong></div></a>';
  }
  function article(doc,r,posts) {
    const kind=r.kind==='cases'?'업무사례':'실무정보',url=(route,params={})=>href(doc,route,params);
    const same=posts.filter(x=>x.id!==r.id&&x.kind===r.kind).sort((a,b)=>Number(b.category===r.category)-Number(a.category===r.category)).slice(0,2);
    return '<nav class="breadcrumb wrap" aria-label="현재 위치"><a href="'+url('/home')+'">홈</a><span aria-hidden="true">›</span><a href="'+url('/'+r.kind)+'">'+kind+'</a><span aria-hidden="true">›</span><span aria-current="page">'+escape(categories[r.category])+'</span></nav><header class="article-hero"><div class="wrap"><p class="eyebrow">'+(r.kind==='cases'?'CASE STUDY':'WISDOM INSIGHT')+'</p><span class="category-pill">'+escape(categories[r.category])+'</span><h1>'+escape(r.title)+'</h1><p class="lead">'+escape(r.summary)+'</p><p class="article-meta">위즈덤 행정사사무소'+(r.date?' · 원고 작성 '+escape(r.date.replaceAll('-','.')):'')+'</p></div></header><div class="wrap reading-layout section"><article class="article-body">'+renderBody(r.body)+(r.sourceUrl?'<p><a class="text-link" '+linkAttributes(r.sourceUrl,true)+'>관련 원문 보기 ↗</a></p>':'')+'<div class="article-endnote"><strong>'+(r.kind==='cases'?'사례별로 사실관계와 진행 경과는 다를 수 있습니다.':'이 글은 상담을 준비하기 위한 안내입니다.')+'</strong><p>'+(r.kind==='cases'?'유사한 상황이라도 필요한 절차는 자료 확인 후 개별적으로 살펴봅니다.':'개별 신청의 제출서류 전체나 인허가 가능 여부를 확정하는 내용은 아닙니다.')+'</p></div><div class="article-back"><a class="text-link" href="'+url('/'+r.kind)+'">← '+kind+' 목록으로</a><button class="button outline print-article" type="button">인쇄하기</button></div></article><aside class="article-aside" aria-label="관련 업무 안내"><p class="eyebrow">YOUR NEXT STEP</p><h2>다음 준비도,<br>한곳에서.</h2><p>'+escape(categories[r.category])+' 업무에 필요한 자료를 확인해 보세요.</p><a class="button primary" href="'+url('/documents',{field:r.category})+'">준비자료 확인 →</a><a class="button outline" href="'+url('/contact',{field:r.category})+'">이 분야 상담 준비 →</a><a class="text-link" href="'+url('/specialties/'+r.category)+'">전문분야 자세히 보기 →</a></aside></div>'+(same.length?'<section class="soft-section"><div class="wrap"><div class="section-head"><div><p class="eyebrow">KEEP READING</p><h2>함께 살펴볼 글</h2></div><a class="text-link" href="'+url('/'+r.kind)+'">전체보기 →</a></div><div class="related-grid">'+same.map((r,i)=>card(doc,r,i)).join('')+'</div></div></section>':'');
  }
  function hydrate(doc,rawContent,rawSettings) {
    const content=catalog(rawContent),posts=content.posts.filter(p=>p.status==='visible');
    doc.querySelectorAll('.article-page').forEach(el=>el.remove());
    const main=doc.getElementById('main-content');
    for(const p of posts){const el=doc.createElement('div');el.className='page article-page';el.hidden=true;el.dataset.route='/'+p.kind+'/'+p.id;el.dataset.title=p.title;el.dataset.description=p.summary;el.innerHTML=article(doc,p,posts);main.append(el);}
    doc.querySelectorAll('[data-content-list]').forEach(el=>{
      const list=posts.filter(p=>p.kind===el.dataset.contentList),empty=el.querySelector('[data-empty]');
      el.querySelector('[data-results]').innerHTML=list.map((p,i)=>card(doc,p,i)).join('');el.querySelector('[data-count]').textContent=String(list.length);empty.hidden=!!list.length;
      empty.querySelector('h2').textContent=el.dataset.contentList==='cases'?'공개할 사례를 준비하고 있습니다.':'등록된 글이 없습니다.';
      empty.querySelector('[data-empty-copy]').textContent=el.dataset.contentList==='cases'?'의뢰인 정보와 공개 범위를 확인한 사례부터 소개하겠습니다.':'새로운 실무정보가 준비되면 이곳에서 안내합니다.';
      el.querySelector('[data-reset]').hidden=!list.length;
    });
    const home=doc.getElementById('home-insights');if(home){const picks=posts.filter(p=>p.kind==='insights').slice(0,3);home.innerHTML=picks.map((p,i)=>card(doc,p,i)).join('');home.closest('[data-insights-home]').hidden=!picks.length;}
    applySettings(doc,rawSettings);return posts;
  }
  function readSettings(doc=document){const node=doc.getElementById('wisdom-settings');return settings(node?JSON.parse(node.textContent):(window.WisdomSettingsSeed||defaults()));}
  return {categories,escape,safeJSON,defaults,settings,catalog,bundle,renderBody,routeFile,href,makeChannels,applySettings,hydrate,readSettings};
})();

/* WISDOM v3 · Local content rendering; no network or persistent storage. */
window.WisdomContent = (() => {
  'use strict';
  const categories = {chemical:'화학물질·화학제품',mfds:'식약처 인허가',land:'농지·토지',procurement:'공공조달',administration:'행정기관 대응',general:'기업·개인 행정지원'};
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
  const validate = window.WisdomCore.catalog;
  let data;
  try { data = validate(JSON.parse(document.getElementById('wisdom-content')?.textContent || JSON.stringify(window.WisdomSeed || {schemaVersion:1,posts:[]}))); }
  catch(error) { data = {schemaVersion:1,posts:[]}; console.error(error.message); }
  const posts = data.posts.filter(record => record.status === 'visible');
  function routeHref(route, params={}) {
    const query = new URLSearchParams(params).toString();
    const body = document.body;
    const routePath = route === '/home' ? 'index.html' : route.slice(1) + '/index.html';
    const base = body.dataset.mode === 'static' ? (body.dataset.root || '') + routePath : '#'+route;
    return base+(query?'?'+query:'');
  }
  function renderBody(body) {
    let html = '', paragraph=[], bullets=[];
    const flushParagraph=()=>{if(paragraph.length){html+='<p>'+paragraph.map(escape).join('<br>')+'</p>';paragraph=[];}};
    const flushBullets=()=>{if(bullets.length){html+='<ul>'+bullets.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>';bullets=[];}};
    for(const line of body.replace(/\r\n/g,'\n').split('\n')) {
      if(line.startsWith('## ')){flushParagraph();flushBullets();html+='<h2>'+escape(line.slice(3))+'</h2>';}
      else if(line.startsWith('- ')){flushParagraph();bullets.push(line.slice(2));}
      else if(!line.trim()){flushParagraph();flushBullets();}
      else{flushBullets();paragraph.push(line);}
    }
    flushParagraph();flushBullets();return html;
  }
  function card(record, index=0) {
    const type = record.kind==='cases'?'업무사례':'상담 준비 가이드';
    return `<a class="insight-card" href="${escape(routeHref('/'+record.kind+'/'+record.id))}"><div class="insight-card-top"><span class="category-pill">${escape(categories[record.category])}</span><span class="card-count" aria-hidden="true">${String(index+1).padStart(2,'0')}</span></div><h3>${escape(record.title)}</h3><p>${escape(record.summary)}</p><div class="insight-card-footer"><span>${type}</span><strong>읽어보기 <span aria-hidden="true">→</span></strong></div></a>`;
  }
  function initLists() {
    document.querySelectorAll('[data-content-list]').forEach(container=>{
      const kind = container.dataset.contentList;
      const items = posts.filter(post=>post.kind===kind);
      const search = container.querySelector('input[type="search"]');
      const results=container.querySelector('[data-results]'), count=container.querySelector('[data-count]'), empty=container.querySelector('[data-empty]');
      let category = 'all';
      function render(){
        const tokens=(search.value||'').trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
        const matches=items.filter(item=>(category==='all'||category===item.category)&&tokens.every(token=>(item.title+' '+item.summary+' '+item.body+' '+categories[item.category]).toLocaleLowerCase('ko').includes(token)));
        results.innerHTML=matches.map(card).join(''); count.textContent=String(matches.length); empty.hidden=matches.length>0;
        empty.querySelector('h2').textContent=items.length?(kind==='cases'?'조건에 맞는 사례가 없습니다.':'검색 결과가 없습니다.'):(kind==='cases'?'공개할 사례를 준비하고 있습니다.':'등록된 글이 없습니다.');
        empty.querySelector('[data-empty-copy]').textContent=items.length?'다른 검색어를 입력하거나 분야 선택을 바꿔보세요.':(kind==='cases'?'의뢰인 정보와 공개 범위를 확인한 사례부터 소개하겠습니다.':'새로운 실무정보가 준비되면 이곳에서 안내합니다.');
        container.querySelector('[data-reset]').hidden=!items.length;
      }
      container.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
        category=button.dataset.category;
        container.querySelectorAll('[data-category]').forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active));});render();
      }));
      search.addEventListener('input',render);
      container.querySelector('[data-reset]').addEventListener('click',()=>{search.value='';container.querySelector('[data-category="all"]').click();search.focus();});
      render();
    });
  }
  function addPages(){
    if (document.body.dataset.mode === 'static') return;
    const main=document.getElementById('main-content');
    main.querySelectorAll('.article-page').forEach(node=>node.remove());
    posts.forEach(record=>{
      const page=document.createElement('div');page.className='page article-page';page.hidden=true;page.dataset.route='/'+record.kind+'/'+record.id;page.dataset.title=record.title;page.dataset.description=record.summary;
      const kindName=record.kind==='cases'?'업무사례':'실무정보';
      const same=posts.filter(other=>other.id!==record.id&&other.kind===record.kind).sort((a,b)=>Number(b.category===record.category)-Number(a.category===record.category)).slice(0,2);
      page.innerHTML=`<nav class="breadcrumb wrap" aria-label="현재 위치"><a href="${routeHref('/home')}">홈</a><span aria-hidden="true">›</span><a href="${routeHref('/'+record.kind)}">${kindName}</a><span aria-hidden="true">›</span><span aria-current="page">${escape(categories[record.category])}</span></nav><header class="article-hero"><div class="wrap"><p class="eyebrow">${record.kind==='cases'?'CASE STUDY':'WISDOM INSIGHT'}</p><span class="category-pill">${escape(categories[record.category])}</span><h1>${escape(record.title)}</h1><p class="lead">${escape(record.summary)}</p><p class="article-meta">위즈덤 행정사사무소${record.date?' <span aria-hidden="true">·</span> 원고 작성 '+escape(record.date.replaceAll('-','.')):''}</p></div></header><div class="wrap reading-layout section"><article class="article-body">${renderBody(record.body)}${record.sourceUrl?`<p><a class="text-link" href="${escape(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">관련 원문 보기 ↗</a></p>`:''}<div class="article-endnote"><strong>${record.kind==='cases'?'사례별로 사실관계와 진행 경과는 다를 수 있습니다.':'이 글은 상담을 준비하기 위한 안내입니다.'}</strong><p>${record.kind==='cases'?'유사한 상황이라도 필요한 절차는 자료 확인 후 개별적으로 살펴봅니다.':'개별 신청의 제출서류 전체나 인허가 가능 여부를 확정하는 내용은 아닙니다.'}</p></div><div class="article-back"><a class="text-link" href="${routeHref('/'+record.kind)}">← ${kindName} 목록으로</a><button class="button outline print-article" type="button">인쇄하기</button></div></article><aside class="article-aside" aria-label="관련 업무 안내"><p class="eyebrow">YOUR NEXT STEP</p><h2>다음 준비도,<br>한곳에서.</h2><p>${escape(categories[record.category])} 업무에 필요한 자료를 확인해 보세요.</p><a class="button primary" href="${routeHref('/documents',{field:record.category})}">준비자료 확인 →</a><a class="button outline" href="${routeHref('/contact',{field:record.category})}">이 분야 상담 준비 →</a><a class="text-link" href="${routeHref('/specialties/'+record.category)}">전문분야 자세히 보기 →</a></aside></div>${same.length?`<section class="soft-section"><div class="wrap"><div class="section-head"><div><p class="eyebrow">KEEP READING</p><h2>함께 살펴볼 글</h2></div><a class="text-link" href="${routeHref('/'+record.kind)}">전체보기 →</a></div><div class="related-grid">${same.map(card).join('')}</div></div></section>`:''}`;
      main.append(page);
    });
  }
  addPages();initLists();
  const home=document.getElementById('home-insights');
  if(home){const picks=posts.filter(item=>item.kind==='insights').slice(0,3);home.innerHTML=picks.map(card).join('');home.closest('[data-insights-home]').hidden=!picks.length;}
  return {data,validate,renderBody,categories,routeHref,searchItems:posts.map(item=>({title:item.title,desc:item.summary,route:'/'+item.kind+'/'+item.id,terms:[categories[item.category],item.title,item.summary,item.body].join(' ')}))};
})();

const SERVICES = [{"id": "chemical", "num": "01", "name": "화학물질·화학제품", "situation": "화학제품을\n수입·제조·판매하려고 합니다", "desc": "제품의 성분과 용도, 유통 계획을 살펴 필요한 규제 대응 절차를 정리합니다.", "title": "제품을 이해하고,\n필요한 절차를 찾습니다.", "intro": "성분과 용도, 제조·수입 방식부터 확인합니다. 준비된 자료와 검토할 사항을 나누어 진행 방향을 정리합니다.", "topics": ["화학물질확인·수입절차 검토", "K-REACH 등록·신고 관련 준비", "생활화학제품 관련 절차", "살생물물질·살생물제품 관련 절차"], "docs": ["성분명·CAS 번호·함량 자료", "제품 용도·사용방법·표시안", "SDS 및 보유 시험자료", "제조·수입·판매 계획"], "question": "어떤 제품을, 어떤 용도로 유통하려고 하시나요?"}, {"id": "mfds", "num": "02", "name": "식약처 인허가", "situation": "화장품·의약외품\n인허가를 준비하고 있습니다", "desc": "제품의 유형과 영업 형태를 확인하고 준비자료와 진행 순서를 살펴봅니다.", "title": "제품과 사업에 맞는\n인허가의 출발점을 찾습니다.", "intro": "같은 제품처럼 보여도 실제 용도와 영업 형태에 따라 검토할 내용은 달라집니다. 제품 정보를 먼저 확인하고 필요한 준비를 안내합니다.", "topics": ["화장품 관련 영업등록 준비", "화장품 수입 관련 행정절차", "의약외품 관련 인허가 준비", "제품 표시·제출자료 검토"], "docs": ["제품 설명·용도·사용방법", "전성분표 및 보유 규격자료", "제조사·수입자·판매자 정보", "보유 시험성적서와 표시안"], "question": "제품과 사업 형태를 함께 알려주세요."}, {"id": "land", "num": "03", "name": "농지·토지", "situation": "농지나 토지 문제를\n해결하고 싶습니다", "desc": "공부와 현황, 이용 목적을 함께 살펴 필요한 토지 행정절차를 확인합니다.", "title": "땅의 현재를 확인하고,\n다음 절차를 살핍니다.", "intro": "토지대장에 적힌 내용과 실제 이용 현황을 함께 봅니다. 이용 목적과 기존 인허가 자료를 확인해 검토 순서를 정리합니다.", "topics": ["농지취득 관련 검토", "농지전용 관련 행정절차", "지목변경 관련 자료 검토", "개발행위·기관 질의 준비"], "docs": ["소재지·지번 및 이용 목적", "토지대장·토지이용계획 자료", "현장사진·도면·기존 허가자료", "기관에서 받은 통지서"], "question": "어느 토지를, 어떻게 이용하려고 하시나요?"}, {"id": "procurement", "num": "04", "name": "공공조달", "situation": "나라장터·공공조달시장에\n진입하고 싶습니다", "desc": "기업과 제품의 준비 상태를 확인하고 진입 방식과 필요한 증빙을 살펴봅니다.", "title": "제품의 준비 상태에서,\n조달 진입의 순서를 찾습니다.", "intro": "회사와 제품의 정보, 보유 인증과 시험자료를 함께 확인합니다. 희망하는 조달 방식에 맞춰 준비된 사항과 보완할 사항을 나눕니다.", "topics": ["나라장터 입찰참가자격 등록 준비", "세부품명·입찰요건 검토", "직접생산확인 관련 준비", "MAS·벤처나라 등 진입 검토"], "docs": ["사업자·공장·제조 관련 자료", "제품 카탈로그·규격서", "보유 인증서·시험성적서", "검토하려는 공고문·조달 방식"], "question": "제품과 보유 증빙부터 함께 확인합니다."}, {"id": "administration", "num": "05", "name": "행정기관 대응", "situation": "관청에서 보완·처분·\n자료제출 요구를 받았습니다", "desc": "받은 문서와 기한을 먼저 확인하고 대응에 필요한 사실과 자료를 정리합니다.", "title": "받은 문서의 핵심부터,\n대응의 순서를 찾습니다.", "intro": "어느 기관에서 무엇을 요구하는지, 언제까지 대응해야 하는지부터 확인합니다. 사실관계와 자료를 정리해 제출서류를 준비합니다.", "topics": ["보완요구·자료제출 대응서류", "질의서·의견서 작성", "정보공개청구 관련 서류", "사실관계·증빙자료 정리"], "docs": ["받은 공문·통지서 전체", "통지받은 날짜와 제출기한", "이미 제출한 신청서·첨부자료", "사실관계를 뒷받침하는 자료"], "question": "받은 문서와 제출기한을 먼저 알려주세요."}, {"id": "general", "num": "06", "name": "기업·개인 행정지원", "situation": "어떤 절차가 필요한지\n잘 모르겠습니다", "desc": "업무명을 몰라도 괜찮습니다. 현재 상황에서 필요한 확인부터 시작합니다.", "title": "업무명을 몰라도,\n상황에서 시작할 수 있습니다.", "intro": "지금 해결하려는 일과 가지고 계신 자료를 알려주세요. 확인할 내용과 담당기관, 진행 가능 범위를 먼저 정리합니다.", "topics": ["현재 상황과 필요 절차 확인", "행정기관 제출서류 준비", "담당기관·진행 순서 확인", "비대면 상담·출장 필요성 검토"], "docs": ["현재 상황에 대한 간단한 설명", "해결하려는 목표와 희망 일정", "보유한 공문·신청서·관련 자료", "이전 진행 경과"], "question": "지금 어떤 상황인지 편하게 알려주세요."}];
const ROUTE_FILES = {"/home": "index.html", "/guide": "guide/index.html", "/specialties": "specialties/index.html", "/about": "about/index.html", "/nationwide": "nationwide/index.html", "/cases": "cases/index.html", "/insights": "insights/index.html", "/contact": "contact/index.html", "/documents": "documents/index.html", "/not-found": "404.html", "/specialties/chemical": "specialties/chemical/index.html", "/specialties/mfds": "specialties/mfds/index.html", "/specialties/land": "specialties/land/index.html", "/specialties/procurement": "specialties/procurement/index.html", "/specialties/administration": "specialties/administration/index.html", "/specialties/general": "specialties/general/index.html", "/faq": "faq/index.html", "/insights/chemical-preparation": "insights/chemical-preparation/index.html", "/insights/mfds-preparation": "insights/mfds-preparation/index.html", "/insights/land-preparation": "insights/land-preparation/index.html", "/insights/procurement-preparation": "insights/procurement-preparation/index.html", "/insights/administration-preparation": "insights/administration-preparation/index.html", "/insights/general-preparation": "insights/general-preparation/index.html"};
'use strict';
(() => {
  const body = document.body;
  const previewMode = body.dataset.mode !== 'static';
  const rootPath = body.dataset.root || '';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const byId = id => document.getElementById(id);
  const validField = value => SERVICES.some(item => item.id === value) ? value : 'general';
  const serviceFor = value => SERVICES.find(item => item.id === validField(value));
  let activeRoute = body.dataset.currentRoute || '/home';
  let activeDraft = '';
  const selectedDocuments = new Map();
  const mainNav = byId('main-nav');
  const menuToggle = $('.menu-toggle');

  function hrefFor(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    const path = previewMode ? '#' + route : rootPath + window.WisdomCore.routeFile(route);
    return path + (query ? '?' + query : '');
  }
  function setMenu(open) {
    if (!mainNav || !menuToggle) return;
    mainNav.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    menuToggle.textContent = open ? '×' : '☰';
  }
  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (menuToggle?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
  });
  const wideScreen = window.matchMedia('(min-width:1041px)');
  wideScreen.addEventListener('change', () => setMenu(false));

  function currentParams() {
    return new URLSearchParams(previewMode ? (location.hash.split('?')[1] || '') : location.search);
  }
  function invalidateDraft() {
    activeDraft = '';
    if (byId('draft-output')) byId('draft-output').hidden = true;
    if (byId('draft-text')) byId('draft-text').value = '';
  }
  function checkbox(labelText, index, checked, className) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = String(index); input.checked = checked;
    const labelSpan = document.createElement('span');
    labelSpan.textContent = labelText;
    label.append(input, labelSpan);
    return label;
  }
  function contactChecklist(indices = []) {
    const container = byId('contact-checklist');
    if (!container) return;
    const s = serviceFor(byId('field').value);
    container.replaceChildren(...s.docs.map((item,index) => checkbox(item, index, indices.includes(index), 'contact-checkitem')));
    byId('contact-docs-link').href = hrefFor('/documents', {field:s.id});
  }
  function initContact(params) {
    if (!byId('contact-form')) return;
    if (params.has('field')) byId('field').value = validField(params.get('field'));
    if (params.has('mode') && ['remote','onsite','undecided'].includes(params.get('mode'))) byId('support-mode').value = params.get('mode');
    const currentIndices = params.has('docs')
      ? params.get('docs').split(',').filter(value => /^\d+$/.test(value)).map(Number)
      : $$('#contact-checklist input:checked').map(input => Number(input.value));
    contactChecklist(currentIndices);
    invalidateDraft();
  }
  function syncDocumentCount() {
    const select = byId('document-field');
    if (!select) return;
    const s = serviceFor(select.value);
    const indices = $$('#document-checklist input:checked').map(input => Number(input.value));
    selectedDocuments.set(s.id, indices);
    byId('document-count').textContent = `${indices.length} / ${s.docs.length}`;
    const params = {field:s.id};
    if (indices.length) params.docs = indices.join(',');
    byId('documents-contact').href = hrefFor('/contact', params);
  }
  function renderDocumentChecklist() {
    const select = byId('document-field');
    if (!select) return;
    const s = serviceFor(select.value);
    const indices = selectedDocuments.get(s.id) || [];
    byId('document-title').textContent = s.name + ' 준비자료';
    byId('document-checklist').replaceChildren(...s.docs.map((item,index) => checkbox(item,index,indices.includes(index),'document-checkitem')));
    syncDocumentCount();
  }
  function initDocuments(params) {
    if (!byId('document-field')) return;
    if (params.has('field')) byId('document-field').value = validField(params.get('field'));
    renderDocumentChecklist();
  }
  function renderRoute(initial = false) {
    const requested = previewMode ? (location.hash.slice(1).split('?')[0] || '/home') : body.dataset.currentRoute;
    const pages = $$('.page');
    const target = pages.find(page => page.dataset.route === requested) || pages.find(page => page.dataset.route === '/not-found');
    if (!target) return;
    activeRoute = target.dataset.route;
    pages.forEach(page => { page.hidden = page !== target; });
    $$('[data-nav]').forEach(link => {
      const current = (activeRoute === '/visit' && link.dataset.nav === '/about') || activeRoute === link.dataset.nav || (['/specialties','/cases','/insights'].includes(link.dataset.nav) && activeRoute.startsWith(link.dataset.nav+'/'));
      link.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.title = activeRoute === '/home' ? '위즈덤 행정사사무소 | WISDOM(慧眼)' : `${target.dataset.title} | 위즈덤 행정사사무소`;
    $('meta[name="description"]')?.setAttribute('content', target.dataset.description || '위즈덤 행정사사무소');
    setMenu(false);
    if (byId('search-dialog')?.open) byId('search-dialog').close();
    if (activeRoute === '/contact') initContact(currentParams());
    if (activeRoute === '/documents') initDocuments(currentParams());
    if (!initial) {
      window.scrollTo({top:0,behavior:'instant'});
      const heading = $('h1',target);
      if (heading) { heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true}); }
    }
  }
  if (previewMode) window.addEventListener('hashchange', () => {
    if (location.hash === '#main-content') return;
    renderRoute();
  });

  function saveText(text, filename) {
    const blob = new Blob(['\uFEFF', text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const form = byId('contact-form');
  if (form) {
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', () => { byId('goal').setCustomValidity(''); invalidateDraft(); });
    byId('field').addEventListener('change', () => { contactChecklist(); invalidateDraft(); });
    byId('make-draft').addEventListener('click', () => {
      const goal = byId('goal');
      goal.setCustomValidity(goal.value.trim().length >= 2 ? '' : '현재 상황을 두 글자 이상 적어주세요.');
      if (!form.reportValidity()) return;
      const s = serviceFor(byId('field').value);
      const selected = $$('#contact-checklist input:checked').map(input => s.docs[Number(input.value)]).filter(Boolean);
      activeDraft = [
        '[위즈덤 행정사사무소 상담 요청서 — 미접수]',
        '상담 분야: ' + s.name,
        '희망 진행 방식: ' + byId('support-mode').selectedOptions[0].textContent,
        '관련 지역: ' + (byId('region').value.trim() || '미입력'),
        '희망 일정·문서 기한: ' + (byId('deadline').value.trim() || '미입력'),
        '현재 상황과 해결하려는 일:\n' + goal.value.trim(),
        '보유자료:\n' + (selected.length ? selected.map(item => '· '+item).join('\n') : '선택한 자료 없음'),
        '※ 이 문서는 상담 준비용 초안입니다. 실제 접수·전송은 이루어지지 않았습니다.'
      ].join('\n\n');
      byId('draft-text').value = activeDraft;
      byId('draft-output').hidden = false;
      byId('draft-status').textContent = '요청서가 작성되었습니다. 실제 접수는 이루어지지 않았습니다.';
      byId('draft-text').focus({preventScroll:true});
      byId('draft-output').scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    });
    byId('copy-draft').addEventListener('click', async () => {
      if (!activeDraft) return;
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(activeDraft); copied = true; }
      } catch (_) { /* File preview may not expose the Clipboard API. */ }
      if (!copied) {
        const text = byId('draft-text'); text.focus(); text.select();
        try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      }
      byId('draft-status').textContent = copied
        ? '요청서 내용을 복사했습니다. 실제 접수는 이루어지지 않았습니다.'
        : '자동 복사를 사용할 수 없습니다. 선택된 내용을 Ctrl+C 또는 기기의 복사 메뉴로 복사해 주세요.';
    });
    byId('save-draft').addEventListener('click', () => {
      if (!activeDraft) return;
      saveText(activeDraft, 'WISDOM_상담요청서_초안.txt');
      byId('draft-status').textContent = '요청서 파일 저장을 시작했습니다. 실제 접수는 이루어지지 않았습니다.';
    });
    byId('clear-form').addEventListener('click', () => { form.reset(); contactChecklist(); invalidateDraft(); byId('field').focus(); });
  }
  byId('document-field')?.addEventListener('change', renderDocumentChecklist);
  byId('document-checklist')?.addEventListener('change', syncDocumentCount);
  byId('save-checklist')?.addEventListener('click', () => {
    const s = serviceFor(byId('document-field').value);
    const selected = selectedDocuments.get(s.id) || [];
    const text = [
      '[WISDOM 상담 준비자료]', '업무 분야: '+s.name,
      ...s.docs.map((item,index) => (selected.includes(index) ? '[보유] ' : '[미표시] ') + item),
      '', '상담 준비용 목록입니다. 개별 신청에 필요한 서류 전체를 뜻하지는 않습니다.',
      '이 화면에서 실제 서류 전송이나 접수는 이루어지지 않았습니다.'
    ].join('\n');
    saveText(text, 'WISDOM_'+s.id+'_준비자료.txt');
  });

  const dialog = byId('search-dialog');
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && dialog?.open) { event.preventDefault(); dialog.close(); $('.search-open')?.focus(); } });
  const searchInput = byId('site-search');
  const searchResults = byId('search-results');
  const searchIndex = [
    {title:'상담 채널·오시는 길',desc:'문의 방법과 사무소 방문 안내를 확인합니다.',route:'/visit',terms:'전화 연락처 이메일 메일 카카오톡 지도 주소 주차 방문 상담시간 위치'},
    ...window.WisdomContent.searchItems,
    {title:"자주 묻는 질문",desc:"준비자료와 상담 진행에 관한 질문을 확인합니다.",route:"/faq",terms:"질문 FAQ 비용 일정 서류 비대면 출장 상담"},
    ...SERVICES.map(s => ({title:s.name,desc:s.desc,route:'/specialties/'+s.id,terms:[s.name,s.desc,s.intro,...s.topics,...s.docs].join(' ')})),
    {title:'사무소소개 · WISDOM, 그리고 慧眼',desc:'위즈덤의 사무소 철학과 업무 방식을 살펴봅니다.',route:'/about',terms:'위즈덤 WISDOM 혜안 慧眼 사무소소개 철학 기속 재량'},
    {title:'전국대행·출장',desc:'비대면 진행과 현장출장 안내를 확인합니다.',route:'/nationwide',terms:'전국 출장 비대면 지역 대전 세종 충청'},
    {title:'서류 안내',desc:'분야별 준비자료를 체크하고 목록을 저장합니다.',route:'/documents',terms:'서류 자료 준비 목록 업로드 보내기'},
    {title:'상담 준비',desc:'현재 상황과 기한을 상담 요청서로 정리합니다.',route:'/contact',terms:'상담 문의 HELP DESK 상담신청 요청서'}
  ];
  function runSearch() {
    const tokens = searchInput.value.trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
    const result = tokens.length ? searchIndex.filter(item => tokens.every(token => (item.title+' '+item.terms).toLocaleLowerCase('ko').includes(token))) : searchIndex.slice(0,6);
    if (!result.length) {
      const p = document.createElement('p');p.className='no-search-result';p.textContent='찾는 업무가 없으신가요? 상담 준비 화면에서 현재 상황을 알려주세요.';
      const a = document.createElement('a');a.href=hrefFor('/contact');a.className='button outline';a.textContent='상담 준비하기 →';
      searchResults.replaceChildren(p,a);return;
    }
    searchResults.replaceChildren(...result.map(item => {
      const a=document.createElement('a');a.href=hrefFor(item.route);a.className='search-result';
      const strong=document.createElement('strong');strong.textContent=item.title;
      const desc=document.createElement('span');desc.textContent=item.desc;
      a.append(strong,desc);return a;
    }));
  }
  $('.search-open')?.addEventListener('click', () => { setMenu(false); dialog.showModal();runSearch();searchInput.focus(); });
  $('.dialog-close')?.addEventListener('click', () => dialog.close());
  searchInput?.addEventListener('input',runSearch);
  searchResults?.addEventListener('click', event => { if(event.target.closest('a')) dialog.close(); });
  dialog?.addEventListener('click',event => {
    const r=dialog.getBoundingClientRect();
    if(event.target===dialog && (event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)) dialog.close();
  });
  renderRoute(true);
})();


/* v4 configured channels are links, not automatic submission. */
(() => {
  'use strict';
  try{window.WisdomCore.applySettings(document,window.WisdomCore.readSettings());}catch(error){console.error(error.message);}
  document.addEventListener('click',async event=>{
    if(event.target.closest('.print-article')){window.print();return;}
    const button=event.target.closest('[data-address-copy]');if(!button)return;
    const value=button.dataset.copyText||'';if(!value)return;
    let copied=false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);copied=true;}}catch(_){}
    if(!copied){const t=document.createElement('textarea');t.value=value;t.style.cssText='position:fixed;left:-10000px';document.body.append(t);t.select();try{copied=document.execCommand('copy');}catch(_){}t.remove();button.focus();}
    const out=document.getElementById('address-copy-status');if(out)out.textContent=copied?'주소를 복사했습니다.':'자동 복사를 사용할 수 없습니다. 화면의 주소를 선택해 복사해 주세요.';
  });
})();
