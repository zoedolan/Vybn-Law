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
load();setInterval(load,30000);
