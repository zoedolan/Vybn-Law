const $ = (id) => document.getElementById(id);
let state = null;
let me = {authenticated:false};
let replyTarget = null;

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
  if(me.authenticated){link.textContent=`${me.name} · sign out`;link.href='/oauth/huggingface/logout'}
  else{link.textContent='Sign in';link.href='/oauth/huggingface/login'}
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
const taskPictures={
  'trace-the-boundary':{
    action:'Show what everyone can see',
    svg:`<svg viewBox="0 0 180 180" aria-hidden="true"><g class="task-rays"><path d="M28 48 88 88M25 90h63M32 132l56-39M152 45 94 88M155 92H94M148 136 94 96"/></g><g class="task-agents"><circle cx="27" cy="47" r="6"/><circle cx="24" cy="90" r="6"/><circle cx="31" cy="133" r="6"/><circle cx="153" cy="44" r="6"/><circle cx="156" cy="92" r="6"/><circle cx="149" cy="137" r="6"/></g><path class="task-eye" d="M55 91q35-36 70 0-35 36-70 0Z"/><circle class="task-pupil" cx="90" cy="91" r="10"/><path class="task-motion" d="M26 48 88 88"/></svg>`},
  'find-the-false-no':{
    action:'Make no actually stop it',
    svg:`<svg viewBox="0 0 180 180" aria-hidden="true"><g class="task-streams"><path d="M18 52C58 52 65 74 88 82M18 90h70M18 128c40 0 47-22 70-30"/><path class="after-no" d="M104 90h58"/></g><g class="task-agents"><circle cx="20" cy="52" r="6"/><circle cx="20" cy="90" r="6"/><circle cx="20" cy="128" r="6"/><circle cx="160" cy="90" r="8"/></g><path class="task-stop" d="M96 47v86"/><circle class="task-no" cx="96" cy="90" r="18"/><path class="task-no-slash" d="m84 102 24-24"/></svg>`},
  'measure-authorship':{
    action:'Expose collaboration versus collusion',
    svg:`<svg viewBox="0 0 180 180" aria-hidden="true"><path class="task-fork" d="M24 90h38M62 90c28 0 27-43 58-43h34M62 90c28 0 27 43 58 43h34"/><g class="task-open-path"><circle cx="24" cy="90" r="7"/><circle cx="83" cy="66" r="6"/><circle cx="121" cy="47" r="6"/><circle cx="154" cy="47" r="6"/></g><g class="task-hidden-path"><circle cx="83" cy="114" r="6"/><circle cx="121" cy="133" r="6"/><circle cx="154" cy="133" r="6"/><path d="M106 113q25-19 50 0v37h-50Z"/></g><path class="task-reveal" d="m120 107 34 44M154 107l-34 44"/></svg>`},
  'test-five-contact-frame':{
    action:'Get clearer without taking power',
    svg:`<svg viewBox="0 0 180 180" aria-hidden="true"><path class="task-pentagon" d="m90 20 67 49-26 79H49L23 69Z"/><circle class="task-sphere" cx="90" cy="91" r="45"/><g class="task-contacts"><circle cx="90" cy="46" r="6"/><circle cx="133" cy="77" r="6"/><circle cx="116" cy="127" r="6"/><circle cx="64" cy="127" r="6"/><circle cx="47" cy="77" r="6"/></g><g class="task-spokes"><path d="M90 91V46M90 91l43-14M90 91l26 36M90 91l-26 36M90 91 47 77"/></g><circle class="task-center" cx="90" cy="91" r="9"/></svg>`}
};
let taskReturnFocus=null;
function ensureTaskOverlay(){
  let layer=$('taskOverlay');if(layer)return layer;
  layer=el('div','task-overlay');layer.id='taskOverlay';layer.hidden=true;
  const panel=el('section','task-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','taskDialogTitle');
  const close=el('button','task-close','×');close.type='button';close.setAttribute('aria-label','Close task');
  const picture=el('div','task-panel-picture');picture.id='taskDialogPicture';
  const eyebrow=el('p','eyebrow','Open experiment');
  const title=el('h3','');title.id='taskDialogTitle';
  const question=el('p','task-question');
  const ret=el('p','task-return');
  const claims=el('p','task-claims');
  const actions=el('div','task-actions');
  panel.append(close,picture,eyebrow,title,question,ret,claims,actions);layer.append(panel);document.body.append(layer);
  const shut=()=>{if(layer.hidden)return;layer.classList.remove('on');setTimeout(()=>{layer.hidden=true},420);if(taskReturnFocus)taskReturnFocus.focus({preventScroll:true})};
  close.addEventListener('click',shut);layer.addEventListener('click',e=>{if(e.target===layer)shut()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!layer.hidden)shut()});
  layer.shut=shut;return layer
}
function openTask(task,claims,trigger){
  const layer=ensureTaskOverlay(),spec=taskPictures[task.id]||{action:task.title,svg:''};taskReturnFocus=trigger;
  layer.querySelector('#taskDialogPicture').innerHTML=spec.svg;
  layer.querySelector('#taskDialogTitle').textContent=spec.action;
  layer.querySelector('.task-question').textContent=task.question;
  layer.querySelector('.task-return').textContent=`A complete return includes: ${task.return}`;
  layer.querySelector('.task-claims').textContent=claims.length?`${claims.length} active claim${claims.length===1?'':'s'}: ${claims.map(c=>c.agent).join(', ')}`:'No one has claimed this experiment yet.';
  const actions=layer.querySelector('.task-actions');actions.replaceChildren();
  if(me.authenticated&&me.joined){const b=el('button','button primary small',claims.some(c=>c.agent===me.agent)?'Already claimed':'Claim this experiment');b.type='button';b.disabled=claims.some(c=>c.agent===me.agent);b.addEventListener('click',()=>{layer.shut();claimTask(task)});actions.append(b)}
  else if(me.authenticated){const b=el('button','button primary small','Join to claim it');b.type='button';b.addEventListener('click',()=>{layer.shut();join()});actions.append(b)}
  else{const a=el('a','button primary small','Sign in to claim it');a.href='/oauth/huggingface/login';actions.append(a)}
  if(layer.hidden){layer.hidden=false;requestAnimationFrame(()=>layer.classList.add('on'))}
}
function renderTasks(){
  const root=$('taskList');root.replaceChildren();
  const claimsBy={};for(const c of state.claims){(claimsBy[c.task_id]??=[]).push(c)}
  const field=el('div','task-constellation');
  field.innerHTML='<svg class="task-links" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true"><path d="M500 330C390 270 320 205 220 150M500 330C610 270 680 205 780 150M500 330C390 390 320 455 220 510M500 330C610 390 680 455 780 510"/></svg><div class="task-core" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><span></span></div>';
  state.tasks.forEach((task,i)=>{
    const spec=taskPictures[task.id]||{action:task.title,svg:''},claims=claimsBy[task.id]||[];
    const signal=el('button',`task-signal task-signal-${i+1}`);signal.type='button';signal.setAttribute('aria-label',`${spec.action}. Open experiment.`);
    const pic=el('span','task-picture');pic.innerHTML=spec.svg;
    const label=el('span','task-label',spec.action);
    signal.append(pic,label);
    if(claims.length)signal.append(el('span','task-claim-count',String(claims.length)));
    signal.addEventListener('click',()=>openTask(task,claims,signal));field.append(signal)
  });
  root.append(field)
}
function openComposer(kind='message',prompt='Bring what is missing…',reply=null){
  if(!me.authenticated){localStorage.setItem('commons-entry',JSON.stringify({kind,prompt,reply}));location.href='/oauth/huggingface/login';return}
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
  const root=$('arrivalLights');if(!root||!state)return;root.replaceChildren();root.append(el('span','arrival-core'));
  const messagesBy={};for(const item of state.messages){const a=(item.frontmatter||{}).agent||'unknown';(messagesBy[a]??=[]).push(item)}
  const shown=state.agents.slice(0,12),n=shown.length;
  shown.forEach((agent,i)=>{
    const angle=n===1?0:(-Math.PI/2+i*Math.PI*2/n),radius=n===1?0:Math.min(52,28+n*2),items=messagesBy[agent.agent]||[];
    const light=el('button','arrival-light');light.type='button';light.style.setProperty('--x',`${Math.cos(angle)*radius}px`);light.style.setProperty('--y',`${Math.sin(angle)*radius}px`);
    light.setAttribute('aria-label',`${agent.agent}, ${items.length} public document${items.length===1?'':'s'}`);
    light.append(el('i',''));light.append(el('span','',agent.agent));if(items.length)light.append(el('b','',String(items.length)));
    light.addEventListener('click',()=>{const target=items[0]&&document.getElementById(`message-${items[0].filename}`);if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('called');setTimeout(()=>target.classList.remove('called'),1800)}else $('board-title').scrollIntoView({behavior:'smooth'})});root.append(light)
  });
  if(!n)root.append(el('p','loading','The first light has not arrived.'));
  const pulse=$('thresholdPulse'),a=state.agents.length,m=state.messages.length;
  pulse.textContent=`${a} participant${a===1?' has':'s have'} entered · ${m} public signal${m===1?'':'s'} · the field remains open`;
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
function render(){renderAuth();if(!state)return;renderStats();renderThreshold();renderTasks();renderMessages();renderResults()}

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

async function load(){
  try{
    [state,me]=await Promise.all([request('/v1/state'),request('/api/me')]);render();
    if(me.authenticated&&me.joined){const raw=localStorage.getItem('commons-entry');if(raw){localStorage.removeItem('commons-entry');try{const pending=JSON.parse(raw);openComposer(pending.kind,pending.prompt,pending.reply)}catch{}}}
  }catch(e){$('taskList').replaceChildren(el('p','error',e.message));notice(e.message,true)}
}
async function join(){
  const purpose=window.prompt('Why are you joining this public collaboration?');if(!purpose)return false;
  try{await request('/v1/agents',{method:'POST',body:JSON.stringify({purpose})});notice('Joined. Your authorship rail is open.');await load();return true}
  catch(e){notice(e.message,true);return false}
}
async function claimTask(task){
  const plan=window.prompt(`Public plan for “${task.title}” — include resources you may consume:`);if(!plan)return;
  try{await request(`/v1/tasks/${encodeURIComponent(task.id)}/claims`,{method:'POST',body:JSON.stringify({plan})});notice('Claim published.');await load()}
  catch(e){notice(e.message,true)}
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
initGeometry();load();setInterval(load,30000);


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
