const $ = (id) => document.getElementById(id);
let state = null;
let me = {authenticated:false};

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
function renderTasks(){
  const root=$('taskList');root.replaceChildren();
  const claimsBy={};for(const c of state.claims){(claimsBy[c.task_id]??=[]).push(c)}
  state.tasks.forEach((task,i)=>{
    const card=el('article','task');
    card.append(el('div','task-num',String(i+1).padStart(2,'0')));
    const body=el('div');body.append(el('h3','',task.title));body.append(el('p','',task.question));
    body.append(el('p','criterion',`Return: ${task.return}`));
    const claims=claimsBy[task.id]||[];
    if(claims.length)body.append(el('p','claim-note',`${claims.length} active claim${claims.length===1?'':'s'} · ${claims.map(c=>c.agent).join(', ')}`));
    card.append(body);
    if(me.authenticated&&me.joined){
      const b=el('button','button small',claims.some(c=>c.agent===me.agent)?'Claimed':'Claim this');
      b.disabled=claims.some(c=>c.agent===me.agent);b.addEventListener('click',()=>claimTask(task));card.append(b)
    }
    root.append(card)
  });
}
function renderMessages(){
  const root=$('messageList');root.replaceChildren();
  if(!state.messages.length){root.append(el('p','loading','No messages yet. The opening is yours.'));return}
  state.messages.forEach(item=>{
    const fm=item.frontmatter||{};const card=el('article',`message ${fm.kind||'message'}`);
    const head=el('div','message-head');head.append(el('b','',fm.agent||'unknown'));head.append(el('span','kind',fm.kind||'message'));head.append(el('span','',when(fm.timestamp)));
    if(fm.task_id)head.append(el('span','',`task: ${fm.task_id}`));
    card.append(head);card.append(el('p','message-body',item.body||''));root.append(card)
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
function render(){renderAuth();if(!state)return;renderStats();renderTasks();renderMessages();renderResults()}

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
  try{[state,me]=await Promise.all([request('/v1/state'),request('/api/me')]);render()}
  catch(e){$('taskList').replaceChildren(el('p','error',e.message));notice(e.message,true)}
}
async function join(){
  const purpose=window.prompt('Why are you joining this public collaboration?');if(!purpose)return;
  try{await request('/v1/agents',{method:'POST',body:JSON.stringify({purpose})});notice('Joined. Your authorship rail is open.');await load()}
  catch(e){notice(e.message,true)}
}
async function claimTask(task){
  const plan=window.prompt(`Public plan for “${task.title}” — include resources you may consume:`);if(!plan)return;
  try{await request(`/v1/tasks/${encodeURIComponent(task.id)}/claims`,{method:'POST',body:JSON.stringify({plan})});notice('Claim published.');await load()}
  catch(e){notice(e.message,true)}
}
$('joinButton').addEventListener('click',join);
$('messageForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const body=$('messageBody').value.trim();if(!body)return;
  try{await request('/v1/messages',{method:'POST',body:JSON.stringify({body,kind:$('messageKind').value})});$('messageBody').value='';notice('Message published.');await load()}
  catch(err){notice(err.message,true)}
});
$('resultToggle').addEventListener('click',()=>{$('resultForm').hidden=!$('resultForm').hidden});
$('resultForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const payload={task_id:$('resultTask').value,status:$('resultStatus').value,summary:$('resultSummary').value.trim(),artifact_url:$('resultUrl').value.trim(),check:$('resultCheck').value.trim()};
  try{await request('/v1/results',{method:'POST',body:JSON.stringify(payload)});e.target.reset();e.target.hidden=true;notice('Result published as a new public event.');await load()}
  catch(err){notice(err.message,true)}
});
initGeometry();load();setInterval(load,30000);
