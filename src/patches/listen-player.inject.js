function mpListenIcon(name){
  let p=name===`play`?`M8 5v14l11-7z`:name===`pause`?`M6 5h4v14H6zm8 0h4v14h-4z`:name===`back`?`M11.5 18 3 12l8.5-6v12zm9 0-8.5-6 8.5-6v12z`:`M4 18V6l8.5 6L4 18zm9 0V6l8.5 6-8.5 6z`;
  return(0,A.jsx)(`svg`,{viewBox:`0 0 24 24`,width:`28`,height:`28`,"aria-hidden":`true`,focusable:`false`,children:(0,A.jsx)(`path`,{fill:`currentColor`,d:p})});
}
function mpListenPlayer({id:e,text:t,label:n}){
  let text=String(t||``);
  let title=n||`reading`;
  let timeline=mpReadings.buildSpeechTimeline(text);
  let estimated=timeline.length?timeline[timeline.length-1].end:0;
  let[snap,setSnap]=(0,_.useState)(()=>({kind:`speech`,seekMode:`chunks`,seekable:estimated>0,playing:!1,current:0,duration:estimated,remaining:estimated,currentLabel:mpReadings.formatListenClock(0),remainingLabel:mpReadings.formatListenRemaining(estimated),status:``}));
  let[drag,setDrag]=(0,_.useState)(null);
  let ctrlRef=(0,_.useRef)(null);
  let trackRef=(0,_.useRef)(null);
  let dragRef=(0,_.useRef)(null);
  let loopRef=(0,_.useRef)(0);
  let unsubRef=(0,_.useRef)(()=>{});
  let key=`${e||``}::${text}`;
  let keyRef=(0,_.useRef)(key);
  if(keyRef.current!==key){
    keyRef.current=key;
    setDrag(null);
    setSnap({kind:`speech`,seekMode:`chunks`,seekable:estimated>0,playing:!1,current:0,duration:estimated,remaining:estimated,currentLabel:mpReadings.formatListenClock(0),remainingLabel:mpReadings.formatListenRemaining(estimated),status:``});
  }
  function cancelLoop(){
    if(typeof cancelAnimationFrame===`function`)cancelAnimationFrame(loopRef.current);
  }
  function startLoop(ctrl){
    cancelLoop();
    if(typeof requestAnimationFrame!==`function`)return;
    let tick=()=>{
      if(ctrlRef.current!==ctrl)return;
      let next=ctrl.snapshot();
      setSnap(next);
      if(next.playing)loopRef.current=requestAnimationFrame(tick);
    };
    loopRef.current=requestAnimationFrame(tick);
  }
  function adopt(ctrl){
    unsubRef.current();
    ctrlRef.current=ctrl;
    unsubRef.current=ctrl.subscribe(s=>{
      setSnap(s);
      if(s.playing)startLoop(ctrl);
    });
  }
  (0,_.useEffect)(()=>{
    let ctrl=mpReadings.createListenController({id:e||``,text});
    adopt(ctrl);
    return ()=>{
      cancelLoop();
      unsubRef.current();
      unsubRef.current=()=>{};
      if(ctrlRef.current)ctrlRef.current.stop();
      ctrlRef.current=null;
    };
  },[e,text]);
  if(!text.trim())return null;
  function shown(){
    if(drag!=null)return drag;
    return snap?.current||0;
  }
  function duration(){
    return snap?.duration||estimated||0;
  }
  function labels(){
    return mpReadings.listenTimes(shown(),duration());
  }
  function pointerTime(ev){
    let el=trackRef.current;
    if(!el)return 0;
    let ratio=mpReadings.listenPointerRatio(ev.clientX,el.getBoundingClientRect());
    return ratio*(duration()||0);
  }
  function onToggle(){
    let ctrl=ctrlRef.current;
    if(!ctrl)return;
    if(ctrl.snapshot().playing){
      ctrl.pause();
      return;
    }
    let result=ctrl.play();
    if(ctrl.kind===`speech`)mpMaybeUpgradeNeural(ctrl,text);
    if(result&&typeof result.then===`function`){
      result.then(ok=>{
        if(ok===false)mpFallbackSpeech(text);
      }).catch(()=>mpFallbackSpeech(text));
    }else if(result===false && ctrl.kind!==`speech`){
      mpFallbackSpeech(text);
    }
  }
  function mpFallbackSpeech(body){
    let speech=mpReadings.createSpeechListenController(body);
    adopt(speech);
    speech.play();
    mpMaybeUpgradeNeural(speech,body);
  }
  function mpMaybeUpgradeNeural(speechCtrl,body){
    if(!speechCtrl||speechCtrl.kind!==`speech`)return;
    if(typeof it!==`function`||typeof at!==`function`)return;
    it().then(ok=>{
      if(!ok||ctrlRef.current!==speechCtrl||!speechCtrl.snapshot().playing)return null;
      return at(body);
    }).then(blob=>{
      if(!blob||ctrlRef.current!==speechCtrl||!speechCtrl.snapshot().playing)return null;
      return mpReadings.upgradeSpeechToBlob(speechCtrl,blob);
    }).then(audioCtrl=>{
      if(!audioCtrl)return;
      if(ctrlRef.current!==speechCtrl){
        audioCtrl.stop();
        return;
      }
      adopt(audioCtrl);
    }).catch(()=>{});
  }
  function onSkip(delta){
    let ctrl=ctrlRef.current;
    if(!ctrl)return;
    ctrl.skip(delta);
  }
  function onDown(ev){
    if(ev.button!=null&&ev.button!==0)return;
    let ctrl=ctrlRef.current;
    if(!ctrl||!(duration()>0))return;
    ev.preventDefault();
    trackRef.current?.setPointerCapture?.(ev.pointerId);
    dragRef.current={wasPlaying:!!ctrl.snapshot().playing};
    if(ctrl.snapshot().playing)ctrl.pause();
    let time=pointerTime(ev);
    setDrag(time);
    if(ctrl.kind===`audio`)ctrl.seek(time);
  }
  function onMove(ev){
    if(!dragRef.current)return;
    let time=pointerTime(ev);
    setDrag(time);
    if(ctrlRef.current&&ctrlRef.current.kind===`audio`)ctrlRef.current.seek(time);
  }
  function onUp(ev){
    if(!dragRef.current)return;
    let was=dragRef.current.wasPlaying;
    dragRef.current=null;
    let time=pointerTime(ev);
    setDrag(null);
    let ctrl=ctrlRef.current;
    if(!ctrl)return;
    ctrl.seek(time);
    if(was)ctrl.play();
  }
  function onKey(ev){
    let ctrl=ctrlRef.current;
    if(!ctrl)return;
    let cur=shown();
    let dur=duration();
    let next=null;
    if(ev.key===`ArrowRight`)next=cur+5;
    else if(ev.key===`ArrowLeft`)next=cur-5;
    else if(ev.key===`Home`)next=0;
    else if(ev.key===`End`)next=dur;
    else if(ev.key===` `||ev.key===`Enter`){
      ev.preventDefault();
      onToggle();
      return;
    }else return;
    ev.preventDefault();
    setDrag(null);
    ctrl.seek(next);
  }
  let playing=!!snap?.playing && drag==null;
  let times=labels();
  let dur=duration();
  let pct=dur?Math.min(100,Math.max(0,(shown()/dur)*100)):0;
  let kind=snap?.kind||`speech`;
  return(0,A.jsxs)(`div`,{className:`mp-listen-player`,role:`group`,"aria-label":`Listen to ${title}`,"data-listen-player":title,"data-listen-kind":kind,children:[
    (0,A.jsxs)(`div`,{className:`mp-listen-transport`,children:[
      (0,A.jsx)(`button`,{type:`button`,className:`mp-listen-skip`,onClick:()=>onSkip(-mpReadings.LISTEN_SKIP_SEC),"aria-label":`Skip back 8 seconds`,children:mpListenIcon(`back`)}),
      (0,A.jsx)(`button`,{type:`button`,className:`mp-listen-play`,onClick:onToggle,"aria-label":playing?`Pause`:`Play`,"aria-pressed":playing,children:mpListenIcon(playing?`pause`:`play`)}),
      (0,A.jsx)(`button`,{type:`button`,className:`mp-listen-skip`,onClick:()=>onSkip(mpReadings.LISTEN_SKIP_SEC),"aria-label":`Skip forward 8 seconds`,children:mpListenIcon(`forward`)})
    ]}),
    (0,A.jsxs)(`div`,{className:`mp-listen-track`,ref:trackRef,onPointerDown:onDown,onPointerMove:onMove,onPointerUp:onUp,onPointerCancel:onUp,children:[
      (0,A.jsx)(`div`,{className:`mp-listen-rail`,"aria-hidden":`true`}),
      (0,A.jsx)(`div`,{className:`mp-listen-fill`,"aria-hidden":`true`,style:{width:`${pct}%`}}),
      (0,A.jsx)(`div`,{className:`mp-listen-handle`,role:`slider`,tabIndex:0,"aria-label":`Reading position`,"aria-valuemin":0,"aria-valuemax":Math.round(dur)||0,"aria-valuenow":Math.round(shown())||0,"aria-valuetext":`${times.current} elapsed, ${times.remaining} remaining`,onKeyDown:onKey,style:{left:`${pct}%`}})
    ]}),
    (0,A.jsxs)(`div`,{className:`mp-listen-times`,children:[
      (0,A.jsx)(`span`,{children:times.current}),
      (0,A.jsx)(`span`,{children:times.remaining})
    ]}),
    snap?.status?(0,A.jsx)(`p`,{className:`muted mp-listen-status`,role:`status`,children:snap.status}):null
  ]});
}
