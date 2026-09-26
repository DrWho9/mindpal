function mpCompanionPage({onHelp:e,onExercise:t,onReflect:n}){
  let[i,a]=(0,_.useState)(()=>({...mpCompanionDemo.emptyCompanionState(),status:`checking`,reason:`pending`}));
  let[o,s]=(0,_.useState)(()=>typeof mpProblems<`u`&&mpProblems.takeCompanionPrompt?mpProblems.takeCompanionPrompt()||``:``);
  let[c,l]=(0,_.useState)(!1);
  let[f,p]=(0,_.useState)([]);
  let[m,h]=(0,_.useState)(!1);
  let[k,j]=(0,_.useState)(0);
  let[listening,setListening]=(0,_.useState)(!1);
  let[hearNote,setHearNote]=(0,_.useState)(``);
  let[micNote,setMicNote]=(0,_.useState)(``);
  let threadRef=(0,_.useRef)(null);
  let micRef=(0,_.useRef)(null);
  let stopHear=(0,_.useRef)(()=>{});
  let sendGen=(0,_.useRef)(0);
  let stateRef=(0,_.useRef)(i);
  let sendRef=(0,_.useRef)(()=>{});
  let busyRef=(0,_.useRef)(!1);
  stateRef.current=i;
  (0,_.useEffect)(()=>{
    let cancelled=!1;
    mpCompanion.fetchCompanionStatus().then(status=>{
      if(!cancelled)a(prev=>mpCompanionDemo.setCompanionLive(prev,status));
    });
    return()=>{cancelled=!0};
  },[k]);
  (0,_.useEffect)(()=>{
    if(threadRef.current)threadRef.current.scrollTop=threadRef.current.scrollHeight;
  },[f.length,m]);
  (0,_.useEffect)(()=>()=>{
    try{micRef.current&&micRef.current.stop()}catch{}
    try{stopHear.current()}catch{}
  },[]);
  function C(choiceId){
    let next=mpCompanionDemo.applyChoice(i,choiceId);
    a(next);
    if(next.navigate===mpCompanionDemo.HELP_ROUTE)e&&e();
  }
  function w(){
    let next=mpCompanionDemo.revealPractices(i);
    a(next);
    if(next.navigate===mpCompanionDemo.HELP_ROUTE)e&&e();
  }
  function T(cardId){
    let next=mpCompanionDemo.activatePracticeCard(i,cardId);
    a(next);
    if(next.exerciseId)t&&t(next.exerciseId);
    if(next.navigate===mpCompanionDemo.REFLECT_ROUTE)n&&n();
    if(next.navigate===mpCompanionDemo.HELP_ROUTE)e&&e();
  }
  function hear(text){
    try{stopHear.current()}catch{}
    let body=String(text||``).trim();
    if(!body){
      setHearNote(`Nothing to read aloud yet.`);
      return;
    }
    if(typeof window>`u`||!window.speechSynthesis||typeof SpeechSynthesisUtterance>`u`){
      setHearNote(`This phone can't speak from the browser. You can still read the words.`);
      return;
    }
    let failed=!1;
    setHearNote(`Speaking…`);
    let stop=mpReadings.speakBrowser(body,()=>{if(!failed)setHearNote(``)},{
      onError:()=>{
        failed=!0;
        setHearNote(`Speech didn't start. Tap Hear this again, or just read the words.`);
      }
    });
    stopHear.current=typeof stop===`function`?stop:()=>{};
  }
  function toggleMic(){
    if(busyRef.current)return;
    try{stopHear.current()}catch{}
    setHearNote(``);
    if(!mpReadings.micSupported()){
      setMicNote(mpReadings.micUnsupportedCopy());
      return;
    }
    if(!micRef.current){
      micRef.current=mpReadings.createMicCapture({
        onStart:()=>{setListening(!0);setMicNote(`Listening… speak, then pause.`);},
        onPartial:text=>{if(text)s(text)},
        onFinal:text=>{
          let heard=String(text||``).trim();
          if(heard)s(heard);
          setListening(!1);
          let state=stateRef.current||{};
          let crisis=mpCompanionDemo.isCrisisChoice(state.choiceId)||state.panel===`crisis`;
          if(crisis){
            setMicNote(`Heard you. That stays on this phone. Use Help if you need a person.`);
            return;
          }
          if(busyRef.current){
            setMicNote(`Still waiting on the last message. Your new words are in the box.`);
            return;
          }
          if(state.status===`live`&&heard){
            setMicNote(``);
            if(!state.chatOpen)a(prev=>mpCompanionDemo.openLiveChat(prev));
            sendRef.current(heard,{spoken:!0});
            return;
          }
          setMicNote(heard?`Heard you. Live chat is off, so this stays in the box and was not sent.`:`No speech was heard. Try again, or type.`);
        },
        onError:code=>{
          setListening(!1);
          setMicNote(mpReadings.micErrorCopy(code)||mpReadings.micUnsupportedCopy());
        },
        onEnd:()=>setListening(!1)
      });
    }
    if(micRef.current.isListening())micRef.current.stop();
    else if(!micRef.current.start())setListening(!1);
  }
  async function sendLive(message, opts){
    let text=String(message||``).trim();
    if(!text||busyRef.current)return;
    busyRef.current=!0;
    let spoken=!!(opts&&opts.spoken);
    let safety=stateRef.current&&stateRef.current.choiceId||`ordinary`;
    let gen=++sendGen.current;
    let waitId=`wait-${gen}`;
    p(prev=>[...prev,{role:`you`,text,id:`you-${gen}`},{role:`guide`,text:mpCompanionDemo.THINKING_LABEL,pending:!0,id:waitId}]);
    s(``);
    h(!0);
    try{
      let result=await mpCompanion.sendCompanionChat({
        message:text,
        safetyState:safety
      });
      if(gen!==sendGen.current)return;
      let reply=result&&result.kind===`reply`&&result.value&&result.value.reply?result.value.reply:``;
      p(prev=>prev.filter(msg=>msg.id!==waitId).concat([{
        role:`guide`,
        text:reply||mpCompanion.companionFailureCopy(result&&result.reason),
        disclosure:reply&&result.value&&result.value.modelDisclosure||``
      }]));
      if(reply)a(prev=>mpCompanionDemo.noteLiveReply(prev));
      if(!reply)s(text);
      if(reply&&spoken)hear(reply);
      if(reply&&result.value&&result.value.kind===`human_help`)e&&e();
    }catch{
      if(gen!==sendGen.current)return;
      p(prev=>prev.filter(msg=>msg.id!==waitId).concat([{role:`guide`,text:mpCompanion.companionFailureCopy(`unavailable`)}]));
      s(text);
    }finally{
      if(gen===sendGen.current){
        busyRef.current=!1;
        h(!1);
      }
    }
  }
  sendRef.current=sendLive;
  function onPrimary(){
    if(m||busyRef.current)return;
    if(mpCompanionDemo.isCrisisChoice(i.choiceId)||i.panel===`crisis`){
      e&&e();
      return;
    }
    let message=o.trim();
    if(i.status===`live`&&message){
      if(!i.chatOpen)a(prev=>mpCompanionDemo.openLiveChat(prev));
      sendLive(message);
      return;
    }
    w();
    if(message){
      p(prev=>{
        let last=prev[prev.length-1];
        if(last&&last.text===mpCompanion.DEMO_HOLD_NOTE)return prev;
        return [...prev,{role:`note`,text:mpCompanion.DEMO_HOLD_NOTE}];
      });
    }
  }
  function onKey(ev){
    if(ev.key===`Enter`&&(ev.metaKey||ev.ctrlKey)){
      ev.preventDefault();
      onPrimary();
    }
  }
  let live=i.status===`live`;
  let panel=mpCompanionDemo.INTENT_PANELS[i.choiceId]||mpCompanionDemo.INTENT_PANELS.ordinary;
  let crisis=i.panel===`crisis`||mpCompanionDemo.isCrisisChoice(i.choiceId);
  let statusCopy=mpCompanion.companionStatusCopy({
    available:live,
    model:i.model,
    reason:i.reason||(i.status===`checking`?`pending`:`unavailable`),
    status:i.status
  },{savedBase:mpCompanion.storedCompanionBase(),surface:`companion`});
  return(0,A.jsxs)(`div`,{className:`mp-companion-page`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`A LITTLE COMPANY, WITH CLEAR BOUNDARIES`}),
    (0,A.jsx)(`h1`,{children:`At your pace.`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`An optional guide to a small next step.`}),
    (0,A.jsxs)(`div`,{className:`companion-layout`,children:[
      (0,A.jsxs)(`section`,{className:`companion-stage`,children:[
        !c&&(0,A.jsx)(Ui,{}),
        (0,A.jsx)(`h2`,{children:`Your MindPal companion`}),
        (0,A.jsx)(`p`,{children:live?`Live chat is separate from these practice buttons.`:`Interactive practice preview`}),
        (0,A.jsx)(Wi,{children:mpCompanionDemo.companionBanner(i)}),
        (0,A.jsx)(`p`,{className:`muted mp-companion-badge-note`,children:live||i.liveReply?mpCompanionDemo.LIVE_BADGE_NOTE:mpCompanionDemo.PRACTICE_BADGE_NOTE}),
        (0,A.jsx)(`p`,{className:`muted`,role:`status`,children:statusCopy.detail}),
        (0,A.jsx)(`button`,{className:`secondary mp-speak-button`,type:`button`,"data-mp-cta":`companion-speak`,"aria-pressed":listening,disabled:m,onClick:toggleMic,children:listening?`Listening… tap to stop`:`Speak`}),
        (0,A.jsxs)(`div`,{className:`button-row`,children:[
          (0,A.jsx)(`button`,{className:`secondary small-button`,type:`button`,onClick:()=>l(!c),children:c?`Show character`:`Text-only view`}),
          (0,A.jsx)(`button`,{className:`secondary small-button`,type:`button`,onClick:()=>hear(`${panel.title}. ${panel.body}`),children:hearNote===`Speaking…`?`Speaking…`:`Hear this`}),
          (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>j(tick=>tick+1),children:`Check again`})
        ]}),
        hearNote&&hearNote!==`Speaking…`?(0,A.jsx)(`p`,{className:`muted`,role:`status`,children:hearNote}):null
      ]}),
      (0,A.jsxs)(`section`,{className:`companion-chat`,children:[
        (0,A.jsx)(`h2`,{children:`A guide, with you in control.`}),
        (0,A.jsx)(`p`,{children:`This character offers fixed practice choices. It is not a person, therapist or emergency service. Your diary is never accessed automatically.`}),
        (0,A.jsxs)(`div`,{className:`support-choices`,children:[
          (0,A.jsx)(`p`,{className:`eyebrow`,children:`CHOOSE WHAT FITS · THESE BUTTONS DO NOT READ YOUR MESSAGE`}),
          mpCompanionDemo.CHOICES.map(choice=>(0,A.jsx)(`button`,{
            type:`button`,
            className:i.choiceId===choice.id?`selected`:``,
            "aria-pressed":i.choiceId===choice.id,
            onClick:()=>C(choice.id),
            children:choice.label,
          },choice.id))
        ]}),
        (0,A.jsxs)(`div`,{className:`mp-companion-panel ${crisis?`mp-companion-panel-crisis`:``}`,role:`status`,"aria-live":`polite`,children:[
          (0,A.jsx)(`h3`,{children:panel.title}),
          (0,A.jsx)(`p`,{children:panel.body})
        ]}),
        crisis?(0,A.jsxs)(`div`,{className:`urgent-box mp-crisis-panel`,children:[
          (0,A.jsx)(`strong`,{children:`Human help comes first.`}),
          (0,A.jsx)(`p`,{children:`If you are in immediate danger in Australia, call 000. For crisis support, call Lifeline on 13 11 14.`}),
          (0,A.jsxs)(`div`,{className:`button-row`,children:[
            (0,A.jsx)(`a`,{className:`primary`,href:`tel:000`,children:`Call 000`}),
            (0,A.jsx)(`a`,{className:`secondary`,href:`tel:131114`,children:`Call Lifeline 13 11 14`}),
            (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>e&&e(),children:`Open Help`})
          ]})
        ]}):null,
        i.practicesVisible&&!crisis?(0,A.jsxs)(`div`,{className:`mp-practice-grid`,"aria-label":`Practice choices`,children:[
          (0,A.jsx)(`p`,{className:`eyebrow`,children:`PRACTICE CHOICES · OPTIONAL`}),
          mpCompanionDemo.PRACTICE_CARDS.map(card=>(0,A.jsxs)(`article`,{className:`mp-practice-card${i.expandedCardId===card.id?` is-open`:``}`,children:[
            (0,A.jsx)(`h3`,{children:card.title}),
            (0,A.jsx)(`p`,{children:card.teaser||card.body}),
            (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>T(card.id),children:i.expandedCardId===card.id&&card.action.type===`expand`?`Hide this` : card.cta}),
            i.expandedCardId===card.id&&card.action.type===`expand`?(0,A.jsx)(`p`,{className:`mp-practice-expand`,children:card.body}):null
          ]},card.id))
        ]}):null,
        (0,A.jsxs)(`div`,{className:`mp-companion-live-chat mp-companion-talk`,"aria-label":`Talk with MindPal`,children:[
          (0,A.jsx)(`h3`,{children:`Talk with MindPal`}),
          (0,A.jsx)(`p`,{className:`muted`,children:live?`Tap Speak to talk. When you pause, those words are sent. Or type and tap Send. If you need a person, use Help.`:`Practice only. Speak and typing stay on this phone until live chat is on. Nothing here is a live reply.`}),
          f.length?(0,A.jsx)(`div`,{ref:threadRef,role:`log`,"aria-live":`polite`,"aria-relevant":`additions`,children:f.map((msg,idx)=>(0,A.jsxs)(`div`,{className:`mp-chat-line mp-chat-${msg.role}${msg.pending?` mp-chat-pending`:``}`,children:[
            (0,A.jsx)(`p`,{children:[
              (0,A.jsx)(`strong`,{children:msg.role===`you`?`You`:msg.role===`note`?`Note`:`MindPal`}),
              ` · `,
              msg.text
            ]}),
            msg.disclosure?(0,A.jsx)(`p`,{className:`muted`,children:msg.disclosure}):null,
            msg.role===`guide`&&!msg.pending?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>hear(msg.text),children:`Hear this`}):null
          ]},msg.id||idx))}):null,
          (0,A.jsx)(`button`,{className:`secondary mp-speak-button`,type:`button`,"data-mp-cta":`companion-speak`,"aria-pressed":listening,disabled:m,onClick:toggleMic,children:listening?`Listening… tap to stop`:`Speak`}),
          micNote?(0,A.jsx)(`p`,{className:`muted`,role:`status`,children:micNote}):(0,A.jsx)(`p`,{className:`muted`,children:`Speak uses this phone’s microphone. On Chrome, you can talk instead of typing.`}),
          (0,A.jsxs)(`label`,{htmlFor:`companion-message`,children:[
            live?`Message MindPal`:`Note for yourself`,
            ` `,
            (0,A.jsx)(`span`,{className:`muted`,children:live?`sent when you tap Send, or when Speak finishes`:`optional · not sent until live chat is on`})
          ]}),
          (0,A.jsx)(`textarea`,{id:`companion-message`,"data-mp-cta":`companion-message`,value:o,maxLength:2e3,disabled:m,onChange:ev=>s(ev.target.value),onKeyDown:onKey,placeholder:live?`Type, or tap Speak.`:`Write a note if you like. It stays on this phone until live chat is on.`}),
          (0,A.jsxs)(`div`,{className:`button-row mp-companion-composer`,children:[
            (0,A.jsxs)(`button`,{className:`primary`,type:`button`,disabled:m,"data-mp-cta":`companion-send`,onClick:onPrimary,children:[
              mpCompanionDemo.primaryCtaLabel(i,{hasMessage:!!String(o||``).trim(),sending:m}),
              m?``:` →`
            ]}),
            (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>e&&e(),children:`Reach human support`})
          ]})
        ]}),
        (0,A.jsx)(`p`,{className:`muted`,children:live?`Ctrl+Enter or Cmd+Enter also sends. Enter on its own starts a new line.`:`Ctrl+Enter or Cmd+Enter shows practice choices. Enter on its own starts a new line. Local practice · Help is always available`}),
        (0,A.jsxs)(`details`,{className:`mp-companion-setup`,open:!live,children:[
          (0,A.jsx)(`summary`,{children:`Live companion address`}),
          (0,A.jsx)(`p`,{children:`On this phone, tap Save the MindPal address. Until you do, this page stays a practice guide and does not send what you type.`}),
          (0,A.jsx)(`p`,{className:`muted`,children:`This build does not invent a public tunnel. If you opened a link with ?companionBase= and it still says practice mode, tap Save the address from this link.`}),
          (0,A.jsx)(mpCompanionBaseCard,{onChanged:()=>j(tick=>tick+1)})
        ]})
      ]})
    ]})
  ]});
}
