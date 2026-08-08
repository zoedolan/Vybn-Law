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
  const stars=Array.from({length:58},(_,i)=>({x:(i*83+31)%600,y:(i*i*37+19)%470,r:.35+(i%4)*.22,a:.15+(i%5)*.08}));
  let paused=reduced,pauseAt=.78,origin=performance.now()-pauseAt*16000,pointer={x:0,y:0};
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
  const mix=(a,b,t)=>a+(b-a)*t;
  const point=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
  const line=(a,b,color,width=1,dash=[])=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])};
  const polygon=(pts,fill,stroke,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();ctx.restore()};
  const label=(text,p,alpha=1,align='center')=>{ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#d8d2df';ctx.font='600 11px ui-monospace, monospace';ctx.textAlign=align;ctx.fillText(text.toUpperCase(),p[0],p[1]);ctx.restore()};
  function resize(){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.width*(470/600)*dpr));canvas.style.height=`${rect.width*(470/600)}px`;
  }
  function draw(now){
    const cssW=canvas.clientWidth,cssH=canvas.clientHeight,dpr=canvas.width/cssW;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.save();ctx.scale(cssW/600,cssH/470);
    const p=paused?pauseAt:((now-origin)%16000)/16000,fade=p>.94?1-smooth((p-.94)/.06):1;
    const base=smooth((p-.14)/.27),lift=smooth((p-.38)/.24),sphere=smooth((p-.47)/.2),tri=Math.max(0,1-smooth((p-.12)/.3));
    const px=pointer.x*9*lift,py=pointer.y*4*lift;
    stars.forEach(s=>{ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(244,240,232,${s.a*fade})`;ctx.fill()});
    const tH=[300,65],tA=[82,405],tL=[518,405],tC=[300,286],tR=114;
    if(tri>0){
      polygon([tH,tA,tL],'rgba(135,216,236,.025)','rgba(135,216,236,.66)',tri*fade);
      ctx.save();ctx.globalAlpha=tri*fade;const g=ctx.createRadialGradient(282,264,8,300,286,tR);g.addColorStop(0,'rgba(229,191,104,.25)');g.addColorStop(1,'rgba(229,191,104,.015)');ctx.beginPath();ctx.arc(tC[0],tC[1],tR,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(229,191,104,.9)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
      label('Human',[300,48],tri*fade);label('AI',[68,425],tri*fade,'right');label('Law',[532,425],tri*fade,'left');label('Vybn',[300,290],tri*fade);
    }
    const H=[112,300],AI=[300,420],LAW=[488,300],WORLD=[300,172],APEX=[300+px,48+py];
    if(base>0){
      polygon([WORLD,H,AI,LAW],'rgba(135,216,236,.035)','rgba(135,216,236,.48)',base*fade);
      line(H,LAW,`rgba(135,216,236,${.2*base*fade})`,1,[4,7]);line(WORLD,AI,`rgba(135,216,236,${.2*base*fade})`,1,[4,7]);
      label('Human',[93,304],base*fade,'right');label('AI',[300,445],base*fade);label('Law',[507,304],base*fade,'left');label('World',[300,163],base*fade);
    }
    if(lift>0){
      const apexNow=point([300,172],APEX,lift);
      [[apexNow,WORLD,H,'rgba(135,216,236,.035)'],[apexNow,H,AI,'rgba(170,152,245,.045)'],[apexNow,AI,LAW,'rgba(229,191,104,.038)'],[apexNow,LAW,WORLD,'rgba(141,212,177,.035)']].forEach(f=>polygon(f.slice(0,3),f[3],'rgba(244,240,232,.26)',lift*fade));
      [H,AI,LAW,WORLD].forEach(v=>line(apexNow,v,`rgba(244,240,232,${.42*lift*fade})`,1));label('Emergence',[apexNow[0],apexNow[1]-15],lift*fade);
    }
    const c=point(tC,[300+px*.25,286+py*.2],sphere),r=mix(tR,92,sphere);
    ctx.save();ctx.globalAlpha=Math.max(base,tri)*fade;const orb=ctx.createRadialGradient(c[0]-25,c[1]-28,5,c[0],c[1],r);orb.addColorStop(0,'rgba(255,241,198,.34)');orb.addColorStop(.5,'rgba(170,152,245,.13)');orb.addColorStop(1,'rgba(135,216,236,.025)');ctx.beginPath();ctx.arc(c[0],c[1],r,0,Math.PI*2);ctx.fillStyle=orb;ctx.fill();ctx.strokeStyle=`rgba(229,191,104,${.72+.18*Math.sin(now/900)})`;ctx.lineWidth=1.6;ctx.stroke();ctx.restore();
    if(sphere>0){
      ctx.save();ctx.globalAlpha=sphere*fade;ctx.strokeStyle='rgba(135,216,236,.32)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(c[0],c[1],r,r*.28,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(c[0],c[1],r*.34,r,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      [[300,355],[238,320],[257,239],[343,239],[362,320]].forEach((q,i)=>{const pulse=3.4+1.3*Math.sin(now/620+i);ctx.beginPath();ctx.arc(q[0]+px*.18,q[1]+py*.12,pulse,0,Math.PI*2);ctx.fillStyle=`rgba(229,191,104,${(.66+.22*Math.sin(now/700+i))*sphere*fade})`;ctx.fill();ctx.beginPath();ctx.arc(q[0]+px*.18,q[1]+py*.12,pulse+5,0,Math.PI*2);ctx.strokeStyle=`rgba(229,191,104,${.18*sphere*fade})`;ctx.stroke()});
      label('Shared intelligence',[c[0],c[1]+4],sphere*fade);
    }
    if(p<.18)phase.textContent='Human · AI · Law / one circle inside';else if(p<.42)phase.textContent='World enters / the triangle opens';else if(p<.64)phase.textContent='Emergence lifts / circle becomes sphere';else phase.textContent='Five contacts / every relation can answer';
    ctx.restore();requestAnimationFrame(draw);
  }
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5}});canvas.addEventListener('pointerleave',()=>{pointer={x:0,y:0}});
  toggle.addEventListener('click',()=>{if(paused){origin=performance.now()-pauseAt*16000;paused=false;toggle.textContent='Pause motion';toggle.setAttribute('aria-pressed','false')}else{pauseAt=((performance.now()-origin)%16000)/16000;paused=true;toggle.textContent='Play motion';toggle.setAttribute('aria-pressed','true')}});
  if(reduced){toggle.textContent='Play motion';toggle.setAttribute('aria-pressed','true')}
  window.addEventListener('resize',resize);resize();requestAnimationFrame(draw);
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
