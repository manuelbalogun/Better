const {useState,useEffect,useRef,useMemo,useCallback}=React;
const h2=(t,p,...c)=>{if(p&&p.class!=null){p={...p,className:p.class};delete p.class;}return React.createElement(t,p,...c);};
const html=htm.bind(h2);
const B=window.Better;
const {Button,IconButton,Chip,TextField,Stepper,Switch,Badge,GlassCard,DoseCircle,DoseRow,NextCard,DateStrip,Tabs,NavPill,BarChart,StockRing,Sheet,Toast,Banner,ListRow,EmptyState,Icon,TopBar}=B;

const ANCHORS=[{key:'wake',label:'Wake up'},{key:'breakfast',label:'Breakfast'},{key:'lunch',label:'Lunch'},{key:'dinner',label:'Dinner'},{key:'bedtime',label:'Bedtime'}];
const ALABEL=Object.fromEntries(ANCHORS.map(a=>[a.key,a.label]));
const AIDX=Object.fromEntries(ANCHORS.map((a,i)=>[a.key,i]));
const DEFAULT_TIMES={wake:390,breakfast:480,lunch:780,dinner:1200,bedtime:1350};
const fmt=(m)=>{m=((Math.round(m)%1440)+1440)%1440;const h=Math.floor(m/60),mm=m%60;return (h%12===0?12:h%12)+':'+String(mm).padStart(2,'0')+' '+(h<12?'am':'pm');};
const TODAY=new Date();TODAY.setHours(0,0,0,0);
const pad=(n)=>String(n).padStart(2,'0');
const dk=(d)=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const fromKey=(k)=>new Date(k+'T00:00:00');
const todayKey=dk(TODAY);
const DOWL=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const DOWF=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const longDate=(k)=>{const d=fromKey(k);return DOWF[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()];};
const hash=(s)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0);};

const DB=[
['Paracetamol','Panadol, Emzor Paracetamol',['500 mg','1000 mg']],['Ibuprofen','Brufen',['200 mg','400 mg']],['Aspirin','',['75 mg','300 mg']],
['Metformin','Glucophage',['500 mg','850 mg','1000 mg']],['Glibenclamide','Daonil',['2.5 mg','5 mg']],['Gliclazide','Diamicron',['30 mg','60 mg','80 mg']],
['Lisinopril','Zestril',['5 mg','10 mg','20 mg']],['Amlodipine','Norvasc',['5 mg','10 mg']],['Losartan','Cozaar',['50 mg','100 mg']],['Hydrochlorothiazide','',['12.5 mg','25 mg']],
['Atorvastatin','Lipitor',['10 mg','20 mg','40 mg']],['Clopidogrel','Plavix',['75 mg']],['Levothyroxine','Synthroid, Eltroxin',['50 mcg','100 mcg']],
['Omeprazole','Losec',['20 mg','40 mg']],['Amoxicillin','Amoxil',['250 mg','500 mg']],['Ciprofloxacin','Ciproxin',['250 mg','500 mg']],['Metronidazole','Flagyl',['200 mg','400 mg']],
['Artemether/Lumefantrine','Coartem, Lonart',['20/120 mg']],['Salbutamol','Ventolin',['2 mg','4 mg']],['Prednisolone','',['5 mg','20 mg']],
['Folic acid','',['5 mg']],['Ferrous sulfate','Ferrograd',['200 mg']],['Vitamin D3','',['1000 IU','2000 IU']],['Vitamin C','',['500 mg','1000 mg']],['Zinc','',['20 mg']]
].map(([name,brand,strengths])=>({name,brand,strengths}));

function mkMeds(){const start=dk(addDays(TODAY,-28));const base={start,end:null,pausedUntil:null,stoppedOn:null,days:[0,1,2,3,4,5,6],lowAt:7};
return [
{...base,id:'m1',name:'Metformin',strength:'500 mg',anchors:['breakfast','dinner'],pills:48},
{...base,id:'m2',name:'Lisinopril',strength:'10 mg',anchors:['breakfast'],pills:40},
{...base,id:'m3',name:'Vitamin D3',strength:'1000 IU',anchors:['lunch'],pills:12},
{...base,id:'m4',name:'Atorvastatin',strength:'20 mg',anchors:['dinner'],pills:21},
{...base,id:'m5',name:'Levothyroxine',strength:'50 mcg',anchors:['wake'],pills:30}];}

function medActive(m,k){if(m.deleted||k<m.start)return false;if(m.end&&k>m.end)return false;if(m.stoppedOn&&k>=m.stoppedOn)return false;if(m.pausedUntil&&k>=todayKey&&k<m.pausedUntil)return false;return m.days.includes(fromKey(k).getDay());}
const eff=(s,k,a)=>s.overrides[k+'|'+a]!=null?s.overrides[k+'|'+a]:s.anchorTimes[a];
function dosesFor(s,k){const out=[];s.meds.forEach(m=>{if(!medActive(m,k))return;m.anchors.forEach(a=>out.push({key:k+'|'+m.id+'|'+a,med:m,anchor:a}));});
out.sort((x,y)=>AIDX[x.anchor]-AIDX[y.anchor]||x.med.name.localeCompare(y.med.name));return out;}
function statusOf(s,k,d){const r=s.doses[d.key];if(r&&r.status)return r.status;if(k>todayKey)return 'upcoming';if(k<todayKey)return 'missed';
const t=eff(s,k,d.anchor),i=AIDX[d.anchor],nx=i<4?eff(s,k,ANCHORS[i+1].key):99999;
if(s.now>=Math.min(t+180,nx))return 'missed';const sn=s.snoozes[k+'|'+d.anchor];if(sn&&sn.until>s.now)return 'snoozed';if(s.now>=t)return 'due';return 'upcoming';}
const daysLeft=(m)=>m.pills==null?null:Math.floor(m.pills/Math.max(1,m.anchors.length)*7/Math.max(1,m.days.length));

function seedHistory(meds,s){const doses={};for(let i=28;i>=1;i--){const k=dk(addDays(TODAY,-i));dosesFor({...s,meds},k).forEach(d=>{const h=hash(d.key)%100;
if(h<84)doses[d.key]={status:'taken',at:s.anchorTimes[d.anchor]+(hash(d.key+'t')%25)};else if(h<90)doses[d.key]={status:'skipped',reason:'Felt unwell'};});}return doses;}

function makeState(scn){const base={onboarded:true,name:'Ayodeji',anchorTimes:{...DEFAULT_TIMES},meds:mkMeds(),doses:{},overrides:{},snoozes:{},
settings:{snooze:15,sound:true,vibrate:true,followup:true,lowstock:true,showNames:false,theme:'system'},perms:{notif:true,exact:true,battery:true,autostart:true,dnd:true},
lastExportAt:null,now:485,skipRel:false,notifAsked:0,hist:true};
base.doses=seedHistory(base.meds,base);
const T=(id,a,at)=>{base.doses[todayKey+'|'+id+'|'+a]={status:'taken',at};};
if(scn==='fresh'){return {...base,onboarded:false,name:'',meds:[],doses:{},now:480,hist:false,perms:{notif:false,exact:false,battery:false,autostart:false,dnd:true}};}
T('m5','wake',394);
if(scn==='partial'){base.now=500;T('m1','breakfast',486);}
if(scn==='overdue'){base.now=825;T('m1','breakfast',487);T('m2','breakfast',487);}
if(scn==='evening'){base.now=1210;T('m1','breakfast',487);T('m2','breakfast',487);T('m3','lunch',790);}
if(scn==='done'){base.now=1360;T('m1','breakfast',487);T('m2','breakfast',487);T('m3','lunch',790);T('m1','dinner',1205);T('m4','dinner',1205);}
if(scn==='lowstock'){base.meds=base.meds.map(m=>m.id==='m4'?{...m,pills:5}:m.id==='m3'?{...m,pills:0}:m);}
if(scn==='broken'){base.perms={notif:false,exact:false,battery:false,autostart:false,dnd:true};}
if(scn==='nohist'){base.doses={};base.hist=false;base.meds=base.meds.map(m=>({...m,start:todayKey}));}
return base;}

const KEY='better-v1';
function loadState(){try{const j=localStorage.getItem(KEY);if(j){const s=JSON.parse(j);if(s&&s.meds){s.now=realNow();return s;}}}catch(e){}return {...makeState('fresh'),now:realNow()};}
function saveState(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}

function banners(s){const o=[];if(!s.perms.notif)o.push({tone:'danger',title:'Notifications are off',body:'Without them, Better cannot remind you.',action:'Turn on',fix:'notif'});
if(!s.perms.exact)o.push({tone:'warning',title:'Reminders may be late',body:'Allow exact alarms so reminders arrive on the minute.',action:'Fix this',fix:'exact'});
if(!s.perms.battery)o.push({tone:'warning',title:'Reminders may be delayed',body:'Your phone restricts Better in the background. Turn off battery optimisation.',action:'Fix this',fix:'battery'});return o;}

const GREET=(now)=>now<720?'Good morning':now<1020?'Good afternoon':'Good evening';
function nextBlock(s){const ds=dosesFor(s,todayKey);const groups={};ds.forEach(d=>{const st=statusOf(s,todayKey,d);if(st==='taken'||st==='skipped'||st==='missed')return;(groups[d.anchor]=groups[d.anchor]||[]).push({d,st});});
const k=ANCHORS.map(a=>a.key).find(a=>groups[a]);if(!k)return null;const items=groups[k];const all=ds.filter(d=>d.anchor===k);
const takenCount=all.filter(d=>{const st=statusOf(s,todayKey,d);return st==='taken'||st==='skipped';}).length;
const t=eff(s,todayKey,k);const snoozed=items.every(i=>i.st==='snoozed');
return {anchor:k,items,all,takenCount,time:t,late:s.now>=t+30,started:s.now>=t,snoozed,snoozeUntil:(s.snoozes[todayKey+'|'+k]||{}).until,snoozeCount:(s.snoozes[todayKey+'|'+k]||{count:0}).count};}
function circleFor(s,k){const ds=dosesFor(s,k);let t=0;ds.forEach(d=>{const st=statusOf(s,k,d);if(st==='taken')t++;});return {taken:t,total:ds.length};}
function dayPct(s,k){const c=circleFor(s,k);return c.total?c.taken/c.total:0;}

const Ctx=React.createContext(null);const useC=()=>React.useContext(Ctx);
const cx=(...a)=>a.filter(Boolean).join(' ');
function Hdr({title,onBack,right,sub}){const c=useC();return html`<${TopBar} leading="back" onLeading=${onBack||c.back} title=${title} subtitle=${sub} actions=${right}/>`;}
function Page({children,pad}){return html`<div class="scroll" style=${pad?{paddingBottom:pad}:null} onScroll=${e=>{const t=e.currentTarget.previousElementSibling;if(t&&t.classList.contains("b-tbw"))t.classList.toggle("is-scrolled",e.currentTarget.scrollTop>4);}}>${children}</div>`;}
function Label({children}){return html`<div class="sec-label">${children}</div>`;}
function BigTime({value,sub}){return html`<div class="bigtime"><b>${fmt(value)}</b>${sub?html`<span>${sub}</span>`:null}</div>`;}

function TimeBody({value,onChange,min,max}){const h=Math.floor(value/60),m=value%60;
const set=(v)=>{if(min!=null&&v<min)v=min;if(max!=null&&v>max)v=max;onChange(((v%1440)+1440)%1440);};
return html`<div class="b-stack"><${BigTime} value=${value}/>
<div class="b-row" style=${{justifyContent:'center'}}>
<${Chip} variant="time" onClick=${()=>set(value-60)}>− 1 h<//><${Chip} variant="time" onClick=${()=>set(value+60)}>+ 1 h<//>
<${Chip} variant="time" onClick=${()=>set(value-5)}>− 5 min<//><${Chip} variant="time" onClick=${()=>set(value+5)}>+ 5 min<//></div>
<div class="b-row" style=${{justifyContent:'center'}}><${Chip} selected=${h<12} onClick=${()=>h>=12&&set(value-720)}>am<//><${Chip} selected=${h>=12} onClick=${()=>h<12&&set(value+720)}>pm<//></div></div>`;}

function TimeSheet({p}){const c=useC();const [v,setV]=useState(p.value);const [err,setErr]=useState('');
const save=()=>{if(p.validate){const e=p.validate(v);if(e){setErr(e);return;}}p.onSave(v);c.closeSheet();};
return html`<${Sheet} title=${p.title} onClose=${c.closeSheet} actions=${[html`<${Button} key="s" full onClick=${save}>${p.cta||'Save'}<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}>
${p.note?html`<div class="note">${p.note}</div>`:null}<${TimeBody} value=${v} onChange=${(x)=>{setV(x);setErr('');}}/>${err?html`<${Banner} tone="danger" title=${err}/>`:null}<//>`;}

function doseSub(s,k,d,st){const t=eff(s,k,d.anchor),r=s.doses[d.key];
if(st==='taken')return 'Taken '+fmt(r.at);if(st==='skipped')return 'Skipped'+(r.reason?' · '+r.reason:'');if(st==='missed')return ALABEL[d.anchor]+' · was due '+fmt(t);
if(st==='snoozed')return ALABEL[d.anchor]+' · snoozed';return ALABEL[d.anchor]+' · '+fmt(t);}
function Row({d,k,editable}){const c=useC();const s=c.s;const st=statusOf(s,k,d);const sn=s.snoozes[k+'|'+d.anchor];
const onTake=()=>{if(k===todayKey)c.act.take(d);else c.sheet('logLate',{key:d.key,k});};
const txt=d.med.name+' '+d.med.strength;
return html`<div class="rowwrap" onClick=${(e)=>{if(e.target.closest('button'))return;c.sheet('dose',{key:d.key,k});}}>
<${DoseRow} anchor=${d.anchor} name=${txt} sub=${doseSub(s,k,d,st)} state=${st} time=${fmt(eff(s,k,d.anchor))} snoozeLabel=${sn?'Until '+fmt(sn.until):'Snoozed'} onTake=${onTake} onUndo=${()=>c.act.undo(d.key)}/></div>`;}

function Today(){const c=useC();const {s,ui,setUi}=c;const sel=ui.sel,tab=ui.tab,wk=ui.wk;
const monday=(()=>{const d=addDays(TODAY,wk*7);const w=(d.getDay()+6)%7;return addDays(d,-w);})();
const days=[0,1,2,3,4,5,6].map(i=>{const d=addDays(monday,i),k=dk(d),ci=circleFor(s,k);return {label:DOWL[d.getDay()],date:String(d.getDate()),taken:ci.taken,total:ci.total,selected:k===sel,today:k===todayKey,future:k>todayKey,k};});
const ds=dosesFor(s,sel);const stat=ds.map(d=>({d,st:statusOf(s,sel,d)}));
const left=stat.filter(x=>x.st!=='taken'&&x.st!=='skipped'),done=stat.filter(x=>x.st==='taken'||x.st==='skipped');
done.sort((a,b)=>((s.doses[a.d.key]||{}).at||0)-((s.doses[b.d.key]||{}).at||0));
const bn=banners(s)[0];const isToday=sel===todayKey;const nb=isToday?nextBlock(s):null;
const ago=Math.round((TODAY-fromKey(sel))/864e5);const ro=ago>7;
const groups=[];left.forEach(x=>{let g=groups.find(y=>y.a===x.d.anchor);if(!g){g={a:x.d.anchor,rows:[]};groups.push(g);}g.rows.push(x.d);});
let body;
if(s.meds.filter(m=>!m.deleted).length===0)body=html`<${EmptyState} icon="pill" title="No medications yet" body="Add your first one and Better will remind you at the right time of day." action="Add medication" onAction=${()=>c.go('add')}/>`;
else if(tab==='taken'){body=done.length?html`<div class="b-stack">${done.map(x=>html`<${Row} key=${x.d.key} d=${x.d} k=${sel}/>`)}</div>`:html`<${EmptyState} icon="clock" title=${isToday?'Nothing taken yet':'Nothing taken'} body=${isToday?'Doses you take will show here with the time.':'No doses were logged on this day.'}/>`;}
else if(!ds.length)body=html`<${EmptyState} icon="calendar" title="Nothing to take" body=${ago<0?'No doses are scheduled for this day.':'Nothing was scheduled on this day.'}/>`;
else if(isToday&&!left.length)body=html`<${EmptyState} icon="check" title="All done for today" body=${'Next up: '+ALABEL[ANCHORS.find(a=>dosesFor(s,dk(addDays(TODAY,1))).some(d=>d.anchor===a.key))?.key||'wake']+' tomorrow at '+fmt(s.anchorTimes[ANCHORS.find(a=>dosesFor(s,dk(addDays(TODAY,1))).some(d=>d.anchor===a.key))?.key||'wake'])+'.'}/>`;
else if(!left.length)body=html`<${EmptyState} icon="check" title="Everything was taken" body="All doses on this day are logged."/>`;
else body=html`<div class="b-stack">
${nb&&html`<${NextCard} anchor=${nb.anchor} anchorLabel=${ALABEL[nb.anchor]} state=${nb.late?'late':'upcoming'} time=${nb.snoozed&&nb.snoozeUntil?'Snoozed to '+fmt(nb.snoozeUntil):nb.late?'Was '+fmt(nb.time):fmt(nb.time)} meds=${nb.items.map(i=>i.d.med.name+' '+i.d.med.strength).join(', ')} takenCount=${nb.takenCount} onTake=${()=>c.act.takeBlock(nb.anchor)} onLate=${()=>c.sheet('late',{anchor:nb.anchor})} onSnooze=${()=>c.act.snooze(nb.anchor)}/>`}
${groups.map(g=>html`<div key=${g.a} class="b-stack"><${Label}>${ALABEL[g.a]} · ${fmt(eff(s,sel,g.a))}<//>${g.rows.map(d=>html`<${Row} key=${d.key} d=${d} k=${sel}/>`)}</div>`)}</div>`;
return html`<div class="screen"><${TopBar} variant="root" brand title="Better" actions=${[{icon:'bell',label:'Notifications',onClick:()=>c.go('notifs'),dot:!!bn}]}/><${Page}>
<div class="greet"><div><div class="greet__h">${GREET(s.now)}${s.name?', '+s.name:''}</div><div class="greet__d">${longDate(sel)}${sel===todayKey?' · today':''}</div></div></div>
<div class="weekbar"><${IconButton} icon="chevron-left" label="Previous week" variant="ghost" onClick=${()=>setUi({wk:wk-1})}/><span>${wk===0?'This week':wk<0?(-wk)+(wk===-1?' week ago':' weeks ago'):wk+(wk===1?' week ahead':' weeks ahead')}</span><${IconButton} icon="chevron-right" label="Next week" variant="ghost" onClick=${()=>setUi({wk:wk+1})}/></div>
<${DateStrip} days=${days} onSelect=${(i)=>setUi({sel:days[i].k})}/>
${bn&&html`<div style=${{marginTop:12}}><${Banner} tone=${bn.tone} title=${bn.title} body=${bn.body} action=${bn.action} onAction=${()=>c.go('reliability')}/></div>`}
<div class="tabrow"><${Tabs} value=${tab} onChange=${(v)=>setUi({tab:v})} items=${[{key:'up',label:'Upcoming'},{key:'taken',label:'Taken'}]}/>
${!isToday&&ds.length?html`<${Badge}>${ago>0?(ro?'Read-only':'Can log late'):'Planned'}<//>`:null}</div>
${body}<//></div>`;}

function DoseSheet({p}){const c=useC();const s=c.s;const [view,setView]=useState('main');const [t,setT]=useState(null);const [reason,setReason]=useState('');
const [k,key]=[p.k,p.key];const d=dosesFor(s,k).find(x=>x.key===key);if(!d){return null;}
const st=statusOf(s,k,d);const r=s.doses[key];const ro=Math.round((TODAY-fromKey(k))/864e5)>7;const isT=k===todayKey;
const title=d.med.name+' '+d.med.strength;
const defT=isT?Math.min(s.now,1439):eff(s,k,d.anchor);
if(view==='time')return html`<${Sheet} title="Taken at" onClose=${c.closeSheet} actions=${[html`<${Button} key="a" full onClick=${()=>{c.act.takeAt(d,k,t==null?defT:t);c.closeSheet();}}>Save<//>`,html`<${Button} key="b" full variant="ghost" onClick=${()=>setView('main')}>Back<//>`]}><${TimeBody} value=${t==null?defT:t} onChange=${setT}/><//>`;
if(view==='skip')return html`<${Sheet} title="Skip this dose?" onClose=${c.closeSheet} actions=${[html`<${Button} key="a" full variant="secondary" onClick=${()=>{c.act.skip(d,k,reason);c.closeSheet();}}>Skip dose<//>`,html`<${Button} key="b" full variant="ghost" onClick=${()=>setView('main')}>Back<//>`]}><div class="note">It counts as not taken. Pick a reason if you like.</div><div class="b-row">${['Felt unwell','Ran out','Doctor said','Other'].map(x=>html`<${Chip} key=${x} selected=${reason===x} onClick=${()=>setReason(reason===x?'':x)}>${x}<//>`)}</div><//>`;
const acts=[];
if(st==='taken'){if(isT)acts.push(html`<${Button} key="u" full variant="secondary" onClick=${()=>{c.act.undo(key);c.closeSheet();}}>Undo, mark as not taken<//>`);if(!ro)acts.push(html`<${Button} key="t" full variant="ghost" onClick=${()=>setView('time')}>Change time<//>`);}
else if(st==='skipped'){if(isT)acts.push(html`<${Button} key="u" full variant="secondary" onClick=${()=>{c.act.undo(key);c.closeSheet();}}>Undo skip<//>`);acts.push(html`<${Button} key="t" full variant="ghost" onClick=${()=>setView('time')}>I took it, set the time<//>`);}
else if(ro){}
else{acts.push(html`<${Button} key="n" full onClick=${()=>{if(isT){c.act.take(d);}else{c.act.takeAt(d,k,defT);}c.closeSheet();}}>${isT?'Take now':'Mark as taken'}<//>`);acts.push(html`<${Button} key="o" full variant="secondary" onClick=${()=>setView('time')}>Take at another time<//>`);if(isT||k>todayKey)acts.push(html`<${Button} key="s" full variant="ghost" onClick=${()=>setView('skip')}>Skip<//>`);}
acts.push(html`<${Button} key="x" full variant="ghost" onClick=${c.closeSheet}>Close<//>`);
const info=st==='taken'?'Taken at '+fmt(r.at):st==='skipped'?'Skipped'+(r.reason?' · '+r.reason:''):st==='missed'?'Missed · was due '+fmt(eff(s,k,d.anchor)):'Due '+fmt(eff(s,k,d.anchor));
return html`<${Sheet} title=${title} onClose=${c.closeSheet} actions=${acts}><div class="b-row"><${Badge} anchor=${d.anchor}>${ALABEL[d.anchor]}<//><${Badge} tone=${st==='taken'?'success':st==='missed'?'danger':st==='snoozed'?'warning':null} icon=${st==='taken'?'check':st==='missed'?'alert':st==='snoozed'?'snooze':null}>${info}<//></div>${ro?html`<div class="note">This day is more than 7 days ago, so it is read-only.</div>`:null}<//>`;}

function LateSheet({p}){const c=useC();const s=c.s;const a=p.anchor;const t0=eff(s,todayKey,a);const [v,setV]=useState(Math.max(t0+60,s.now));const [custom,setCustom]=useState(false);const [err,setErr]=useState('');
const i=AIDX[a];const nextT=i<4?eff(s,todayKey,ANCHORS[i+1].key):1439;
const later=s.meds.some(m=>medActive(m,todayKey)&&m.anchors.includes(a)&&m.anchors.some(x=>AIDX[x]>i));
const opts=[30,60,120].map(x=>Math.max(t0,s.now)+x);
const save=()=>{if(v>=nextT){setErr('That is after '+ALABEL[ANCHORS[i+1].key]+'. Pick an earlier time.');return;}c.act.late(a,v);c.closeSheet();};
return html`<${Sheet} title=${'Running late for '+ALABEL[a].toLowerCase()+'?'} onClose=${c.closeSheet} actions=${[html`<${Button} key="s" full onClick=${save}>Remind me at ${fmt(v)}<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}>
<div class="note">Pick when you will eat. Your ${ALABEL[a]} reminder moves for today only.</div>
<div class="b-row">${opts.map((o,j)=>html`<${Chip} key=${j} variant="time" selected=${!custom&&v===o} onClick=${()=>{setV(o);setCustom(false);setErr('');}}>${fmt(o)}<//>`)}<${Chip} variant="time" icon="clock" selected=${custom} onClick=${()=>setCustom(true)}>Custom<//></div>
${custom?html`<${TimeBody} value=${v} onChange=${(x)=>{setV(x);setErr('');}}/>`:null}
${later?html`<${Banner} title="Your later dose does not move" body="The two doses will be closer together than usual."/>`:null}
${err?html`<${Banner} tone="danger" title=${err}/>`:null}<//>`;}

function LogLateSheet({p}){const c=useC();const s=c.s;const d=dosesFor(s,p.k).find(x=>x.key===p.key);const [v,setV]=useState(d?eff(s,p.k,d.anchor):480);if(!d)return null;
const ro=Math.round((TODAY-fromKey(p.k))/864e5)>7;
return html`<${Sheet} title="Log a late dose" onClose=${c.closeSheet} actions=${ro?[html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Close<//>`]:[html`<${Button} key="s" full onClick=${()=>{c.act.takeAt(d,p.k,v);c.closeSheet();}}>Save as taken at ${fmt(v)}<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}>
<div class="note">${d.med.name} ${d.med.strength} · ${longDate(p.k)}</div>${ro?html`<${Banner} title="Read-only" body="Days older than 7 days cannot be changed."/>`:html`<${TimeBody} value=${v} onChange=${setV}/>`}<//>`;}

const WD=[1,2,3,4,5,6,0];const WDL=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const medState=(m)=>{if(m.deleted)return 'deleted';if(m.stoppedOn&&m.stoppedOn<=todayKey)return 'finished';if(m.end&&m.end<todayKey)return 'finished';if(m.pausedUntil&&m.pausedUntil>todayKey)return 'paused';return 'active';};
const stockInfo=(m)=>{if(m.pills==null)return null;const dl=daysLeft(m);return {out:m.pills<=0,low:dl!=null&&dl<=m.lowAt,days:dl};};
const anchorsText=(m)=>m.anchors.slice().sort((a,b)=>AIDX[a]-AIDX[b]).map(a=>ALABEL[a]).join(', ');
const daysText=(m)=>m.days.length===7?'Every day':WD.filter(d=>m.days.includes(d)).map(d=>WDL[WD.indexOf(d)]).join(', ');

function AnchorPick({value,onChange}){return html`<div class="b-row">${ANCHORS.map(a=>html`<${Chip} key=${a.key} tone=${a.key} selected=${value.includes(a.key)} onClick=${()=>onChange(value.includes(a.key)?value.filter(x=>x!==a.key):[...value,a.key])}>${a.label}<//>`)}</div>`;}
function DaysPick({value,onChange}){const every=value.length===7;return html`<div class="b-row"><${Chip} selected=${every} onClick=${()=>onChange([0,1,2,3,4,5,6])}>Every day<//>${WD.map((d,i)=>html`<${Chip} key=${d} selected=${!every&&value.includes(d)} onClick=${()=>{const base=every?[]:value;const nx=base.includes(d)?base.filter(x=>x!==d):[...base,d];onChange(nx.length?nx:[0,1,2,3,4,5,6]);}}>${WDL[i]}<//>`)}</div>`;}
function LowPick({value,onChange}){return html`<div class="b-row">${[3,5,7,10].map(n=>html`<${Chip} key=${n} selected=${value===n} onClick=${()=>onChange(n)}>${n} days<//>`)}</div>`;}
const blankDraft=()=>({step:1,name:'',item:null,typed:false,strength:'',other:false,anchors:[],days:[0,1,2,3,4,5,6],course:false,courseDays:7,pills:30,pillsOn:true,lowAt:7,saved:null,editId:null});

function AddFlow(){const c=useC();const dr=c.draft,set=c.setDraft,s=c.s;const step=dr.step;
const q=dr.name.trim().toLowerCase();
const hits=!dr.item&&!dr.typed&&q.length>=2?DB.filter(d=>d.name.toLowerCase().includes(q)||d.brand.toLowerCase().includes(q)).slice(0,5):[];
const sugg=!dr.item&&!dr.typed&&q.length>=2?[...hits.map(h=>({title:h.name,sub:h.brand?h.brand+' · '+h.name.toLowerCase():'Supplement or generic',item:h})),{title:'Use “'+dr.name.trim()+'”',typed:true}]:[];
const dirty=!!dr.name||dr.anchors.length;
const close=()=>{if(dirty&&step<5)c.sheet('discard');else c.exitAdd();};
const needsStrength=dr.item&&dr.item.strengths.length;
const showCustom=!needsStrength||dr.other;
const strengthFinal=showCustom?dr.strength.trim():dr.strength;
const create=()=>{c.act.addMed(dr);};
const trySave=()=>{const dup=s.meds.find(m=>!m.deleted&&m.name.toLowerCase()===dr.name.trim().toLowerCase()&&m.anchors.some(a=>dr.anchors.includes(a)));if(dup)c.sheet('dup',{id:dup.id});else create();};
if(step===5){return html`<div class="screen"><div class="center"><div class="bigcheck"><${Icon} name="check" size=${44}/></div><h2 class="h2">${dr.saved.name} added</h2><p class="p">${dr.saved.text}</p>
<div class="b-stack" style=${{width:'100%',marginTop:12}}><${Button} full size="lg" onClick=${()=>c.act.afterAdd(true)}>Add another<//><${Button} full variant="ghost" onClick=${()=>c.act.afterAdd(false)}>Done<//></div></div></div>`;}
return html`<div class="screen"><${TopBar} leading=${step>1?"back":"close"} onLeading=${()=>step>1?set({step:step-1}):close()} title="Add medication" progress=${{step,total:4}}/>
<${Page} pad=${24}><div class="fstack">
${step===1&&html`<${React.Fragment}><div class="stephead"><h2 class="h2">What are you taking?</h2><p class="sub">Type the name of your medicine.</p></div>
<${TextField} label="Medication name" icon="search" placeholder="Try gluc or metformin" value=${dr.name} onChange=${(v)=>set({name:v,item:null,typed:false,strength:'',other:false})} suggestions=${sugg} onPick=${(x)=>x.typed?set({typed:true,item:null,name:dr.name.trim()}):set({item:x.item,name:x.item.name,typed:false})}/>
${dr.item&&html`<${Banner} tone="success" title=${dr.item.name} body=${dr.item.brand?'Also sold as '+dr.item.brand:'Suggested from the built-in list'}/>`}
${dr.typed&&html`<${Banner} title=${'Adding “'+dr.name+'”'} body="Not in our list, and that is fine. You will type the strength next."/>`}
${q.length>=2&&!hits.length&&!dr.item&&!dr.typed?html`<div class="note">No match in the list. You can still add it.</div>`:null}<//>`}
${step===2&&html`<${React.Fragment}><div class="stephead"><h2 class="h2">${dr.name} strength</h2><p class="sub">Pick the strength on your pack.</p></div>${needsStrength?html`<div class="b-row">${dr.item.strengths.map(x=>html`<${Chip} key=${x} selected=${!dr.other&&dr.strength===x} onClick=${()=>set({strength:x,other:false})}>${x}<//>`)}<${Chip} selected=${dr.other} onClick=${()=>set({other:true,strength:''})}>Other<//></div>`:null}
${showCustom&&html`<${TextField} label="Strength" placeholder="e.g. 250 mg" value=${dr.strength} onChange=${(v)=>set({strength:v})} hint="Optional. Include the unit."/>`}<//>`}
${step===3&&html`<${React.Fragment}><div class="stephead"><h2 class="h2">When do you take it?</h2><p class="sub">Pick one or more. We will remind you at those times.</p></div><div class="b-stack"><${Label}>Time of day<//><${AnchorPick} value=${dr.anchors} onChange=${(v)=>set({anchors:v})}/></div>
<div class="b-stack"><${Label}>Days<//><${DaysPick} value=${dr.days} onChange=${(v)=>set({days:v})}/></div>
<div class="b-stack"><${Switch} label="Stop after a number of days" checked=${dr.course} onChange=${(v)=>set({course:v})}/>${dr.course&&html`<${Stepper} label="Course length" value=${dr.courseDays} min=${1} step=${1} hint="days" onChange=${(v)=>set({courseDays:v})}/>`}</div><//>`}
${step===4&&html`<${React.Fragment}><div class="stephead"><h2 class="h2">Pills on hand</h2><p class="sub">Optional. We will warn you before they run out.</p></div>
<${Switch} label="Track how many I have" checked=${dr.pillsOn} onChange=${(v)=>set({pillsOn:v})}/>
${dr.pillsOn&&html`<${React.Fragment}><${Stepper} label="Pills on hand" value=${dr.pills} step=${10} onChange=${(v)=>set({pills:v})}/><div class="b-stack"><${Label}>Warn me when this many days are left<//><${LowPick} value=${dr.lowAt} onChange=${(v)=>set({lowAt:v})}/></div><//>`}<//>`}
</div><//>
<div class="foot">${step<4?html`<${Button} full size="lg" disabled=${(step===1&&!(dr.item||dr.typed))||(step===3&&!dr.anchors.length)} onClick=${()=>set({step:step+1})}>${step===2&&!strengthFinal?'Skip strength':'Continue'}<//>`:html`<${Button} full size="lg" onClick=${trySave}>Save medication<//>`}</div></div>`;}

function DupSheet({p}){const c=useC();const m=c.s.meds.find(x=>x.id===p.id);return html`<${Sheet} title="Already on your list" onClose=${c.closeSheet} actions=${[html`<${Button} key="a" full onClick=${()=>{c.closeSheet();c.act.addMed(c.draft);}}>Add anyway<//>`,html`<${Button} key="b" full variant="secondary" onClick=${()=>{c.closeSheet();c.exitAdd();c.go('edit',{id:p.id});}}>Edit existing<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}><div class="note">${m?m.name+' '+m.strength:''} is already set for ${m?anchorsText(m):''}.</div><//>`;}
function DiscardSheet(){const c=useC();return html`<${Sheet} title="Discard this medication?" onClose=${c.closeSheet} actions=${[html`<${Button} key="a" full variant="danger" onClick=${()=>{c.closeSheet();c.exitAdd();}}>Discard<//>`,html`<${Button} key="b" full variant="ghost" onClick=${c.closeSheet}>Keep editing<//>`]}><div class="note">Nothing is saved until you tap Save medication.</div><//>`;}

function MedsTab(){const c=useC();const s=c.s;const list=s.meds.filter(m=>!m.deleted);
const grp={active:[],paused:[],finished:[]};list.forEach(m=>grp[medState(m)].push(m));
const lowN=grp.active.filter(m=>{const x=stockInfo(m);return x&&(x.low||x.out);});
const row=(m)=>{const x=stockInfo(m),ms=medState(m);return html`<${ListRow} key=${m.id} icon="pill" anchor=${m.anchors[0]} title=${m.name+' '+m.strength} sub=${anchorsText(m)+(x&&ms==='active'?' · '+(m.pills<=0?'Out of pills':m.pills+' left'):'')} trailing=${ms==='paused'?html`<${Badge} icon="snooze">Paused<//>`:ms==='finished'?html`<${Badge}>Finished<//>`:x&&x.out?html`<${Badge} tone="danger" icon="alert">Out<//>`:x&&x.low?html`<${Badge} tone="warning" icon="alert">Low<//>`:null} onClick=${()=>c.go('med',{id:m.id})}/>`;};
return html`<div class="screen"><${TopBar} variant="root" title="Meds"/><${Page}><div class="note" style=${{margin:'4px 4px 12px'}}>${grp.active.length} active · ${list.length} total</div>
${lowN.length>0&&html`<div style=${{marginBottom:12}}><${Banner} tone=${lowN.some(m=>m.pills<=0)?'danger':'warning'} icon="box" title=${lowN.length===1?lowN[0].name+' is running low':lowN.length+' medications are running low'} body="Refill soon so you never miss a dose." action="Refill" onAction=${()=>c.sheet('refill',{id:lowN[0].id})}/></div>`}
${!list.length?html`<${EmptyState} icon="pill" title="No medications yet" body="Add your first one and Better will remind you at the right time of day." action="Add medication" onAction=${()=>c.go('add')}/>`:html`<div class="b-stack" style=${{gap:16}}>
${grp.active.length>0&&html`<div class="b-stack"><${Label}>Active<//><${GlassCard} pad=${0}>${grp.active.map(row)}<//></div>`}
${grp.paused.length>0&&html`<div class="b-stack"><${Label}>Paused<//><${GlassCard} pad=${0}>${grp.paused.map(row)}<//></div>`}
${grp.finished.length>0&&html`<div class="b-stack"><${Label}>Finished<//><${GlassCard} pad=${0}>${grp.finished.map(row)}<//></div>`}</div>`}
<//></div>`;}

function MedDetail({p}){const c=useC();const s=c.s;const m=s.meds.find(x=>x.id===p.id);if(!m||m.deleted)return html`<div class="screen"><${Hdr} title="Medication"/></div>`;
const ms=medState(m),x=stockInfo(m);
const hist=[6,5,4,3,2,1,0].map(i=>{const k=dk(addDays(TODAY,-i));const d=dosesFor(s,k).filter(y=>y.med.id===m.id);let t=0;d.forEach(y=>{if(statusOf(s,k,y)==='taken')t++;});return {k,taken:t,total:d.length,label:DOWL[fromKey(k).getDay()][0]};});
return html`<div class="screen"><${Hdr} title=${m.name+' '+m.strength}/><${Page}><div class="b-stack" style=${{gap:16}}>
<${GlassCard}><div class="kv"><span>When</span><b>${anchorsText(m)}</b></div><div class="kv"><span>Times</span><b>${m.anchors.slice().sort((a,b)=>AIDX[a]-AIDX[b]).map(a=>fmt(s.anchorTimes[a])).join(', ')}</b></div><div class="kv"><span>Days</span><b>${daysText(m)}</b></div>${m.end?html`<div class="kv"><span>Course ends</span><b>${longDate(m.end)}</b></div>`:null}${m.pausedUntil&&m.pausedUntil>todayKey?html`<div class="kv"><span>Paused until</span><b>${longDate(m.pausedUntil)}</b></div>`:null}<//>
${x&&html`<${GlassCard}><div class="b-row" style=${{justifyContent:'space-between'}}><${StockRing} left=${Math.max(0,m.pills)} total=${Math.max(m.pills,30)} days=${x.days} lowAt=${m.lowAt}/><${Button} variant="secondary" onClick=${()=>c.sheet('refill',{id:m.id})}>Refill<//></div><//>`}
<${GlassCard}><${Label}>Last 7 days<//><div class="b-row" style=${{justifyContent:'space-between',marginTop:12}}>${hist.map(h=>html`<div key=${h.k} class="mini"><${DoseCircle} taken=${h.taken} total=${h.total} size=${30} future=${h.k>todayKey}/><small>${h.label}</small></div>`)}</div><//>
<${GlassCard} pad=${0}><${ListRow} icon="edit" title="Edit" sub="Name, strength, times, stock" onClick=${()=>c.go('edit',{id:m.id})}/><${ListRow} icon="snooze" title=${ms==='paused'?'Resume or change pause':'Pause or stop'} sub=${ms==='finished'?'This course is finished':'Hide from Today without losing history'} onClick=${()=>c.sheet('pause',{id:m.id})}/><${ListRow} icon="trash" tone="danger" title="Delete" sub="Removes this medication and its history" onClick=${()=>c.sheet('delete',{id:m.id})}/><//>
</div><//></div>`;}

function EditMed({p}){const c=useC();const m=c.s.meds.find(x=>x.id===p.id);const [f,setF]=useState(()=>({name:m.name,strength:m.strength,anchors:m.anchors,days:m.days,pills:m.pills==null?0:m.pills,track:m.pills!=null,lowAt:m.lowAt}));
const u=(patch)=>setF({...f,...patch});const dirty=JSON.stringify(f)!==JSON.stringify({name:m.name,strength:m.strength,anchors:m.anchors,days:m.days,pills:m.pills==null?0:m.pills,track:m.pills!=null,lowAt:m.lowAt});
const ok=f.name.trim()&&f.anchors.length;
return html`<div class="screen"><${Hdr} title="Edit medication"/><${Page} pad=${24}><div class="fstack">
<${TextField} label="Medication name" value=${f.name} onChange=${(v)=>u({name:v})} error=${f.name.trim()?'':'Name cannot be empty'}/>
<${TextField} label="Strength" value=${f.strength} onChange=${(v)=>u({strength:v})}/>
<div class="b-stack"><${Label}>Time of day<//><${AnchorPick} value=${f.anchors} onChange=${(v)=>u({anchors:v})}/>${f.anchors.length?null:html`<div class="err">Pick at least one time of day</div>`}</div>
<div class="b-stack"><${Label}>Days<//><${DaysPick} value=${f.days} onChange=${(v)=>u({days:v})}/></div>
<div class="b-stack"><${Switch} label="Track pills on hand" checked=${f.track} onChange=${(v)=>u({track:v})}/>${f.track&&html`<${Stepper} label="Pills" value=${f.pills} step=${10} onChange=${(v)=>u({pills:v})}/>`}${f.track&&html`<${LowPick} value=${f.lowAt} onChange=${(v)=>u({lowAt:v})}/>`}</div>
<div class="note">Changes apply from now. Past records stay as they were.</div></div><//>
<div class="foot"><${Button} full size="lg" disabled=${!dirty||!ok} onClick=${()=>{c.act.editMed(m.id,{name:f.name.trim(),strength:f.strength.trim(),anchors:f.anchors,days:f.days,pills:f.track?f.pills:null,lowAt:f.lowAt});c.back();}}>Save changes<//></div></div>`;}

function PauseSheet({p}){const c=useC();const m=c.s.meds.find(x=>x.id===p.id);const [d,setD]=useState(3);const ms=medState(m);const until=dk(addDays(TODAY,d));
return html`<${Sheet} title=${'Pause or stop '+m.name} onClose=${c.closeSheet} actions=${[
ms==='paused'?html`<${Button} key="r" full onClick=${()=>{c.act.editMed(m.id,{pausedUntil:null});c.toast(m.name+' resumed');c.closeSheet();}}>Resume now<//>`:html`<${Button} key="p" full onClick=${()=>{c.act.editMed(m.id,{pausedUntil:until});c.toast(m.name+' paused until '+longDate(until));c.closeSheet();}}>Pause until ${DOWF[addDays(TODAY,d).getDay()].slice(0,3)} ${addDays(TODAY,d).getDate()} ${MON[addDays(TODAY,d).getMonth()]}<//>`,
ms!=='finished'?html`<${Button} key="s" full variant="danger" onClick=${()=>{c.act.editMed(m.id,{stoppedOn:todayKey});c.toast(m.name+' stopped');c.closeSheet();}}>Stop ${m.name}<//>`:null,
html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}>
<div class="note">Pausing hides it from Today. Stopping moves it to Finished. History is kept either way.</div>
${ms!=='paused'&&html`<div class="b-row">${[1,3,7,14].map(n=>html`<${Chip} key=${n} selected=${d===n} onClick=${()=>setD(n)}>${n===1?'Tomorrow':n===7?'1 week':n===14?'2 weeks':n+' days'}<//>`)}</div>`}<//>`;}
function DeleteSheet({p}){const c=useC();const m=c.s.meds.find(x=>x.id===p.id);return html`<${Sheet} title=${'Delete '+m.name+'?'} onClose=${c.closeSheet} actions=${[html`<${Button} key="d" full variant="danger" onClick=${()=>{c.act.deleteMed(m.id);c.closeSheet();c.back();}}>Delete ${m.name}<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Keep it<//>`]}><div class="note">This also deletes its history. It cannot be undone.</div><//>`;}
function RefillSheet({p}){const c=useC();const s=c.s;const low=s.meds.filter(m=>!m.deleted&&medState(m)==='active'&&m.pills!=null);const [id,setId]=useState(p.id||(low[0]||{}).id);const m=s.meds.find(x=>x.id===id);const [mode,setMode]=useState('add');const [n,setN]=useState(30);
if(!m)return html`<${Sheet} title="Refill" onClose=${c.closeSheet}><div class="note">No medications track pills yet.</div><//>`;
const after=mode==='add'?m.pills+n:n;
return html`<${Sheet} title="Refill" onClose=${c.closeSheet} actions=${[html`<${Button} key="s" full onClick=${()=>{c.act.editMed(m.id,{pills:after});c.toast(m.name+': '+after+' pills');c.closeSheet();}}>Save, ${after} pills<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}>
${low.length>1&&html`<div class="b-row">${low.map(x=>html`<${Chip} key=${x.id} selected=${x.id===id} onClick=${()=>setId(x.id)}>${x.name}<//>`)}</div>`}
<${StockRing} left=${Math.max(0,m.pills)} total=${Math.max(m.pills,30)} days=${daysLeft(m)} lowAt=${m.lowAt}/>
<${Tabs} value=${mode} onChange=${setMode} items=${[{key:'add',label:'Add pills'},{key:'set',label:'Set exact'}]}/>
<${Stepper} label="Pills" value=${n} step=${10} onChange=${setN} hint=${mode==='add'?'to add':'in total'}/><//>`;}

const resolved=(st)=>st==='taken'||st==='skipped'||st==='missed';
function rangeStats(s,fromOff,toOff,medId){let t=0,n=0;const lo=Math.min(fromOff,toOff),hi=Math.max(fromOff,toOff);for(let i=lo;i<=hi;i++){const k=dk(addDays(TODAY,-i));dosesFor(s,k).forEach(d=>{if(medId&&d.med.id!==medId)return;const st=statusOf(s,k,d);if(!resolved(st))return;n++;if(st==='taken')t++;});}return {taken:t,total:n};}
function History(){const c=useC();const s=c.s,ui=c.ui;const range=ui.hr||'week';const sel=ui.hsel;
const hasData=Object.keys(s.doses).length>0;
let bars=[];
if(range==='week')bars=[6,5,4,3,2,1,0].map((i,j)=>{const k=dk(addDays(TODAY,-i));const r=rangeStats(s,i,i);return {label:DOWL[fromKey(k).getDay()][0],value:r.total?r.taken/r.total:0,k,selected:sel===j,r};});
else if(range==='month')bars=[4,3,2,1,0].map((w,j)=>{const r=rangeStats(s,w*7+6,w*7);const d=addDays(TODAY,-(w*7+6));return {label:MON[d.getMonth()]+' '+d.getDate(),value:r.total?r.taken/r.total:0,r,selected:sel===j};});
else bars=(range==='6m'?[5,4,3,2,1,0]:[2,1,0]).map((m,j)=>{const r=rangeStats(s,m*30+29,m*30);const d=addDays(TODAY,-(m*30));return {label:MON[d.getMonth()],value:r.total?r.taken/r.total:0,r,selected:sel===j};});
const span=range==='week'?[0,6]:range==='month'?[0,34]:range==='3m'?[0,89]:[0,179];const tot=rangeStats(s,span[0],span[1]);
const meds=s.meds.filter(m=>!m.deleted).map(m=>({m,r:rangeStats(s,span[0],span[1],m.id)})).filter(x=>x.r.total>0);
const picked=sel!=null?bars[sel]:null;
const pickedDoses=range==='week'&&picked?dosesFor(s,picked.k):[];
return html`<div class="screen"><${TopBar} variant="root" title="History"/><${Page}>
${!hasData||tot.total===0?html`<${EmptyState} icon="chart" title="Your routine will show here" body="After your first full day you will see how often you took each dose."/>`:html`<div class="b-stack" style=${{gap:16}}>
<${Tabs} value=${range} onChange=${(v)=>c.setUi({hr:v,hsel:null})} items=${[{key:'week',label:'Week'},{key:'month',label:'Month'},{key:'3m',label:'3 mo'},{key:'6m',label:'6 mo'}]}/>
<${GlassCard}><div class="stat"><b>${tot.total?Math.round(tot.taken/tot.total*100):0}%</b><span>${tot.taken} of ${tot.total} doses taken</span></div>
<div style=${{marginTop:16}}><${BarChart} data=${bars} height=${140} onSelect=${(i)=>c.setUi({hsel:sel===i?null:i})} label=${range==='week'?'Doses taken per day':range==='month'?'Doses taken per week':'Doses taken per month'}/></div>
${range!=='week'&&html`<div class="note" style=${{marginTop:12}}>Each bar is ${range==='month'?'one week':'one month'}. Tap a bar for its numbers.</div>`}<//>
${picked&&range!=='week'&&html`<${GlassCard}><b>${picked.label}</b><div class="note">${picked.r.total?picked.r.taken+' of '+picked.r.total+' doses taken':'No data for this period yet.'}</div><//>`}
${picked&&range==='week'&&html`<div class="b-stack"><${Label}>${longDate(picked.k)}<//>${pickedDoses.length?pickedDoses.map(d=>html`<${Row} key=${d.key} d=${d} k=${picked.k}/>`):html`<${GlassCard}><div class="note">Nothing was scheduled this day.</div><//>`}</div>`}
<div class="b-stack"><${Label}>By medication<//><${GlassCard} pad=${0}>${meds.map(x=>html`<div key=${x.m.id} class="adh"><div class="adh__t"><b>${x.m.name} ${x.m.strength}</b><span>${x.r.taken} of ${x.r.total}</span></div><div class="adh__bar"><i style=${{width:Math.round(x.r.taken/x.r.total*100)+'%'}}></i></div><b class="adh__p">${Math.round(x.r.taken/x.r.total*100)}%</b></div>`)}<//></div></div>`}
<//></div>`;}

function SettingsHome(){const c=useC();const s=c.s;const bn=banners(s);
return html`<div class="screen"><${TopBar} variant="root" title="Settings"/><${Page}>
<div class="b-stack" style=${{gap:16}}>
${!s.lastExportAt&&s.meds.length>0&&html`<${Banner} title="Saved only on this phone" body="Export a backup so you never lose your list." action="Back up now" onAction=${()=>c.go('backup')}/>`}
<${GlassCard} pad=${0}>
<${ListRow} icon="sun" title="My day" sub="Wake up, meals and bedtime" onClick=${()=>c.go('myday')}/>
<${ListRow} icon="bell" title="Notifications" sub=${s.perms.notif?(s.settings.sound?'Sound':'Silent')+(s.settings.vibrate?' and vibration':''):'Off'} onClick=${()=>c.go('notifs')}/>
<${ListRow} icon="battery" title="Reminder reliability" sub=${bn.length?bn.length+' to fix':'All set'} trailing=${bn.length?html`<${Badge} tone="warning" icon="alert">Needs fix<//>`:html`<${Badge} tone="success" icon="check">Good<//>`} onClick=${()=>c.go('reliability')}/><//>
<${GlassCard} pad=${0}>
<${ListRow} icon="download" title="Backup and restore" sub=${s.lastExportAt?'Last backup '+s.lastExportAt:'Not backed up yet'} onClick=${()=>c.go('backup')}/>
<${ListRow} icon="moon" title="Appearance" sub=${s.settings.theme==='system'?'Follow system':s.settings.theme==='dawn'?'Dawn':'Dusk'} onClick=${()=>c.go('appearance')}/>
<${ListRow} icon="edit" title="Your name" sub=${s.name||'Not set'} onClick=${()=>c.go('name')}/>
<${ListRow} icon="info" title="About and privacy" sub="Free, private, on your phone" onClick=${()=>c.go('about')}/><//>
<${GlassCard} pad=${0}><${ListRow} icon="trash" tone="danger" title="Delete all my data" sub="Erases everything on this phone" onClick=${()=>c.go('wipe')}/><//></div><//></div>`;}

function MyDay(){const c=useC();const s=c.s;
const edit=(a)=>{const i=AIDX[a.key];const prev=i>0?s.anchorTimes[ANCHORS[i-1].key]:-1,next=i<4?s.anchorTimes[ANCHORS[i+1].key]:1440;
c.sheet('time',{title:a.label+' time',value:s.anchorTimes[a.key],note:'Reminders for '+a.label.toLowerCase()+' follow this time.',validate:(v)=>v<=prev?a.label+' must be after '+ALABEL[ANCHORS[i-1].key]:v>=next?a.label+' must be before '+ALABEL[ANCHORS[i+1].key]:'',onSave:(v)=>c.act.setAnchor(a.key,v)});};
return html`<div class="screen"><${Hdr} title="My day"/><${Page}><div class="note" style=${{margin:"4px 4px 12px"}}>Tap a time to change it.</div><${GlassCard} pad=${0}>${ANCHORS.map(a=>html`<div key=${a.key} class="arow" data-tone=${a.key}><span class="arow__ic"><${Icon} name=${B.ANCHOR_ICON[a.key]} size=${22}/></span><b>${a.label}</b><${Chip} variant="time" onClick=${()=>edit(a)}>${fmt(s.anchorTimes[a.key])}<//></div>`)}<//>
<div class="note" style=${{marginTop:12}}>Changes apply from the next reminder. Doses already taken stay as recorded.</div><//></div>`;}

function Notifs(){const c=useC();const s=c.s,st=s.settings;const set=(k,v)=>c.act.setSetting(k,v);
return html`<div class="screen"><${Hdr} title="Notifications"/><${Page}><div class="b-stack" style=${{gap:16}}>
${!s.perms.notif&&html`<${Banner} tone="danger" title="Notifications are off" body="Without them, Better cannot remind you." action="Turn on" onAction=${()=>c.act.fix('notif')}/>`}
<${GlassCard}><${Switch} label="Sound" checked=${st.sound} onChange=${(v)=>set('sound',v)}/><${Switch} label="Vibrate" checked=${st.vibrate} onChange=${(v)=>set('vibrate',v)}/><${Switch} label="One follow-up if I miss a dose" checked=${st.followup} onChange=${(v)=>set('followup',v)}/><${Switch} label="Low stock alerts" checked=${st.lowstock} onChange=${(v)=>set('lowstock',v)}/><${Switch} label="Show medicine names on lock screen" checked=${st.showNames} onChange=${(v)=>set('showNames',v)}/><//>
<${GlassCard}><${Label}>Snooze length<//><div class="b-row" style=${{marginTop:12}}>${[5,10,15,30].map(n=>html`<${Chip} key=${n} selected=${st.snooze===n} onClick=${()=>set('snooze',n)}>${n} min<//>`)}</div><//>
<${Button} full variant="secondary" onClick=${()=>c.act.testNotif()}>Send a test reminder<//></div><//></div>`;}

const CHECKS=[{key:'notif',icon:'bell',title:'Notifications',good:'Allowed',bad:'Turned off'},{key:'exact',icon:'clock',title:'Exact alarms',good:'Allowed',bad:'Not allowed'},{key:'battery',icon:'battery',title:'Battery optimisation',good:'Unrestricted',bad:'Restricted'},{key:'autostart',icon:'sun',title:'Autostart',good:'Allowed',bad:'Blocked',note:'Needed on Tecno, Infinix, Xiaomi and Samsung'},{key:'dnd',icon:'moon',title:'Do Not Disturb',good:'Not blocking',bad:'Blocking'}];
function Reliability({list}){const c=useC();const s=c.s;const items=list?CHECKS.filter(x=>list.includes(x.key)):CHECKS;const bad=items.filter(x=>!s.perms[x.key]).length;
return html`<div class="b-stack"><${Banner} tone=${bad?'warning':'success'} title=${bad?bad+' thing'+(bad>1?'s':'')+' to fix':'All set'} body=${bad?'Fix these so reminders arrive on time.':'Reminders will arrive on time.'}/>
<${GlassCard} pad=${0}>${items.map(x=>html`<div key=${x.key} class="chk"><span class="chk__ic"><${Icon} name=${x.icon} size=${22}/></span><div class="chk__t"><b>${x.title}</b><span>${s.perms[x.key]?x.good:x.bad}${x.note&&!s.perms[x.key]?' · '+x.note:''}</span></div>${s.perms[x.key]?html`<${Badge} tone="success" icon="check">Good<//>`:html`<${Button} variant="secondary" onClick=${()=>c.act.fix(x.key)}>Fix<//>`}</div>`)}<//></div>`;}
function ReliabilityScreen(){return html`<div class="screen"><${Hdr} title="Reminder reliability"/><${Page}><div class="note" style=${{margin:"4px 4px 12px"}}>Checked every time you open this.</div><${Reliability}/><//></div>`;}

const SYS={notif:{t:'Better · Notifications',l:'Allow notifications'},exact:{t:'Alarms & reminders',l:'Allow setting alarms and reminders'},battery:{t:'Better · Battery',l:'Unrestricted'},autostart:{t:'Autostart',l:'Allow Better to start itself'},dnd:{t:'Do Not Disturb',l:'Let Better break through'}};
function SysSheet({p}){const c=useC();const [on,setOn]=useState(!!c.s.perms[p.key]);const x=SYS[p.key];
return html`<${Sheet} title=${x.t} onClose=${c.closeSheet} actions=${[html`<${Button} key="a" full onClick=${()=>{c.act.setPerm(p.key,on);c.closeSheet();}}>Back to Better<//>`]}><div class="note">This is a stand-in for the Android settings screen the Fix button opens.</div><${Switch} label=${x.l} checked=${on} onChange=${setOn}/><//>`;}

function Backup(){const c=useC();const s=c.s;const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [err,setErr]=useState(false);const fi=useRef();
const exp=async()=>{setBusy(true);setDone(false);try{await c.act.exportBackup();setDone(true);}catch(e){c.toast('Could not save the backup');}setBusy(false);};
const pick=(e)=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(String(r.result));if(!(j&&j.app==='Better'&&j.state&&Array.isArray(j.state.meds)))throw 0;setErr(false);c.sheet('restore',{data:j});}catch(x){setErr(true);}};r.onerror=()=>setErr(true);r.readAsText(f);};
return html`<div class="screen"><${Hdr} title="Backup and restore"/><${Page}><div class="b-stack" style=${{gap:16}}>
<${Banner} title="Your data lives only on this phone" body="A backup is one file you keep. Better never uploads it."/>
${done&&html`<${Banner} tone="success" title="Backup ready" body="Choose where to keep Better-backup.json."/>`}
${err&&html`<${Banner} tone="danger" title="That is not a Better backup" body="Nothing was changed. Choose a file named Better-backup."/>`}
<${GlassCard}><div class="b-stack"><b>Export a backup</b><div class="note">${s.lastExportAt?'Last backup '+s.lastExportAt+'.':'No backup yet.'} Saves ${s.meds.filter(m=>!m.deleted).length} medications and your history.</div><${Button} full icon="download" loading=${busy} onClick=${exp}>${busy?'Saving':'Export backup'}<//></div><//>
<${GlassCard}><div class="b-stack"><b>Restore from a backup</b><div class="note">This replaces everything on this phone with the file you choose.</div><input ref=${fi} type="file" accept="application/json,.json,text/plain" style=${{display:'none'}} onChange=${pick}/><${Button} full variant="secondary" icon="upload" onClick=${()=>fi.current&&fi.current.click()}>Choose a backup file<//></div><//></div><//></div>`;}
function FilePick(){return null;}
function RestoreSheet({p}){const c=useC();const st=p.data.state;const n=st.meds.filter(m=>!m.deleted).length;const days=new Set(Object.keys(st.doses||{}).map(k=>k.split('|')[0])).size;
return html`<${Sheet} title="Replace everything?" onClose=${c.closeSheet} actions=${[html`<${Button} key="r" full variant="danger" onClick=${()=>{c.act.restore(p.data);c.closeSheet();}}>Replace with this backup<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}><div class="note">This backup has ${n} medication${n===1?'':'s'} and ${days} day${days===1?'':'s'} of history. Everything now on this phone will be replaced.</div><//>`;}

function Appearance(){const c=useC();const t=c.s.settings.theme;const o=[['system','Follow system','Matches your phone'],['dawn','Dawn','Light, peach and pink'],['dusk','Dusk','Dark, plum']];
return html`<div class="screen"><${Hdr} title="Appearance"/><${Page}><${GlassCard} pad=${0}>${o.map(([k,a,b])=>html`<${ListRow} key=${k} icon=${k==='dusk'?'moon':'sun'} title=${a} sub=${b} trailing=${t===k?html`<${Icon} name="check" size=${22}/>`:null} chevron=${false} onClick=${()=>c.act.setSetting('theme',k)}/>`)}<//><//></div>`;}
function About(){return html`<div class="screen"><${Hdr} title="About and privacy"/><${Page}><div class="b-stack" style=${{gap:16}}><${GlassCard}><div class="b-stack"><b class="h2">Better</b><div class="note">Version 1.0</div><p class="p" style=${{textAlign:'left'}}>Better is free for everyone, forever. There is no account, no ads, and nothing about your health leaves your phone.</p></div><//>
<${GlassCard}><div class="b-stack"><b>What is stored</b><div class="note">Your name, your medications, your times and what you took. It lives in this app only. Export a backup to keep your own copy.</div></div><//>
<${Banner} title="Better does not give medical advice" body="It reminds you and keeps a record. Follow what your doctor or pharmacist told you."/></div><//></div>`;}
function NameScreen(){const c=useC();const [v,setV]=useState(c.s.name);return html`<div class="screen"><${Hdr} title="Your name"/><${Page}><${TextField} label="What should we call you?" value=${v} onChange=${setV} hint="Saved only on this phone."/><//><div class="foot"><${Button} full size="lg" disabled=${v.trim()===c.s.name} onClick=${()=>{c.act.setName(v.trim());c.back();}}>Save<//></div></div>`;}
function Wipe(){const c=useC();return html`<div class="screen"><${Hdr} title="Delete all my data"/><${Page}><div class="b-stack" style=${{gap:16}}><${Banner} tone="danger" title="This cannot be undone" body="Everything below is erased from this phone."/>
<${GlassCard}><ul class="ul"><li>All medications and their history</li><li>Your anchor times and your name</li><li>Every scheduled reminder</li></ul><//><${Button} full variant="danger" onClick=${()=>c.sheet('wipe')}>Delete all my data<//></div><//></div>`;}
function WipeSheet(){const c=useC();const [t,setT]=useState('');return html`<${Sheet} title="Type DELETE to confirm" onClose=${c.closeSheet} actions=${[html`<${Button} key="d" full variant="danger" disabled=${t!=='DELETE'} onClick=${()=>{c.closeSheet();c.act.wipe();}}>Erase everything<//>`,html`<${Button} key="c" full variant="ghost" onClick=${c.closeSheet}>Cancel<//>`]}><${TextField} label="Confirmation" value=${t} onChange=${setT} placeholder="DELETE"/><//>`;}

function AnchorRows(){const c=useC();const s=c.s;
const edit=(a)=>{const i=AIDX[a.key];const prev=i>0?s.anchorTimes[ANCHORS[i-1].key]:-1,next=i<4?s.anchorTimes[ANCHORS[i+1].key]:1440;
c.sheet('time',{title:a.label+' time',value:s.anchorTimes[a.key],note:'Reminders follow this time.',validate:(v)=>v<=prev?a.label+' must be after '+ALABEL[ANCHORS[i-1].key]:v>=next?a.label+' must be before '+ALABEL[ANCHORS[i+1].key]:'',onSave:(v)=>c.act.setAnchor(a.key,v)});};
return html`<${GlassCard} pad=${0}>${ANCHORS.map(a=>html`<div key=${a.key} class="arow" data-tone=${a.key}><span class="arow__ic"><${Icon} name=${B.ANCHOR_ICON[a.key]} size=${22}/></span><b>${a.label}</b><${Chip} variant="time" onClick=${()=>edit(a)}>${fmt(s.anchorTimes[a.key])}<//></div>`)}<//>`;}

const OBBACK={A3:'A2',A4:'A3',A5:'A4',A6:'A5',A7:'A6'};
function Onboarding(){const c=useC();const s=c.s;const ob=c.nav.ob;const [nm,setNm]=useState(s.name);
useEffect(()=>{if(ob!=='A1')return;const t=setTimeout(()=>c.setOb('A2'),1800);return ()=>clearTimeout(t);},[ob]);
if(ob==='A1')return html`<div class="screen splash" onClick=${()=>c.setOb('A2')}><div class="logo"><${DoseCircle} taken=${2} total=${3} size=${104}/></div><h1 class="display">Better</h1><p>Reminders that follow your day, not the clock.</p></div>`;
const back=OBBACK[ob];const step=['A3','A4','A5','A6','A7'].indexOf(ob);
const head=back?html`<${TopBar} leading="back" onLeading=${()=>c.setOb(back)}><div class="dots">${[0,1,2,3,4].map(i=>html`<i key=${i} class=${i<=step?"on":""}/>`)}</div><//>`:null;
let body,foot;
if(ob==='A2'){body=html`<div class="center" style=${{justifyContent:'flex-start',paddingTop:48}}><h1 class="display xl">Take your meds on time.</h1><p class="p">Reminders that follow your day, not the clock.</p>
<div class="stackcards">${[['breakfast','Breakfast','8:00 am · 3 meds',-3],['lunch','Lunch','1:00 pm · 1 med',2],['bedtime','Bedtime','10:30 pm · 2 meds',-2]].map(([a,l,t,r])=>html`<div key=${a} class="b-glass tilt" data-tone=${a} style=${{transform:'rotate('+r+'deg)'}}><span class="tilt__m"><${Icon} name=${B.ANCHOR_ICON[a]} size=${22}/></span><div><b>${l}</b><div class="note">${t}</div></div></div>`)}</div></div>`;
foot=html`<div class="b-stack"><${Button} full size="lg" onClick=${()=>c.setOb('A3')}>Get started<//><div class="note" style=${{textAlign:'center'}}>Free. No account. Saved only on this phone.</div></div>`;}
if(ob==='A3'){body=html`<div class="fstack"><div class="stephead"><h2 class="h2">What should we call you?</h2><p class="sub">Just your first name. It stays on this phone.</p></div><${TextField} ariaLabel="First name" placeholder="First name" value=${nm} onChange=${setNm}/></div>`;
foot=html`<div class="b-stack"><${Button} full size="lg" disabled=${!nm.trim()} onClick=${()=>{c.act.setName(nm.trim());c.setOb('A4');}}>Continue<//><${Button} full variant="ghost" onClick=${()=>{c.act.setName('');c.setOb('A4');}}>Skip<//></div>`;}
if(ob==='A4'){body=html`<div class="fstack"><div class="stephead"><h2 class="h2">Set your daily times</h2><p class="sub">We will remind you at these times. You can change them later.</p></div><${AnchorRows}/></div>`;foot=html`<${Button} full size="lg" onClick=${()=>c.setOb('A5')}>Continue<//>`;}
if(ob==='A5'){const asked=s.notifAsked;body=html`<div class="center"><div class="bigcheck" style=${{background:'var(--glass-strong)',color:'var(--ink)',border:'1px solid var(--line)'}}><${Icon} name="bell" size=${44}/></div><h2 class="h2">Let Better remind you</h2><p class="p">Reminders arrive as notifications. Without them, Better cannot tell you it is time.</p>
${s.perms.notif?html`<${Banner} tone="success" title="Reminders are on"/>`:asked>0?html`<${Banner} tone="danger" title="Notifications are off" body=${asked>1?'Android will not ask again. Turn them on in system settings.':'You can try again, or turn them on in system settings.'}/>`:null}</div>`;
foot=s.perms.notif?html`<${Button} full size="lg" onClick=${()=>c.setOb('A6')}>Continue<//>`:html`<div class="b-stack"><${Button} full size="lg" onClick=${()=>c.act.askNotif()}>${asked>1?'Open system settings':asked>0?'Try again':'Allow reminders'}<//>${asked>0&&html`<${Button} full variant="ghost" onClick=${()=>c.setOb('A6')}>Continue anyway<//>`}</div>`;}
if(ob==='A6'){const ok=['exact','battery','autostart'].every(k=>s.perms[k]);body=html`<div class="fstack"><div class="stephead"><h2 class="h2">Make reminders reliable</h2><p class="sub">Some phones close apps in the background. Check these so every reminder arrives.</p></div><${Reliability} list=${['exact','battery','autostart']}/></div>`;foot=html`<${Button} full size="lg" variant=${ok?'primary':'secondary'} onClick=${()=>c.setOb('A7')}>${ok?'Continue':'Skip for now'}<//>`;}
if(ob==='A7'){body=html`<div class="center"><div class="bigcheck" style=${{background:'var(--glass-strong)',color:'var(--ink)',border:'1px solid var(--line)'}}><${Icon} name="pill" size=${44}/></div><h2 class="h2">Add your first medication</h2><p class="p">It takes about 30 seconds. You can add more any time.</p></div>`;
foot=html`<div class="b-stack"><${Button} full size="lg" onClick=${()=>c.go('add')}>Add medication<//><${Button} full variant="ghost" onClick=${()=>c.setOb('A8')}>I will do this later<//></div>`;}
if(ob==='A8'){const first=firstReminder(s);body=html`<div class="center"><div class="bigcheck" style=${{background:'var(--glass-strong)',color:'var(--ink)',border:'1px solid var(--line)'}}><${Icon} name="check" size=${44}/></div><h2 class="h2">${first?'First reminder set':'You are all set'}</h2>
${first?html`<div class="b-glass b-stack" style=${{width:'100%',textAlign:'center'}}><div class="note">${first.when}</div><div class="numeral">${ALABEL[first.anchor]} · ${fmt(first.time)}</div><div class="note">${first.names}</div></div>`:html`<p class="p">Add medications from the plus button any time.</p>`}<p class="p">Saved only on this phone.</p></div>`;
foot=html`<div class="b-stack">${first&&html`<${Button} full variant="secondary" onClick=${()=>c.act.testNotif()}>Send a test reminder<//>`}<${Button} full size="lg" onClick=${()=>c.act.finishOb()}>Go to Today<//></div>`;}
return html`<div class="screen">${head}<${Page} pad=${24}>${body}<//><div class="foot">${foot}</div></div>`;}
function firstReminder(s){const live=s.meds.filter(m=>!m.deleted);if(!live.length)return null;
for(let off=0;off<2;off++){const k=dk(addDays(TODAY,off));const ds=dosesFor(s,k);for(const a of ANCHORS){const g=ds.filter(d=>d.anchor===a.key);if(!g.length)continue;const t=eff(s,k,a.key);if(off===0&&t<=s.now)continue;return {anchor:a.key,time:t,when:off?'Tomorrow':'Today',names:g.map(d=>d.med.name+' '+d.med.strength).join(', ')};}}return null;}

function NotifCard({n}){const c=useC();const s=c.s;const nb=nextBlock(s);const names=s.settings.showNames;
let title,body,acts=[];
if(n.kind==='dose'&&nb){title='Time for '+ALABEL[nb.anchor].toLowerCase();body=names?nb.items.map(i=>i.d.med.name).join(', '):nb.items.length+' medication'+(nb.items.length>1?'s':'')+' · '+fmt(nb.time);acts=[['Take all',()=>c.act.takeBlock(nb.anchor)],['Snooze',()=>c.act.snooze(nb.anchor)]];}
else if(n.kind==='followup'&&nb){title=names?'Still need to take '+nb.items[0].d.med.name+'?':'Still need to take your '+ALABEL[nb.anchor].toLowerCase()+' meds?';body='Tap to open Today';acts=[['Take',()=>c.act.takeBlock(nb.anchor)]];}
else if(n.kind==='low'){const m=s.meds.filter(x=>!x.deleted&&stockInfo(x)&&(stockInfo(x).low||stockInfo(x).out))[0]||s.meds[0];title=(m?m.name:'Your medicine')+(m&&m.pills<=0?' is out of pills':' is running low');body=m?m.pills+' left · about '+Math.max(0,daysLeft(m))+' days':'';acts=[['Refill',()=>c.sheet('refill',{id:m&&m.id})]];}
else if(n.kind==='reliab'){title='Reminders may be late';body='Better lost a setting. Tap to fix.';}
else if(n.kind==='test'){title='Test reminder';body='Reminders are working on this phone.';}
else{title='Nothing due';body='All doses are taken or missed for now.';}
const open=()=>{c.setNotif(null);if(n.kind==='reliab'){c.go('reliability');}else if(n.kind==='low'){c.tab('meds');}else{c.tab('today');c.setUi({sel:todayKey,tab:'up'});}};
return html`<div class="ncard" role="alert"><div class="ncard__h"><span class="ncard__app"><${Icon} name="pill" size=${14}/> Better · now</span><button type="button" aria-label="Dismiss" onClick=${()=>c.setNotif(null)}><${Icon} name="close" size=${16}/></button></div><button type="button" class="ncard__b" onClick=${open}><b>${title}</b><span>${body}</span></button>${acts.length?html`<div class="ncard__a">${acts.map(([l,f])=>html`<button key=${l} type="button" onClick=${()=>{f();c.setNotif(null);}}>${l}</button>`)}</div>`:null}</div>`;}

function App(){
const [s,setSS]=useState(loadState);const setS=(f)=>setSS(p=>typeof f==='function'?f(p):f);
useEffect(()=>{saveState(s);},[s]);
const [nav,setNav]=useState({tab:'today',stack:[],ob:'A1'});
const [ui,setUiS]=useState({sel:todayKey,tab:'up',wk:0,hr:'week',hsel:null});
const setUi=(p)=>setUiS(x=>({...x,...p}));
const [sheetS,setSheet]=useState(null);const [toastS,setToastS]=useState(null);const [draft,setDraftS]=useState(blankDraft);const [notif,setNotif]=useState(null);const [drawer,setDrawer]=useState(false);
const setDraft=(p)=>setDraftS(x=>({...x,...p}));
const tref=useRef();
const toast=(msg,action,onAction)=>{clearTimeout(tref.current);const id=Math.random();setToastS({msg,action,onAction,id});tref.current=setTimeout(()=>setToastS(x=>x&&x.id===id?null:x),action?5000:3000);};
const go=(id,params)=>{if(id==='add')setDraftS(blankDraft());setSheet(null);setNav(n=>({...n,stack:[...n.stack,{id,params:params||{}}]}));};
const back=()=>setNav(n=>({...n,stack:n.stack.slice(0,-1)}));
const tab=(t)=>{setNav(n=>({...n,tab:t,stack:[]}));setSheet(null);};
const sheet=(id,params)=>setSheet({id,params:params||{}});const closeSheet=()=>setSheet(null);
const setOb=(o)=>{setNav(n=>({...n,ob:o}));setSheet(null);};
const exitAdd=()=>setNav(n=>({...n,stack:n.stack.filter(x=>x.id!=='add')}));
useEffect(()=>{const h=(e)=>{if(e.key==='Escape')setSheet(null);};window.addEventListener('keydown',h);return ()=>window.removeEventListener('keydown',h);},[]);

const undoKeys=(keys)=>setS(p=>{let doses={...p.doses},meds=p.meds;keys.forEach(k=>{const r=doses[k];if(!r)return;if(r.status==='taken'){const id=k.split('|')[1];meds=meds.map(m=>m.id===id&&m.pills!=null?{...m,pills:m.pills+1}:m);}delete doses[k];});return {...p,doses,meds};});
const markTaken=(p,d,at)=>{const was=p.doses[d.key]&&p.doses[d.key].status==='taken';return {...p,doses:{...p.doses,[d.key]:{status:'taken',at}},meds:was?p.meds:p.meds.map(m=>m.id===d.med.id&&m.pills!=null&&m.pills>0?{...m,pills:m.pills-1}:m)};};
const setPerm=(k,v)=>{setS(p=>({...p,perms:{...p.perms,[k]:v},notifAsked:k==='notif'&&v?0:p.notifAsked}));};
const act={
take:(d)=>{setS(p=>markTaken(p,d,p.now));toast(d.med.name+' taken','Undo',()=>undoKeys([d.key]));},
takeBlock:(a)=>{let keys=[];setS(p=>{let q=p;dosesFor(p,todayKey).filter(d=>d.anchor===a).forEach(d=>{const st=statusOf(p,todayKey,d);if(st==='taken'||st==='skipped')return;keys.push(d.key);q=markTaken(q,d,p.now);});return q;});setTimeout(()=>toast(ALABEL[a]+' taken','Undo',()=>undoKeys(keys)),0);},
takeAt:(d,k,at)=>{setS(p=>{const was=p.doses[d.key];let q=markTaken(p,d,at);if(was&&was.status==='taken')q={...q,meds:p.meds};return q;});toast('Saved at '+fmt(at));},
skip:(d,k,reason)=>{setS(p=>({...p,doses:{...p.doses,[d.key]:{status:'skipped',reason}}}));toast(d.med.name+' skipped');},
undo:(key)=>{undoKeys([key]);toast('Marked as not taken');},
snooze:(a)=>{setS(p=>{const cur=p.snoozes[todayKey+'|'+a]||{count:0};if(cur.count>=3){return p;}return {...p,snoozes:{...p.snoozes,[todayKey+'|'+a]:{count:cur.count+1,until:p.now+p.settings.snooze}}};});
const cur=s.snoozes[todayKey+'|'+a]||{count:0};if(cur.count>=3)toast('No more snoozes for '+ALABEL[a].toLowerCase()+' today');else toast('Snoozed '+s.settings.snooze+' min · '+(3-cur.count-1)+' left');},
late:(a,t)=>{setS(p=>({...p,overrides:{...p.overrides,[todayKey+'|'+a]:t},snoozes:{...p.snoozes,[todayKey+'|'+a]:undefined}}));toast(ALABEL[a]+' moved to '+fmt(t)+' today');},
addMed:(dr)=>{const id='m'+Date.now();const strength=(!dr.item||dr.other||!dr.item.strengths.length)?dr.strength.trim():dr.strength;
const m={id,name:dr.name.trim(),strength,anchors:dr.anchors,days:dr.days,start:todayKey,end:dr.course?dk(addDays(TODAY,dr.courseDays-1)):null,pausedUntil:null,stoppedOn:null,pills:dr.pillsOn?dr.pills:null,lowAt:dr.lowAt};
setS(p=>({...p,meds:[...p.meds,m]}));setDraft({step:5,saved:{name:m.name,text:anchorsText(m)+(strength?' · '+strength:'')}});},
afterAdd:(another)=>{if(another){setDraftS(blankDraft());return;}exitAdd();setNav(n=>({...n,tab:'today'}));if(!s.onboarded)setNav(n=>({...n,ob:'A8'}));else toast('Medication added');},
editMed:(id,patch)=>{setS(p=>({...p,meds:p.meds.map(m=>m.id===id?{...m,...patch}:m)}));if(patch.name!=null)toast('Saved');},
deleteMed:(id)=>{setS(p=>{const doses={};Object.keys(p.doses).forEach(k=>{if(k.split('|')[1]!==id)doses[k]=p.doses[k];});return {...p,doses,meds:p.meds.map(m=>m.id===id?{...m,deleted:true}:m)};});toast('Medication deleted');},
setAnchor:(k,v)=>{setS(p=>({...p,anchorTimes:{...p.anchorTimes,[k]:v}}));toast('Saved. Reminders updated');},
setSetting:(k,v)=>setS(p=>({...p,settings:{...p.settings,[k]:v}})),
setPerm:(k,v)=>{setS(p=>({...p,perms:{...p.perms,[k]:v},notifAsked:k==='notif'&&v?0:p.notifAsked}));},
setName:(n)=>setS(p=>({...p,name:n})),
markExport:()=>setS(p=>({...p,lastExportAt:MON[TODAY.getMonth()]+' '+TODAY.getDate()})),
restore:(data)=>{setS(p=>({...makeState('fresh'),...data.state,onboarded:true,perms:p.perms,notifAsked:p.notifAsked,now:realNow(),lastNotified:undefined,lowNotified:{}}));setNav({tab:'today',stack:[],ob:'A1'});toast('Backup restored. Reminders rescheduled');},
exportBackup:async()=>{const st={...s};delete st.now;delete st.perms;delete st.notifAsked;const name='Better-backup-'+todayKey+'.json';await NativeIO.exportFile(name,JSON.stringify({app:'Better',v:1,at:new Date().toISOString(),state:st}));setS(p=>({...p,lastExportAt:MON[TODAY.getMonth()]+' '+TODAY.getDate()}));},
askNotif:async()=>{const ok=await NativeIO.requestNotif();if(ok)setPerm('notif',true);else{setS(p=>({...p,perms:{...p.perms,notif:false},notifAsked:p.notifAsked+1}));if(s.notifAsked>=1)NativeIO.open('notif');}},
fix:async(key)=>{await NativeIO.open(key);if(key==='autostart'||key==='dnd')setPerm(key,true);},
wipe:()=>{setSS(makeState('fresh'));setNav({tab:'today',stack:[],ob:'A1'});setUiS({sel:todayKey,tab:'up',wk:0,hr:'week',hsel:null});},
finishOb:()=>{setS(p=>({...p,onboarded:true}));setNav(n=>({...n,tab:'today',stack:[]}));},
testNotif:async()=>{if(!s.perms.notif){toast('Notifications are off. Turn them on first.');return;}const ok=await NativeIO.test();toast(ok?'Test reminder coming in a few seconds':'Could not send a test reminder');}
};
const ctx={s,setS,nav,ui,setUi,sheet,closeSheet,go,back,tab,toast,draft,setDraft,exitAdd,setOb,act,setNotif};

// theme
const [sysDark,setSysDark]=useState(false);
useEffect(()=>{const mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');const f=()=>{const t=document.documentElement.getAttribute('data-theme');setSysDark(t==='dark'||(t!=='light'&&!!(mq&&mq.matches)));};f();if(mq&&mq.addEventListener)mq.addEventListener('change',f);const ob=new MutationObserver(f);ob.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return ()=>{ob.disconnect();if(mq&&mq.removeEventListener)mq.removeEventListener('change',f);};},[]);
const theme=s.settings.theme==='system'?(sysDark?'dusk':'dawn'):s.settings.theme;

// screens
const top=nav.stack[nav.stack.length-1];
let screen;
if(top){const P=top.params;const M={add:AddFlow,med:MedDetail,edit:EditMed};
screen=top.id==='add'?html`<${AddFlow}/>`:top.id==='med'?html`<${MedDetail} p=${P}/>`:top.id==='edit'?html`<${EditMed} p=${P}/>`:top.id==='myday'?html`<${MyDay}/>`:top.id==='notifs'?html`<${Notifs}/>`:top.id==='reliability'?html`<${ReliabilityScreen}/>`:top.id==='backup'?html`<${Backup}/>`:top.id==='appearance'?html`<${Appearance}/>`:top.id==='name'?html`<${NameScreen}/>`:top.id==='about'?html`<${About}/>`:top.id==='wipe'?html`<${Wipe}/>`:null;}
else if(!s.onboarded)screen=html`<${Onboarding}/>`;
else screen=nav.tab==='today'?html`<${Today}/>`:nav.tab==='history'?html`<${History}/>`:nav.tab==='meds'?html`<${MedsTab}/>`:html`<${SettingsHome}/>`;
const showNav=!top&&s.onboarded;
let sh=null;if(sheetS){const p=sheetS.params;const m={dose:DoseSheet,late:LateSheet,logLate:LogLateSheet,time:TimeSheet,dup:DupSheet,pause:PauseSheet,delete:DeleteSheet,refill:RefillSheet,sys:SysSheet,filepick:FilePick,restore:RestoreSheet,wipe:WipeSheet,discard:DiscardSheet};
if(sheetS.id==='sysnotif')sh=html`<${Sheet} title="Allow Better to send you notifications?" onClose=${closeSheet} actions=${[html`<${Button} key="a" full onClick=${()=>{act.setPerm('notif',true);closeSheet();}}>Allow<//>`,html`<${Button} key="b" full variant="secondary" onClick=${()=>{setS(p=>({...p,notifAsked:p.notifAsked+1}));closeSheet();}}>Don’t allow<//>`]}><div class="note">This is a stand-in for the Android permission dialog.</div><//>`;
else{const C=m[sheetS.id];sh=html`<${C} key=${sheetS.id+JSON.stringify(p)} p=${p}/>`;}}
/* ---- production shell ---- */
const stateRef=useRef();stateRef.current={nav,sheetS,ctx,s};
useEffect(()=>{ // real clock + day rollover
  const tick=()=>{if(dk(new Date())!==todayKey){location.reload();return;}const n=realNow();setSS(p=>p.now===n?p:{...p,now:n});};
  const iv=setInterval(tick,15000);document.addEventListener('visibilitychange',tick);tick();
  return ()=>{clearInterval(iv);document.removeEventListener('visibilitychange',tick);};
},[]);
useEffect(()=>{ // native setup, permissions, listeners
  if(!NATIVE)return;let subs=[];let dead=false;
  (async()=>{
    await setupNative();
    const refresh=async()=>{const p=await nativePerms();if(p&&!dead)setS(q=>({...q,perms:{...q.perms,...p}}));};
    refresh();
    const APP=PL('App'),LN=PL('LocalNotifications');
    if(APP){
      subs.push(await APP.addListener('appStateChange',(st)=>{if(st.isActive)refresh();}));
      subs.push(await APP.addListener('backButton',()=>{const r=stateRef.current;const c=r.ctx;
        if(r.sheetS){c.closeSheet();return;}
        if(r.nav.stack.length){const top=r.nav.stack[r.nav.stack.length-1];if(top.id==='add'&&r.ctx.draft&&r.ctx.draft.step>1){c.setDraft({step:r.ctx.draft.step-1});return;}c.back();return;}
        if(!r.s.onboarded){const B={A3:'A2',A4:'A3',A5:'A4',A6:'A5',A7:'A6'};const cur=r.nav.ob;if(B[cur]){c.setOb(B[cur]);return;}APP.exitApp();return;}
        if(r.nav.tab!=='today'){c.tab('today');return;}
        APP.exitApp();}));
    }
    if(LN){
      subs.push(await LN.addListener('localNotificationActionPerformed',(ev)=>{
        const x=ev.notification&&ev.notification.extra||{};const c=stateRef.current.ctx;
        if(x.kind==='low'){c.tab('meds');return;}
        c.tab('today');c.setUi({sel:todayKey,tab:'up'});
        if(x.anchor&&ev.actionId==='take')c.act.takeBlock(x.anchor);
        if(x.anchor&&ev.actionId==='snooze')c.act.snooze(x.anchor);
      }));
    }
  })();
  return ()=>{dead=true;subs.forEach(h=>h&&h.remove&&h.remove());};
},[]);
const syncKey=JSON.stringify([s.meds,s.doses,s.anchorTimes,s.overrides,s.snoozes,s.settings,s.perms.notif,s.onboarded,s.lowNotified]);
useEffect(()=>{const t=setTimeout(()=>syncNotifications(s,setS),400);return ()=>clearTimeout(t);},[syncKey]);
useEffect(()=>{ // system bar icons + background follow the theme
  const SB=PL('SystemBars');if(SB)SB.setStyle({style:theme==='dusk'?'DARK':'LIGHT'}).catch(()=>{});
  const el=document.querySelector('.phone');if(el){const bg=getComputedStyle(el).backgroundColor;document.documentElement.style.background=bg;document.body.style.background=bg;
    const m=bg.match(/\d+/g);if(m){const hex='#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('');const BN=PL('BetterNative');if(BN&&BN.setBars)BN.setBars({color:hex,dark:theme==='dusk'}).catch(()=>{});}}
},[theme]);
return html`<${Ctx.Provider} value=${ctx}><div class="phone" data-theme=${theme}>
<div class="body">${screen}</div>
${showNav&&html`<div class="navwrap"><${NavPill} value=${nav.tab} onChange=${(t)=>{if(t==='today')setUi({sel:todayKey});tab(t);}} onAdd=${()=>go('add')} items=${[{key:'today',icon:'home',label:'Today'},{key:'meds',icon:'pill',label:'Meds'},{key:'history',icon:'chart',label:'History'},{key:'settings',icon:'gear',label:'Settings'}]}/></div>`}
${toastS&&html`<div class="toastwrap"><${Toast} message=${toastS.msg} action=${toastS.action} onAction=${()=>{toastS.onAction&&toastS.onAction();setToastS(null);}}/></div>`}
${sh}
</div><//>`;}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));

/* ---- Native layer (Android via Capacitor). All of this is a no-op in a plain browser. ---- */
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const PL=(n)=>NATIVE?window.Capacitor.Plugins[n]:null;
const realNow=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
const CHAN=(st)=>'doses-'+(st.sound?'s':'')+(st.vibrate?'v':'')+(!st.sound&&!st.vibrate?'n':'');
const dayNum=(k)=>Math.round(fromKey(k).getTime()/86400000)-18262; /* days since 2020-01-01 */
const NT={wake:'your wake-up meds',breakfast:'breakfast',lunch:'lunch',dinner:'dinner',bedtime:'your bedtime meds'};
const nid=(k,a,kind)=>(dayNum(k)*10+AIDX[a])*10+kind; /* kind: 1 dose, 2 follow-up, 3 snooze */
async function setupNative(){
  const LN=PL('LocalNotifications');if(!LN)return;
  try{
    for(const sound of [true,false])for(const vibrate of [true,false]){
      const id=CHAN({sound,vibrate});
      await LN.createChannel({id,name:'Dose reminders'+(sound?'':' (silent)')+(vibrate?'':' (no vibration)'),description:'Reminders to take your medication',importance:sound?5:(vibrate?4:2),visibility:0,vibration:vibrate,lights:true,...(sound?{sound:'chime.wav'}:{})});
    }
    await LN.createChannel({id:'stock',name:'Low stock',description:'Heads-up before pills run out',importance:3,visibility:0,vibration:false});
    await LN.registerActionTypes({types:[{id:'DOSE',actions:[{id:'take',title:'Take all'},{id:'snooze',title:'Snooze'}]},{id:'PLAIN',actions:[]}]});
  }catch(e){}
}
async function nativePerms(){
  if(!NATIVE)return null;const out={};
  try{const p=await PL('LocalNotifications').checkPermissions();out.notif=p.display==='granted';}catch(e){}
  try{const p=await PL('LocalNotifications').checkExactNotificationSetting();out.exact=p.exact_alarm==='granted';}catch(e){}
  try{const p=await PL('BetterNative').batteryStatus();out.battery=!!p.unrestricted;}catch(e){}
  return out;
}
async function syncNotifications(s,setS){
  const LN=PL('LocalNotifications');if(!LN)return;
  try{
    const perm=await LN.checkPermissions();
    const pend=(await LN.getPending()).notifications||[];
    if(pend.length)await LN.cancel({notifications:pend.map(n=>({id:n.id}))});
    if(perm.display!=='granted')return;
    const now=new Date(),nowMin=realNow(),st=s.settings,ch=CHAN(st),out=[];
    const at=(k,m)=>{const d=fromKey(k);d.setMinutes(m);return d;};
    for(let off=0;off<14;off++){
      const k=dk(addDays(TODAY,off));
      const ds=dosesFor(s,k);
      ANCHORS.forEach(a=>{
        const g=ds.filter(d=>d.anchor===a.key);if(!g.length)return;
        const pendingDoses=g.filter(d=>{const x=statusOf(s,k,d);return x!=='taken'&&x!=='skipped'&&x!=='missed';});
        if(!pendingDoses.length)return;
        const t=eff(s,k,a.key),when=at(k,t);
        const names=pendingDoses.map(d=>d.med.name).join(', ');
        if(when>now)out.push({id:nid(k,a.key,1),title:'Time for '+NT[a.key],body:st.showNames?names:g.length+' medication'+(g.length>1?'s':'')+' · '+fmt(t),channelId:ch,smallIcon:'ic_stat_better',actionTypeId:'DOSE',schedule:{at:when,allowWhileIdle:true},extra:{anchor:a.key,kind:'dose'}});
        if(st.followup){const fw=at(k,t+30);if(fw>now)out.push({id:nid(k,a.key,2),title:st.showNames?'Still need to take '+pendingDoses[0].med.name+'?':'Still need to take '+(a.key==='wake'||a.key==='bedtime'?NT[a.key]:'your '+NT[a.key]+' meds')+'?',body:'Tap to open Today',channelId:ch,smallIcon:'ic_stat_better',actionTypeId:'DOSE',schedule:{at:fw,allowWhileIdle:true},extra:{anchor:a.key,kind:'followup'}});}
        const sn=s.snoozes[k+'|'+a.key];if(k===todayKey&&sn&&sn.until>nowMin){const sw=at(k,sn.until);out.push({id:nid(k,a.key,3),title:'Time for '+NT[a.key],body:st.showNames?names:g.length+' medication'+(g.length>1?'s':''),channelId:ch,smallIcon:'ic_stat_better',actionTypeId:'DOSE',schedule:{at:sw,allowWhileIdle:true},extra:{anchor:a.key,kind:'dose'}});}
      });
    }
    /* low stock, once per medicine until it is refilled */
    const notified={...(s.lowNotified||{})};let changed=false;
    s.meds.filter(m=>!m.deleted).forEach(m=>{
      const si=stockInfo(m),low=si&&(si.low||si.out);
      if(low&&st.lowstock&&!notified[m.id]){
        const w=new Date();w.setHours(9,0,0,0);if(w<=now)w.setTime(now.getTime()+60000);
        out.push({id:900000+(hash(m.id)%90000),title:m.pills<=0?m.name+' is out of pills':m.name+' is running low',body:m.pills<=0?'Refill soon so you never miss a dose.':m.pills+' left · about '+Math.max(0,daysLeft(m))+' days',channelId:'stock',smallIcon:'ic_stat_better',schedule:{at:w,allowWhileIdle:false},extra:{kind:'low',id:m.id}});
        notified[m.id]=true;changed=true;
      }else if(!low&&notified[m.id]){delete notified[m.id];changed=true;}
    });
    if(out.length)await LN.schedule({notifications:out});
    if(changed&&setS)setS(p=>({...p,lowNotified:notified}));
  }catch(e){}
}
const NativeIO={
  async requestNotif(){const LN=PL('LocalNotifications');if(!LN)return true;try{const r=await LN.requestPermissions();return r.display==='granted';}catch(e){return false;}},
  async open(key){
    const BN=PL('BetterNative'),LN=PL('LocalNotifications');
    try{if(key==='exact'&&LN){await LN.changeExactNotificationSetting();return;}}catch(e){}
    try{if(BN)await BN.openSetting({key});}catch(e){}
  },
  async test(){
    const LN=PL('LocalNotifications');if(!LN)return false;
    try{await LN.schedule({notifications:[{id:1,title:'Test reminder',body:'Reminders are working on this phone.',channelId:CHAN(loadStateSettings()),smallIcon:'ic_stat_better',actionTypeId:'PLAIN',schedule:{at:new Date(Date.now()+3000),allowWhileIdle:true}}]});return true;}catch(e){return false;}
  },
  async exportFile(name,text){
    const FS=PL('Filesystem'),SH=PL('Share');
    const r=await FS.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});
    await SH.share({title:'Better backup',dialogTitle:'Save your backup',files:[r.uri]});
  }
};
function loadStateSettings(){try{const j=JSON.parse(localStorage.getItem(KEY)||'{}');return j.settings||{sound:true,vibrate:true};}catch(e){return {sound:true,vibrate:true};}}
