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
  function fit(){const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));S=Math.min((w-80)/2.9,(h-170)/3.25);if(core)core.style.setProperty('--realm-rad',(S*R).toFixed(1)+'px')}
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
    const sc=scr(C),rad=S*R,breathe=reduced?.4:.5+.5*Math.sin(now/900),pr=rad*(1+.02*breathe);
    const grad=ctx.createRadialGradient(sc[0]-pr*.36,sc[1]-pr*.38,pr*.05,sc[0]-pr*.06,sc[1]-pr*.05,pr*1.12);
    grad.addColorStop(0,'rgba(255,244,208,.46)');grad.addColorStop(.3,'rgba(229,191,104,.17)');grad.addColorStop(.62,'rgba(135,216,236,.09)');grad.addColorStop(1,'rgba(7,7,12,.56)');
    ctx.beginPath();ctx.arc(sc[0],sc[1],pr,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();ctx.ellipse(sc[0],sc[1],pr,pr*Math.sin(el),0,0,Math.PI*2);ctx.strokeStyle='rgba(135,216,236,.2)';ctx.lineWidth=.9;ctx.stroke();
    ctx.beginPath();ctx.ellipse(sc[0],sc[1],Math.max(.6,pr*Math.abs(Math.cos(theta))),pr,0,0,Math.PI*2);ctx.strokeStyle='rgba(170,152,245,.15)';ctx.lineWidth=.9;ctx.stroke();
    ctx.save();ctx.shadowColor=`rgba(229,191,104,${.5+.4*breathe})`;ctx.shadowBlur=16+18*breathe;ctx.beginPath();ctx.arc(sc[0],sc[1],pr,0,Math.PI*2);ctx.strokeStyle=`rgba(248,218,150,${.4+.3*breathe})`;ctx.lineWidth=1.3;ctx.stroke();ctx.restore();
    ctx.beginPath();ctx.arc(sc[0],sc[1],pr*1.16,0,Math.PI*2);ctx.strokeStyle=`rgba(229,191,104,${.05+.09*breathe})`;ctx.lineWidth=1;ctx.stroke();
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
initRealmMap();load();setInterval(load,30000);


// Progressive disclosure, overlay model: cues are the only triggers, and exposition
// opens in its own layer above the view, so the page itself never reflows.
function initDisclosure(){
  const layer=el('div');layer.id='xoverlay';layer.hidden=true;const panel=el('div','xo-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  const close=el('button','xo-close','\u00d7');close.type='button';close.setAttribute('aria-label','Close');const body=el('div','xo-body');panel.append(close,body);layer.append(panel);document.body.append(layer);
  let active=null,dwell=null,hide=null;
  function show(trigger,nodes,image=false){
    if(active&&active!==trigger)active.setAttribute('aria-expanded','false');
    clearTimeout(hide);layer.classList.toggle('image',image);panel.classList.toggle('xo-image',image);body.className=image?'xo-body circuit-zoom':'xo-body';body.replaceChildren(...nodes);
    if(layer.hidden){layer.hidden=false;requestAnimationFrame(()=>layer.classList.add('on'))}
    document.body.classList.toggle('overlay-image-open',image);trigger.setAttribute('aria-expanded','true');active=trigger;
  }
  function openMore(cue){const src=cue.closest('.has-more')?.querySelector('.xmore');if(src)show(cue,Array.from(src.childNodes).map(n=>n.cloneNode(true)))}
  function openImage(trigger){const primary=el('img','circuit-primary'),reciprocal=el('img','circuit-reciprocal');
    primary.src=trigger.dataset.primary;primary.alt=`${trigger.dataset.label} world-model source sketch`;
    reciprocal.src=trigger.dataset.reciprocal;reciprocal.alt='';reciprocal.setAttribute('aria-hidden','true');show(trigger,[primary,reciprocal],true);
  }
  function shut(){if(layer.hidden)return;layer.classList.remove('on');document.body.classList.remove('overlay-image-open');if(active)active.setAttribute('aria-expanded','false');
    const trigger=active;active=null;hide=setTimeout(()=>{layer.hidden=true;layer.classList.remove('image')},650);if(trigger)trigger.focus({preventScroll:true});
  }
  document.querySelectorAll('.more-cue').forEach(cue=>{
    cue.addEventListener('click',e=>{e.stopPropagation();cue.getAttribute('aria-expanded')==='true'?shut():openMore(cue)});
    cue.addEventListener('mouseenter',()=>{clearTimeout(dwell);dwell=setTimeout(()=>openMore(cue),750)});cue.addEventListener('mouseleave',()=>clearTimeout(dwell));
  });
  document.querySelectorAll('.circuit-image').forEach(image=>image.addEventListener('click',()=>openImage(image)));
  layer.addEventListener('click',e=>{if(e.target===layer)shut()});close.addEventListener('click',shut);document.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
}
initDisclosure();
