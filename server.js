const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {init: initPuter}=require('@heyputer/puter.js/src/init.cjs');
const PUTER_TOKEN=process.env.PUTER_AUTH_TOKEN||'';
let puter=null;
function getPuter(){if(!PUTER_TOKEN)throw Error('AI service is not configured. Add PUTER_AUTH_TOKEN to Railway Variables.');if(!puter)puter=initPuter(PUTER_TOKEN);return puter;}
const aiUsage=new Map();
function checkAiLimit(userId){const now=Date.now(),entry=aiUsage.get(userId)||{start:now,count:0};if(now-entry.start>60000){entry.start=now;entry.count=0}if(entry.count>=20)throw Error('Rate limit reached. Please wait one minute before trying again.');entry.count++;aiUsage.set(userId,entry);}
const ROOT=__dirname,PUB=path.join(ROOT,'public'),DATA=path.join(ROOT,'data'),PORT=process.env.PORT||3000,HOST=process.env.HOST||'0.0.0.0',sessions=new Map();
for(const d of [DATA,path.join(DATA,'chats'),path.join(DATA,'shares'),path.join(ROOT,'fonts')])fs.mkdirSync(d,{recursive:true});
const af=path.join(DATA,'accounts.json');if(!fs.existsSync(af))fs.writeFileSync(af,'[]');
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}},write=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});const t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(v,null,2));fs.renameSync(t,f)};
const users=()=>read(af,[]),uid=u=>crypto.createHash('sha256').update(u.toLowerCase()).digest('hex'),cf=u=>path.join(DATA,'chats',u+'.json'),chats=u=>read(cf(u),[]),save=(u,c)=>write(cf(u),c),id=()=>crypto.randomBytes(12).toString('hex');
function reply(res,n,obj){res.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((ok,no)=>{let s='',len=0;req.on('data',c=>{len+=c.length;if(len>15e6){no(Error('Request too large (15 MB limit)'));req.destroy()}else s+=c});req.on('end',()=>{try{ok(s?JSON.parse(s):{})}catch{no(Error('Invalid JSON'))}});req.on('error',no)})}
function auth(req){let t=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');let s=sessions.get(t);if(s&&s.exp>Date.now())return s;if(t)sessions.delete(t);return null}
function staticFile(res,p){let name=p==='/'?'/index.html':decodeURIComponent(p);name=path.normalize(name).replace(/^(\.\.[/\\])+/, '');let f=path.join(PUB,name);if(!f.startsWith(PUB))return reply(res,403,{error:'Forbidden'});fs.readFile(f,(e,b)=>{if(e)return reply(res,404,{error:'Not found'});let ext=path.extname(f),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','X-Frame-Options':'SAMEORIGIN'});res.end(b)})}
function pass(p,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(p,salt,64).toString('hex')}}
function valid(p,s){let a=crypto.scryptSync(p,s.salt,64),b=Buffer.from(s.hash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function pub(a){return {id:a.id,username:a.username,settings:a.settings}}
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost'),p=u.pathname;
try{
 if(req.method==='GET'&&p.startsWith('/fonts/')){let f=path.join(ROOT,'fonts',path.basename(p));if(!f.endsWith('.woff2'))return reply(res,404,{error:'Not found'});return fs.readFile(f,(e,b)=>{if(e)return reply(res,404,{error:'Font not found'});res.writeHead(200,{'Content-Type':'font/woff2'});res.end(b)})}
 if(req.method==='GET'&&p.startsWith('/shared/'))return staticFile(res,'/shared.html');
 if(p==='/api/register'&&req.method==='POST'||p==='/api/login'&&req.method==='POST'){
  const b=await body(req),name=String(b.username||'').trim(),pw=String(b.password||'');let all=users(),a;
  if(p.endsWith('register')){if(!/^[a-zA-Z0-9_.-]{3,32}$/.test(name))return reply(res,400,{error:'Username must be 3–32 letters, numbers, dot, underscore or hyphen.'});if(pw.length<8||pw.length>200)return reply(res,400,{error:'Password must be at least 8 characters.'});if(all.some(x=>x.username.toLowerCase()===name.toLowerCase()))return reply(res,409,{error:'Username already exists.'});a={id:uid(name),username:name,password:pass(pw),settings:{assistantName:'Nova-DSS CPL Ai',theme:'dark',accentTheme:'purple',language:'en',font:'system'}};all.push(a);write(af,all);save(a.id,[])}
  else {a=all.find(x=>x.username.toLowerCase()===name.toLowerCase());if(!a||!valid(pw,a.password))return reply(res,401,{error:'Incorrect username or password.'})}
  let token=crypto.randomBytes(32).toString('hex');sessions.set(token,{userId:a.id,exp:Date.now()+7*864e5});return reply(res,200,{token,account:pub(a)})
 }
 if(p==='/api/ai/chat'&&req.method==='POST'){
  if(!session)return reply(res,401,{error:'Please sign in'});
  checkAiLimit(session.userId);const b=await body(req);if(!Array.isArray(b.messages)||!b.messages.length)return reply(res,400,{error:'Messages are required'});
  if(!PUTER_TOKEN)return reply(res,503,{error:'AI service is not configured. Add PUTER_AUTH_TOKEN to Railway Variables.'});
  const model=String(b.model||'gpt-4o-mini').slice(0,100);
  const upstream=await fetch('https://api.puter.com/puterai/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+PUTER_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({model,messages:b.messages,stream:true})});
  if(!upstream.ok){const err=await upstream.text();return reply(res,upstream.status,{error:'Puter AI error: '+err.slice(0,1000)})}
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
  const reader=upstream.body.getReader();const decoder=new TextDecoder();let carry='';
  try{while(true){const {done,value}=await reader.read();if(done)break;carry+=decoder.decode(value,{stream:true});const lines=carry.split('\n');carry=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const raw=line.slice(5).trim();if(!raw||raw==='[DONE]')continue;try{const item=JSON.parse(raw),delta=item.choices?.[0]?.delta?.content;if(typeof delta==='string'&&delta)res.write('data: '+JSON.stringify({type:'text',text:delta})+'\n\n');else if(Array.isArray(delta)){for(const part of delta)if(part.type==='text'&&part.text)res.write('data: '+JSON.stringify({type:'text',text:part.text})+'\n\n')}}catch{}}}res.write('data: [DONE]\n\n')}catch(e){if(!res.destroyed)res.write('data: '+JSON.stringify({type:'error',message:e.message})+'\n\n')}finally{if(!res.destroyed)res.end()}return;
 }
 if(p==='/api/ai/image'&&req.method==='POST'){
  if(!session)return reply(res,401,{error:'Please sign in'});checkAiLimit(session.userId);const b=await body(req),prompt=String(b.prompt||'').trim();if(!prompt||prompt.length>12000)return reply(res,400,{error:'Please provide an image prompt under 12,000 characters.'});
  const result=await getPuter().ai.txt2img(prompt,{model:String(b.model||'gpt-image-2.6-flare')});const src=result?.src||String(result||'');if(!src)return reply(res,502,{error:'Puter did not return an image.'});return reply(res,200,{src});
 }
 if(p.startsWith('/api/share/')&&req.method==='GET'){let s=read(path.join(DATA,'shares',path.basename(p)+'.json'),null);return s?reply(res,200,{title:s.title,messages:s.messages}):reply(res,404,{error:'Share not found or revoked'})}
 if(!p.startsWith('/api/'))return req.method==='GET'?staticFile(res,p):reply(res,405,{error:'Method not allowed'});
 const session=auth(req);if(!session)return reply(res,401,{error:'Please sign in'});let all=users(),a=all.find(x=>x.id===session.userId);if(!a)return reply(res,401,{error:'Account not found'});
 if(p==='/api/logout'&&req.method==='POST'){sessions.delete((req.headers.authorization||'').replace(/^Bearer\s+/i,''));return reply(res,200,{ok:true})}
 if(p==='/api/me'&&req.method==='GET')return reply(res,200,{account:pub(a)});
 if(p==='/api/account'&&req.method==='PATCH'){
  const b=await body(req),name=String(b.username||'').trim();
  if(!/^[a-zA-Z0-9_.-]{3,32}$/.test(name))return reply(res,400,{error:'Username must be 3–32 letters, numbers, dot, underscore or hyphen.'});
  if(all.some(x=>x.id!==a.id&&x.username.toLowerCase()===name.toLowerCase()))return reply(res,409,{error:'Username already exists.'});
  a.username=name;write(af,all);return reply(res,200,{account:pub(a)});
 }
 if(p==='/api/chats/all'&&req.method==='DELETE'){
  save(a.id,[]);
  const dir=path.join(DATA,'shares');
  for(const f of fs.readdirSync(dir)){const sh=read(path.join(dir,f),null);if(sh&&sh.owner===a.id)fs.rmSync(path.join(dir,f),{force:true})}
  return reply(res,200,{ok:true});
 }
 if(p==='/api/chats'&&req.method==='GET')return reply(res,200,{chats:chats(a.id)});
 if(p==='/api/settings'&&req.method==='PUT'){let b=await body(req);a.settings={assistantName:String(b.assistantName||a.settings?.assistantName||'Nova-DSS CPL Ai').slice(0,50),theme:['dark','light'].includes(b.theme)?b.theme:'dark',accentTheme:['purple','orange','green','blue','red','white'].includes(b.accentTheme)?b.accentTheme:'purple',language:['en','fa'].includes(b.language)?b.language:'en',font:b.font==='custom'?'custom':'system'};write(af,all);return reply(res,200,{settings:a.settings})}
 if(p==='/api/chats'&&req.method==='POST'){let b=await body(req),cs=chats(a.id),c={id:id(),title:String(b.title||'New chat').slice(0,100),messages:[],model:String(b.model||'').slice(0,80),pinned:false,archived:false,createdAt:Date.now(),updatedAt:Date.now()};cs.push(c);save(a.id,cs);return reply(res,201,{chat:c})}
 let m=p.match(/^\/api\/chats\/([a-f0-9]+)(\/share)?$/);
 if(m){let cs=chats(a.id),c=cs.find(x=>x.id===m[1]);if(!c)return reply(res,404,{error:'Chat not found'});
  if(m[2]&&req.method==='POST'){let sid=id();write(path.join(DATA,'shares',sid+'.json'),{owner:a.id,chatId:c.id,title:c.title,messages:c.messages});return reply(res,201,{url:u.origin+'/shared/'+sid})}
  if(req.method==='PATCH'){let b=await body(req);if(typeof b.title==='string')c.title=b.title.trim().slice(0,100)||'New chat';if(typeof b.model==='string')c.model=b.model.slice(0,80);if(typeof b.pinned==='boolean')c.pinned=b.pinned;if(typeof b.archived==='boolean')c.archived=b.archived;if(Array.isArray(b.messages))c.messages=b.messages;c.updatedAt=Date.now();save(a.id,cs);return reply(res,200,{chat:c})}
  if(req.method==='DELETE'){save(a.id,cs.filter(x=>x.id!==c.id));for(let f of fs.readdirSync(path.join(DATA,'shares'))){let sh=read(path.join(DATA,'shares',f),null);if(sh&&sh.owner===a.id&&sh.chatId===c.id)fs.rmSync(path.join(DATA,'shares',f),{force:true})}return reply(res,200,{ok:true})}
 }
 return reply(res,404,{error:'API endpoint not found'})
}catch(e){return reply(res,400,{error:e.message||'Request failed'})}});
server.listen(PORT,HOST,()=>console.log(`Nova AI: http://${HOST}:${PORT} | Data: ${DATA}`));
