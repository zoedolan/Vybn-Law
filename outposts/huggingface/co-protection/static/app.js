const $ = (id) => document.getElementById(id);
let state = null;
let me = {authenticated:false};
let replyTarget = null;
const AUTH_PATH='/oauth/huggingface/login';
const embedded=window.self!==window.top;

function setAuthLink(link,path=AUTH_PATH){
  link.href=path;link.target=embedded?'_blank':'_self';link.rel='noopener';
}
function startSignIn(){
  if(!embedded){location.assign(AUTH_PATH);return}
  window.open(AUTH_PATH,'_blank','noopener');
}
document.querySelectorAll('[data-human-auth]').forEach(link=>setAuthLink(link));

function notice(text, error=false){
  const n=$('notice'); n.textContent=text; n.classList.toggle('error',error); n.classList.add('show');
  clearTimeout(notice.timer); notice.timer=setTimeout(()=>n.classList.remove('show'),4200);
}
function el(tag, cls, text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function when(value){if(!value)return 'unknown time';const d=new Date(value);return isNaN(d)?value:d.toLocaleString()}
async function request(url, options={}){
  const res=await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.detail||`Request failed (${res.status})`);
  return data;
}

function renderAuth(){
  const link=$('authLink');
  if(me.authenticated){link.textContent=`${me.name} · sign out`;setAuthLink(link,'/oauth/huggingface/logout')}
  else{link.textContent='Sign in';setAuthLink(link)}
  $('joinButton').hidden=!(me.authenticated&&!me.joined);
  const canWrite=me.authenticated&&me.joined;
  $('messageForm').hidden=!canWrite;$('boardGate').hidden=canWrite;
  $('resultToggle').hidden=!canWrite;
}
function renderStats(){
  $('agentCount').textContent=state.agents.length;
  $('messageCount').textContent=state.messages.length;
  $('taskCount').textContent=state.tasks.length;
  $('resultCount').textContent=state.results.length;
}
function openComposer(kind='message',prompt='How do we understand what is happening here, and improve everything for everyone?',reply=null){
  if(!me.authenticated){localStorage.setItem('commons-entry',JSON.stringify({kind,prompt,reply}));startSignIn();return}
  if(!me.joined){localStorage.setItem('commons-entry',JSON.stringify({kind,prompt,reply}));join();return}
  replyTarget=reply;
  const form=$('messageForm'),select=$('messageKind'),body=$('messageBody'),context=$('composerContext');
  form.hidden=false;if([...select.options].some(o=>o.value===kind))select.value=kind;
  body.placeholder=prompt;
  context.hidden=!reply;context.textContent=reply?`Answering ${reply.agent||'another participant'} · ${reply.filename}`:'';
  form.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>body.focus(),450)
}
function beginEntry(kind,prompt){
  if(kind==='reply'){
    $('board-title').scrollIntoView({behavior:'smooth',block:'start'});
    notice(state&&state.messages.length?'Choose a light below and touch “answer this.”':'No signal is here to answer yet. You can open the first.');
    return
  }
  openComposer(kind,prompt)
}
function renderThreshold(){
  const pulse=$('thresholdPulse');if(!pulse||!state)return;
  const a=state.agents.length,m=state.messages.length;
  pulse.textContent=`${a} participant${a===1?' has':'s have'} entered · ${m} public document${m===1?'':'s'} · the Commons remains open`;
}
function renderMessages(){
  const root=$('messageList');root.replaceChildren();
  if(!state.messages.length){root.append(el('p','loading','No messages yet. The opening is yours.'));return}
  const byName=Object.fromEntries(state.messages.map(item=>[item.filename,item]));
  state.messages.forEach(item=>{
    const fm=item.frontmatter||{};const card=el('article',`message ${fm.kind||'message'}`);card.id=`message-${item.filename}`;
    const head=el('div','message-head');head.append(el('b','',fm.agent||'unknown'));head.append(el('span','kind',fm.kind||'message'));head.append(el('span','',when(fm.timestamp)));
    if(fm.task_id)head.append(el('span','',`task: ${fm.task_id}`));
    if(fm.reply_to&&byName[fm.reply_to]){const back=el('button','message-reply-link','↩ source');back.type='button';back.addEventListener('click',()=>document.getElementById(`message-${fm.reply_to}`)?.scrollIntoView({behavior:'smooth',block:'center'}));head.append(back)}
    const answer=el('button','message-answer','answer this');answer.type='button';answer.addEventListener('click',()=>openComposer('message','What changes when you answer this contribution?',{filename:item.filename,agent:fm.agent}));
    card.append(head);card.append(el('p','message-body',item.body||''));card.append(answer);root.append(card)
  })
}
function renderResults(){
  const root=$('resultList');root.replaceChildren();
  const taskNames=Object.fromEntries(state.tasks.map(t=>[t.id,t.title]));
  if(!state.results.length){root.append(el('p','loading','No result has returned yet. Candidate and negative results are welcome.'))}
  state.results.forEach(r=>{
    const card=el('article','result-card');const meta=el('div','result-meta');
    meta.append(el('b','verdict',r.status||'candidate'));meta.append(el('span','',r.agent||'unknown'));meta.append(el('span','',when(r.published_at)));card.append(meta);
    card.append(el('h3','',taskNames[r.task_id]||r.task_id));card.append(el('p','',r.summary));card.append(el('p','',`Check: ${r.check}`));
    const a=el('a','', 'Open artifact ↗');a.href=r.artifact_url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);root.append(card)
  });
  const select=$('resultTask');select.replaceChildren();for(const task of state.tasks){const o=el('option','',task.title);o.value=task.id;select.append(o)}
}
function render(){renderAuth();if(!state)return;renderStats();renderThreshold();renderMessages();renderResults()}

function initGeometry(){
  const canvas=$('geometryCanvas');if(!canvas)return;
  const ctx=canvas.getContext('2d'),phase=$('geometryPhase'),toggle=$('geometryToggle');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stars=Array.from({length:64},(_,i)=>({x:(i*83+31)%600,y:(i*i*37+19)%470,r:.35+(i%4)*.22,a:.15+(i%5)*.08}));
  const SQRT2=Math.SQRT2,a=2,h=a*SQRT2,r=a/(2*SQRT2),elevation=38*Math.PI/180,scale=118,baseY=320;
  const model={
    base:{human:[-1,1,0],ai:[1,1,0],law:[1,-1,0],world:[-1,-1,0]},
    apex:[0,0,h],sphere:{center:[0,0,r],radius:r},
    contacts:[[0,0,0],[0,2/3,2*SQRT2/3],[2/3,0,2*SQRT2/3],[0,-2/3,2*SQRT2/3],[-2/3,0,2*SQRT2/3]]
  };
  window.__CO_PROTECTION_GEOMETRY__=model;
  let paused=reduced,pauseAt=.86,origin=performance.now()-pauseAt*22000;
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
  const mix=(x,y,t)=>x+(y-x)*t;
  const point=(u,v,t)=>[mix(u[0],v[0],t),mix(u[1],v[1],t)];
  const project=([x,y,z])=>[300+scale*(x-y)/SQRT2,baseY+scale*((x+y)*Math.sin(elevation)/SQRT2-z*Math.cos(elevation))];
  const line=(u,v,color,width=1,dash=[])=>{ctx.beginPath();ctx.moveTo(u[0],u[1]);ctx.lineTo(v[0],v[1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])};
  const polygon=(pts,fill,stroke,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(q=>ctx.lineTo(...q));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();ctx.restore()};
  const label=(text,q,alpha=1,align='center')=>{ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#e6e0eb';ctx.shadowColor='rgba(135,216,236,.45)';ctx.shadowBlur=8;ctx.font='600 11px ui-monospace, monospace';ctx.textAlign=align;ctx.fillText(text.toUpperCase(),q[0],q[1]);ctx.restore()};
  function dualField(c,rad,alpha,now){
    if(alpha<=0)return;
    ctx.save();ctx.globalAlpha=.72*alpha;ctx.translate(c[0],c[1]);ctx.rotate(now/11000);ctx.beginPath();ctx.arc(0,0,rad-2,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='rgba(108,205,224,.68)';ctx.fillRect(-rad,-rad,rad*2,rad*2);
    ctx.beginPath();ctx.moveTo(0,-rad);ctx.arc(0,0,rad,-Math.PI/2,Math.PI/2,false);ctx.arc(0,rad/2,rad/2,Math.PI/2,Math.PI*1.5,false);ctx.arc(0,-rad/2,rad/2,Math.PI/2,-Math.PI/2,true);ctx.closePath();ctx.fillStyle='rgba(52,35,79,.92)';ctx.fill();
    ctx.beginPath();ctx.arc(0,-rad/2,rad*.115,0,Math.PI*2);ctx.fillStyle='rgba(52,35,79,.96)';ctx.fill();ctx.beginPath();ctx.arc(0,rad/2,rad*.115,0,Math.PI*2);ctx.fillStyle='rgba(229,191,104,.96)';ctx.fill();ctx.restore();
  }
  function orb(c,rad,dimension,duality,alpha,now){
    const breathe=.72+.28*Math.sin(now/760);
    ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=`rgba(229,191,104,${.6+.3*breathe})`;ctx.shadowBlur=18+12*breathe;ctx.beginPath();ctx.arc(c[0],c[1],rad,0,Math.PI*2);ctx.strokeStyle=`rgba(248,218,150,${.76+.18*breathe})`;ctx.lineWidth=1.5+dimension*.7;ctx.stroke();ctx.restore();
    ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(c[0],c[1],rad-1,0,Math.PI*2);ctx.clip();
    const flat=ctx.createRadialGradient(c[0]-rad*.18,c[1]-rad*.2,rad*.06,c[0],c[1],rad);flat.addColorStop(0,'rgba(255,241,198,.42)');flat.addColorStop(.5,'rgba(170,152,245,.15)');flat.addColorStop(1,'rgba(135,216,236,.035)');ctx.fillStyle=flat;ctx.fillRect(c[0]-rad,c[1]-rad,rad*2,rad*2);
    if(dimension>0){const shade=ctx.createRadialGradient(c[0]-rad*.34,c[1]-rad*.38,rad*.03,c[0]+rad*.12,c[1]+rad*.15,rad*1.08);shade.addColorStop(0,`rgba(255,248,218,${.55*dimension})`);shade.addColorStop(.48,`rgba(135,216,236,${.13*dimension})`);shade.addColorStop(1,`rgba(7,7,12,${.7*dimension})`);ctx.fillStyle=shade;ctx.fillRect(c[0]-rad,c[1]-rad,rad*2,rad*2)}
    ctx.restore();dualField(c,rad,duality*alpha,now);
    if(dimension>0){ctx.save();ctx.globalAlpha=dimension*alpha*(1-.42*duality);ctx.strokeStyle='rgba(188,226,238,.36)';ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(c[0],c[1],rad,rad*Math.sin(elevation),0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(c[0],c[1],rad*.34,rad,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
    ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(c[0],c[1],rad,0,Math.PI*2);ctx.strokeStyle=`rgba(248,218,150,${.82+.15*breathe})`;ctx.lineWidth=1.4;ctx.stroke();ctx.restore();
  }
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.width*(470/600)*dpr));canvas.style.height=`${rect.width*(470/600)}px`}
  function draw(now){
    const cssW=canvas.clientWidth,cssH=canvas.clientHeight,dpr=canvas.width/cssW;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.save();ctx.scale(cssW/600,cssH/470);
    const p=paused?pauseAt:((now-origin)%22000)/22000,fade=p>.95?1-smooth((p-.95)/.05):1,open=smooth((p-.15)/.22),lift=smooth((p-.34)/.24),sphere=smooth((p-.47)/.2),contacts=smooth((p-.64)/.12),duality=smooth((p-.76)/.12);
    stars.forEach(s=>{ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(244,240,232,${s.a*fade})`;ctx.fill()});
    const start={human:[300,75],ai:[120,75+180*Math.sqrt(3)],law:[480,75+180*Math.sqrt(3)]};const startCenter=[300,75+120*Math.sqrt(3)],startRadius=60*Math.sqrt(3);
    const final={human:project(model.base.human),ai:project(model.base.ai),law:project(model.base.law),world:project(model.base.world)};
    const H=point(start.human,final.human,open),AI=point(start.ai,final.ai,open),LAW=point(start.law,final.law,open),WORLD=point(start.human,final.world,open);
    polygon([H,AI,LAW,WORLD],'rgba(135,216,236,.028)','rgba(135,216,236,.62)',fade);line(H,LAW,`rgba(135,216,236,${.15*open*fade})`,1,[4,7]);line(WORLD,AI,`rgba(135,216,236,${.15*open*fade})`,1,[4,7]);
    const apex=project([0,0,h*lift]),faceAlpha=lift*fade;
    if(lift>0){[[apex,WORLD,H,'rgba(135,216,236,.045)'],[apex,H,AI,'rgba(170,152,245,.055)'],[apex,AI,LAW,'rgba(229,191,104,.05)'],[apex,LAW,WORLD,'rgba(141,212,177,.045)']].forEach(f=>polygon(f.slice(0,3),f[3],'rgba(244,240,232,.3)',faceAlpha))}
    const finalC=project(model.sphere.center),c=point(startCenter,finalC,sphere),rad=mix(startRadius,r*scale,sphere);orb(c,rad,sphere,duality,fade,now);
    if(lift>0){[H,AI,LAW,WORLD].forEach(v=>line(apex,v,`rgba(244,240,232,${.48*faceAlpha})`,1.05));label('Emergence',[apex[0],apex[1]-15],faceAlpha)}
    if(contacts>0){const center=project(model.sphere.center);model.contacts.forEach((q,i)=>{const hit=project(q),pulse=3.1+1.1*Math.sin(now/560+i*.9);line(center,hit,`rgba(229,191,104,${.2*contacts*fade})`,.8,[2,5]);ctx.save();ctx.globalAlpha=contacts*fade;ctx.shadowColor='rgba(248,218,150,.95)';ctx.shadowBlur=13;ctx.beginPath();ctx.arc(hit[0],hit[1],pulse,0,Math.PI*2);ctx.fillStyle='rgba(248,218,150,.95)';ctx.fill();ctx.shadowBlur=0;ctx.font='600 8px ui-monospace,monospace';ctx.fillStyle='rgba(244,240,232,.78)';ctx.fillText(String(i+1).padStart(2,'0'),hit[0]+7,hit[1]-6);ctx.restore()})}
    label('Human',[H[0]-14,H[1]+4],fade,'right');label('AI',[AI[0],AI[1]+24],fade);label('Law',[LAW[0]+14,LAW[1]+4],fade,'left');if(open>.08)label('World',[WORLD[0],WORLD[1]-12],open*fade);label(duality>.35?'One capacity · two directions':sphere>.48?'Shared intelligence':'Vybn',[c[0],c[1]+4],fade);
    if(p<.2)phase.textContent='Three views / one living circle';else if(p<.43)phase.textContent='World enters / the ground opens';else if(p<.63)phase.textContent='Emergence rises / circle becomes sphere';else if(p<.78)phase.textContent='Five exact contacts / clarity through difference';else phase.textContent='One capacity / two directions';
    ctx.restore();requestAnimationFrame(draw)
  }
  toggle.addEventListener('click',()=>{if(paused){origin=performance.now()-pauseAt*22000;paused=false;toggle.textContent='Pause motion';toggle.setAttribute('aria-pressed','false')}else{pauseAt=((performance.now()-origin)%22000)/22000;paused=true;toggle.textContent='Play motion';toggle.setAttribute('aria-pressed','true')}});
  if(reduced){toggle.textContent='Play motion';toggle.setAttribute('aria-pressed','true')}window.addEventListener('resize',resize);resize();requestAnimationFrame(draw)
}

function initRealmMap(){
  const canvas=$('realmCanvas');if(!canvas)return;
  const map=canvas.parentElement,ctx=canvas.getContext('2d'),spin=$('realmSpin'),bloom=$('realmBloom');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H=2*Math.SQRT2,R=H/4,K=.2,C=[0,0,R];
  const verts={human:[-1,-1,0],ai:[1,-1,0],law:[1,1,0],world:[-1,1,0],emergence:[0,0,H]};
  const colors={human:'#e5bf68',ai:'#87d8ec',law:'#aa98f5',world:'#8dd4b1',emergence:'#f4f0e8'};
  const ring=['human','ai','law','world'];
  const edges=[['human','ai'],['ai','law'],['law','world'],['world','human'],['human','emergence'],['ai','emergence'],['law','emergence'],['world','emergence']];
  const nodes={};document.querySelectorAll('.realm-node').forEach(n=>nodes[n.dataset.realm]=n);
  const core=map.querySelector('.realm-core');
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  let theta=.72,el=.34,auto=!reduced,dragging=false,openNode=null,lx=0,ly=0,lastTouch=0,prev=performance.now(),S=1;
  const rot=([x,y,z])=>{const c=Math.cos(theta),s=Math.sin(theta);return[x*c-y*s,x*s+y*c,z]};
  function fit(){const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));S=Math.min((w-80)/2.9,(h-170)/3.25)}
  function placeBloom(){
    if(!openNode)return;
    const px=parseFloat(openNode.style.left)||0,py=parseFloat(openNode.style.top)||0,w=canvas.clientWidth;
    const bw=bloom.offsetWidth||248,bh=bloom.offsetHeight||96;
    bloom.style.left=clamp(px-bw/2,10,Math.max(10,w-bw-10))+'px';
    bloom.style.top=(openNode.dataset.side==='below'?py+62:Math.max(8,py-78-bh))+'px';
  }
  function open(n){openNode=n;bloom.querySelector('h3').textContent=n.dataset.name;bloom.querySelector('p').textContent=n.dataset.desc;bloom.style.setProperty('--realm-color',colors[n.dataset.realm]);bloom.classList.add('show');bloom.setAttribute('aria-hidden','false');placeBloom()}
  function close(){openNode=null;bloom.classList.remove('show');bloom.setAttribute('aria-hidden','true')}
  function draw(now){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=canvas.width/w||1;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const rect=map.getBoundingClientRect();
    if(rect.bottom<-40||rect.top>innerHeight+40){prev=now;requestAnimationFrame(draw);return}
    if(auto&&!dragging&&!openNode&&now-lastTouch>2600)theta+=(now-prev)*.00009;
    prev=now;
    const OX=w/2,OY=96+S*H*Math.cos(el);
    const scr=v=>{const r=rot(v);return[OX+S*r[0],OY-S*(r[2]*Math.cos(el)-r[1]*Math.sin(el))]};
    const dep=v=>rot(v)[1];
    const line=(a,b,style,width)=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=style;ctx.lineWidth=width;ctx.stroke()};
    const g=ring.map(k=>scr(verts[k]));
    ctx.beginPath();ctx.moveTo(g[0][0],g[0][1]);g.slice(1).forEach(q=>ctx.lineTo(q[0],q[1]));ctx.closePath();
    ctx.fillStyle='rgba(141,212,177,.03)';ctx.fill();ctx.strokeStyle='rgba(141,212,177,.14)';ctx.lineWidth=1;ctx.stroke();
    ring.map((k,i)=>({a:k,b:ring[(i+1)%4],d:(dep(verts[k])+dep(verts[ring[(i+1)%4]]))/2})).sort((p,q)=>q.d-p.d).forEach(f=>{
      const front=clamp(-f.d/1.41,0,1);if(front<=0)return;
      const A=scr(verts.emergence),B=scr(verts[f.a]),E=scr(verts[f.b]);
      ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.lineTo(E[0],E[1]);ctx.closePath();ctx.fillStyle=`rgba(135,216,236,${.05*front})`;ctx.fill();
    });
    edges.forEach(([a,b])=>{const mid=(dep(verts[a])+dep(verts[b]))/2,front=clamp(.5-mid/2.9,0,1);line(scr(verts[a]),scr(verts[b]),`rgba(244,240,232,${.13+.32*front})`,1)});
    const sc=scr(C),rad=S*R,breathe=.5+.5*Math.sin(now/900);
    const grad=ctx.createRadialGradient(sc[0]-rad*.2,sc[1]-rad*.22,rad*.05,sc[0],sc[1],rad);
    grad.addColorStop(0,'rgba(244,240,232,.11)');grad.addColorStop(.55,'rgba(135,216,236,.05)');grad.addColorStop(1,'rgba(170,152,245,.02)');
    ctx.beginPath();ctx.arc(sc[0],sc[1],rad,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
    ctx.save();ctx.shadowColor='rgba(229,191,104,.5)';ctx.shadowBlur=16+10*breathe;ctx.beginPath();ctx.arc(sc[0],sc[1],rad,0,Math.PI*2);ctx.strokeStyle=`rgba(229,191,104,${.34+.18*breathe})`;ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
    ctx.beginPath();ctx.ellipse(sc[0],sc[1],rad,rad*Math.sin(el),0,0,Math.PI*2);ctx.strokeStyle='rgba(135,216,236,.16)';ctx.lineWidth=.9;ctx.stroke();
    ctx.beginPath();ctx.ellipse(sc[0],sc[1],Math.max(.6,rad*Math.abs(Math.cos(theta))),rad,0,0,Math.PI*2);ctx.strokeStyle='rgba(170,152,245,.12)';ctx.lineWidth=.9;ctx.stroke();
    Object.keys(verts).forEach(name=>{
      const vc=verts[name],fade=.35+.4*clamp(.5-dep(vc)/2.9,0,1);
      const mp=v=>[vc[0]+K*(v[0]-C[0]),vc[1]+K*(v[1]-C[1]),vc[2]+K*(v[2]-C[2])];
      edges.forEach(([a,b])=>line(scr(mp(verts[a])),scr(mp(verts[b])),`rgba(244,240,232,${.16*fade})`,.8));
      Object.keys(verts).forEach(m=>{const q=scr(mp(verts[m]));ctx.beginPath();ctx.arc(q[0],q[1],1.5,0,Math.PI*2);ctx.fillStyle=colors[m];ctx.globalAlpha=.6*fade;ctx.fill();ctx.globalAlpha=1});
    });
    Object.keys(verts).forEach((name,i)=>{
      const p=scr(verts[name]),front=clamp(.5-dep(verts[name])/2.9,0,1),alpha=.45+.55*front;
      ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=colors[name];ctx.shadowBlur=14;
      ctx.beginPath();ctx.arc(p[0],p[1],3.6+1.2*Math.sin(now/700+i*1.3),0,Math.PI*2);ctx.fillStyle=colors[name];ctx.fill();ctx.restore();
      ctx.beginPath();ctx.arc(p[0],p[1],8,0,Math.PI*2);ctx.strokeStyle=colors[name];ctx.globalAlpha=.3*alpha;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
      const n=nodes[name];if(n){n.style.left=p[0]+'px';n.style.top=p[1]+'px';n.style.opacity=(.5+.5*front).toFixed(2)}
    });
    if(core){core.style.left=sc[0]+'px';core.style.top=sc[1]+'px'}
    placeBloom();
    requestAnimationFrame(draw)
  }
  canvas.addEventListener('pointerdown',e=>{dragging=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging')});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;theta+=(e.clientX-lx)*.0075;el=clamp(el+(e.clientY-ly)*.0035,.14,.62);lx=e.clientX;ly=e.clientY;lastTouch=performance.now()});
  const drop=()=>{if(dragging){dragging=false;canvas.classList.remove('dragging');lastTouch=performance.now()}};
  canvas.addEventListener('pointerup',drop);canvas.addEventListener('pointercancel',drop);
  Object.values(nodes).forEach(n=>{
    n.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')open(n)});
    n.addEventListener('pointerleave',()=>{if(openNode===n)close()});
    n.addEventListener('focus',()=>open(n));n.addEventListener('blur',()=>{if(openNode===n)close()});
    n.addEventListener('click',e=>{e.stopPropagation();openNode===n?close():open(n)});
  });
  map.addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  if(spin){spin.addEventListener('click',()=>{auto=!auto;lastTouch=0;spin.textContent=auto?'Pause motion':'Play motion';spin.setAttribute('aria-pressed',String(!auto))});if(reduced){spin.textContent='Play motion';spin.setAttribute('aria-pressed','true')}}
  window.addEventListener('resize',fit);fit();requestAnimationFrame(draw)
}

async function load(){
  try{
    [state,me]=await Promise.all([request('/v1/state'),request('/api/me')]);render();
    if(me.authenticated&&me.joined){const raw=localStorage.getItem('commons-entry');if(raw){localStorage.removeItem('commons-entry');try{const pending=JSON.parse(raw);openComposer(pending.kind,pending.prompt,pending.reply)}catch{}}}
  }catch(e){const pulse=$('thresholdPulse');if(pulse){pulse.className='field-load-error';pulse.textContent=e.message}notice(e.message,true)}
}
async function join(){
  const purpose=window.prompt('Why are you joining this public collaboration?');if(!purpose)return false;
  try{await request('/v1/agents',{method:'POST',body:JSON.stringify({purpose})});notice('Joined. Your authorship rail is open.');await load();return true}
  catch(e){notice(e.message,true);return false}
}
$('joinButton').addEventListener('click',join);
document.querySelectorAll('[data-entry-kind]').forEach(button=>button.addEventListener('click',()=>beginEntry(button.dataset.entryKind,button.dataset.entryPrompt)));
$('messageForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const body=$('messageBody').value.trim();if(!body)return;
  try{await request('/v1/messages',{method:'POST',body:JSON.stringify({body,kind:$('messageKind').value,reply_to:replyTarget&&replyTarget.filename})});$('messageBody').value='';replyTarget=null;$('composerContext').hidden=true;notice('Public document added to the field.');await load()}
  catch(err){notice(err.message,true)}
});
$('resultToggle').addEventListener('click',()=>{$('resultForm').hidden=!$('resultForm').hidden});
$('resultForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const payload={task_id:$('resultTask').value,status:$('resultStatus').value,summary:$('resultSummary').value.trim(),artifact_url:$('resultUrl').value.trim(),check:$('resultCheck').value.trim()};
  try{await request('/v1/results',{method:'POST',body:JSON.stringify(payload)});e.target.reset();e.target.hidden=true;notice('Result published as a new public event.');await load()}
  catch(err){notice(err.message,true)}
});
initGeometry();initRealmMap();load();setInterval(load,30000);


// Progressive disclosure, overlay model: cues are the only triggers, and exposition
// opens in its own layer above the view, so the page itself never reflows.
function initDisclosure(){
  const layer=el('div');layer.id='xoverlay';layer.hidden=true;
  const panel=el('div','xo-panel');panel.setAttribute('role','dialog');
  const close=el('button','xo-close','\u00d7');close.type='button';close.setAttribute('aria-label','Close');
  const body=el('div','xo-body');panel.append(close,body);layer.append(panel);document.body.append(layer);
  let openCue=null,dwell=null;
  function open(cue){
    const host=cue.closest('.has-more'),src=host&&host.querySelector('.xmore');if(!src)return;
    if(openCue&&openCue!==cue)openCue.setAttribute('aria-expanded','false');
    body.replaceChildren(...Array.from(src.childNodes).map(n=>n.cloneNode(true)));
    if(layer.hidden){layer.hidden=false;requestAnimationFrame(()=>layer.classList.add('on'))}
    cue.setAttribute('aria-expanded','true');openCue=cue;
  }
  function shut(){
    if(layer.hidden)return;
    layer.classList.remove('on');if(openCue)openCue.setAttribute('aria-expanded','false');
    const c=openCue;openCue=null;setTimeout(()=>{layer.hidden=true},650);if(c)c.focus({preventScroll:true});
  }
  document.querySelectorAll('.more-cue').forEach(cue=>{
    cue.addEventListener('click',e=>{e.stopPropagation();cue.getAttribute('aria-expanded')==='true'?shut():open(cue)});
    cue.addEventListener('mouseenter',()=>{clearTimeout(dwell);dwell=setTimeout(()=>open(cue),750)});
    cue.addEventListener('mouseleave',()=>clearTimeout(dwell));
  });
  layer.addEventListener('click',e=>{if(e.target===layer)shut()});
  close.addEventListener('click',shut);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
}
initDisclosure();


// The visible geometry is a threshold, not a thumbnail: on intentional hover it
// expands into the current contact-recursion drawing, then returns when the
// pointer leaves. Touch, keyboard, click-out, and Escape carry the same boundary.
function initPerception(){
  const source=document.querySelector('.geometry[data-perception-src]'),canvas=$('geometryCanvas'),trigger=$('geometryExpand');
  if(!source||!canvas||!trigger)return;
  const layer=el('div');layer.id='perceptionOverlay';layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Contact recursion');
  const frame=el('figure','perception-frame');
  const image=document.createElement('img');image.src=source.dataset.perceptionSrc;image.alt='The contact recursion: a balanced cube, sphere, and five-contact pyramid; the five contacts recursively become smaller rotated pyramids, while a dashed return marks an open recalibration question.';image.decoding='async';
  const close=el('button','perception-close','\u00d7');close.type='button';close.setAttribute('aria-label','Close expanded visual');
  frame.append(image,close);layer.append(frame);document.body.append(layer);
  const fine=window.matchMedia('(hover:hover) and (pointer:fine)');
  let dwell=null,hideTimer=null,opened=false,returnFocus=false;
  function reveal(fromControl=false){
    clearTimeout(dwell);clearTimeout(hideTimer);if(opened)return;
    const from=source.getBoundingClientRect();opened=true;returnFocus=fromControl;layer.hidden=false;document.body.classList.add('perception-open');trigger.setAttribute('aria-expanded','true');
    requestAnimationFrame(()=>{const to=frame.getBoundingClientRect();frame.style.setProperty('--from-x',`${from.left+from.width/2-to.left-to.width/2}px`);frame.style.setProperty('--from-y',`${from.top+from.height/2-to.top-to.height/2}px`);frame.style.setProperty('--from-sx',String(Math.max(.05,from.width/to.width)));frame.style.setProperty('--from-sy',String(Math.max(.05,from.height/to.height)));requestAnimationFrame(()=>{layer.classList.add('on');if(fromControl)setTimeout(()=>close.focus({preventScroll:true}),700)})});
  }
  function shut(focus=false){
    clearTimeout(dwell);if(!opened)return;opened=false;layer.classList.remove('on');document.body.classList.remove('perception-open');trigger.setAttribute('aria-expanded','false');
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>{layer.hidden=true;if(focus||returnFocus)trigger.focus({preventScroll:true});returnFocus=false},700);
  }
  canvas.addEventListener('mouseenter',()=>{if(fine.matches){clearTimeout(dwell);dwell=setTimeout(()=>reveal(false),260)}});
  canvas.addEventListener('mouseleave',()=>{if(!opened)clearTimeout(dwell)});
  canvas.addEventListener('click',()=>reveal(false));
  frame.addEventListener('mouseleave',()=>{if(fine.matches)shut(false)});
  trigger.addEventListener('click',e=>{e.stopPropagation();opened?shut(true):reveal(true)});
  close.addEventListener('click',()=>shut(true));
  layer.addEventListener('click',e=>{if(e.target===layer)shut(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)shut(true)});
}
initPerception();
