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
