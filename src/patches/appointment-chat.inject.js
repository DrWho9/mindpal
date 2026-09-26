function mpAppointmentChat({onHelp:t}){
  let[r,i]=(0,_.useState)(()=>mpReflect.loadThread(globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY));
  let[a,o]=(0,_.useState)(``);
  let[s,c]=(0,_.useState)({available:!1,model:null,medicalKey:!1,reason:`pending`});
  let[l,u]=(0,_.useState)(!1);
  let[d,f]=(0,_.useState)(``);
  let[k,j]=(0,_.useState)(0);
  let p=(0,_.useRef)(null);
  let m=s.available===!0;
  (0,_.useEffect)(()=>{
    let n=!1;
    mpCompanion.fetchCompanionStatus().then(e=>{if(!n)c(e)});
    return()=>{n=!0};
  },[k]);
  (0,_.useEffect)(()=>{
    if(p.current)p.current.scrollTop=p.current.scrollHeight;
  },[r.messages.length,l]);
  function h(e){
    let t=mpReflect.saveThread(e,globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
    i(t);
    return t;
  }
  function g(){
    let e=mpReflect.clearThread(globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
    i(e);
    o(``);
    f(`Appointment chat cleared from this device for today.`);
  }
  function v(e){
    return mpReflect.appendMessage(r,e,globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
  }
  async function y(){
    let w=a.trim();
    if(!mpReflect.canSendText(w)||l||r.crisis)return;
    f(``);
    let C=mpReflect.detectCrisisIntent(w);
    o(``);
    let T=v({role:`user`,text:w,at:new Date().toISOString()});
    if(C.crisis){
      let k=mpReflect.appendMessage(T,{role:`note`,kind:`crisis`,text:mpReflect.CRISIS_COPY.body,at:new Date().toISOString()},globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
      k.crisis=!0;
      h(k);
      return;
    }
    if(!m){
      h(mpReflect.appendMessage(T,{role:`note`,kind:`unavailable`,text:mpCompanion.UNAVAILABLE_NOTE,at:new Date().toISOString()},globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY));
      return;
    }
    u(!0);
    try{
      let q=T.messages.filter(z=>z.role===`user`||z.role===`assistant`).map(z=>({role:z.role,content:z.text}));
      let R=await mpCompanion.sendCompanionChat({
        message:w,
        messages:q,
        system:mpAppointment.APPOINTMENT_SYSTEM_PROMPT,
        lane:mpAppointment.APPOINTMENT_LANE,
        safetyState:mpReflect.safetyStateForText(w)
      });
      if(R.kind===`reply`&&R.value&&R.value.reply){
        let k=mpReflect.appendMessage(T,{role:`assistant`,text:R.value.reply,at:new Date().toISOString()},globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
        if(R.value.kind===`human_help`){
          k=mpReflect.appendMessage(k,{role:`note`,kind:`crisis`,text:mpReflect.CRISIS_COPY.body,at:new Date().toISOString()},globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
          k.crisis=!0;
        }else if(R.value.modelDisclosure){
          k=mpReflect.appendMessage(k,{role:`note`,kind:`disclosure`,text:R.value.modelDisclosure,at:new Date().toISOString()},globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY);
        }
        h(k);
        return;
      }
      h(mpReflect.appendMessage(T,{role:`note`,kind:`unavailable`,text:mpCompanion.companionFailureCopy(R&&R.reason),at:new Date().toISOString()},globalThis.localStorage,new Date(),mpAppointment.APPOINTMENT_THREAD_STORAGE_KEY));
    }finally{
      u(!1);
    }
  }
  function b(e){
    if(mpReflect.shouldSendOnKey(e)){
      e.preventDefault();
      y();
    }
  }
  let S=r.messages.some(e=>e.role===`user`||e.role===`assistant`);
  let statusCopy=mpCompanion.companionStatusCopy(s,{savedBase:mpCompanion.storedCompanionBase(),surface:`appointment`});
  return(0,A.jsxs)(`div`,{className:`mp-reflect-chat mp-appoint-chat`,"aria-label":`Talk with MindPal about your appointment`,children:[
    (0,A.jsx)(`h3`,{children:`Talk with MindPal about your appointment`}),
    (0,A.jsx)(`p`,{children:`A back-and-forth to help you phrase questions for your clinician. MindPal does not read reports or decide treatment.`}),
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer mp-reflect-disclaimer`,children:mpAppointment.APPOINTMENT_DISCLAIMER}),
    (0,A.jsxs)(`p`,{className:`mp-reflect-status${m?` is-live`:s.reason===`pending`?` is-checking`:``}`,role:`status`,children:[
      (0,A.jsx)(`span`,{className:`mp-reflect-pill`,children:statusCopy.label}),
      (0,A.jsx)(`span`,{children:` ${statusCopy.detail}`}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>j(e=>e+1),children:`Check again`})
    ]}),
    (0,A.jsxs)(`details`,{className:`mp-reflect-setup`,open:!m,children:[
      (0,A.jsx)(`summary`,{children:`Live companion address`}),
      (0,A.jsx)(mpCompanionBaseCard,{onChanged:()=>j(e=>e+1)}),
      (0,A.jsx)(`p`,{children:`Same address as Reflect. Tap Save the MindPal address on this phone. This screen will not invent a medical reply.`})
    ]}),
    r.crisis?(0,A.jsxs)(`div`,{className:`urgent-box mp-reflect-crisis`,role:`alert`,children:[
      (0,A.jsx)(`strong`,{children:mpReflect.CRISIS_COPY.title}),
      (0,A.jsx)(`p`,{children:mpReflect.CRISIS_COPY.body}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`a`,{className:`primary`,href:mpReflect.CRISIS_COPY.emergencyHref,children:mpReflect.CRISIS_COPY.emergencyLabel}),
        (0,A.jsx)(`a`,{className:`secondary`,href:mpReflect.CRISIS_COPY.lifelineHref,children:mpReflect.CRISIS_COPY.lifelineLabel}),
        (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:t,children:`Help me now`})
      ]})
    ]}):null,
    (0,A.jsxs)(`div`,{className:`mp-reflect-thread`,ref:p,role:`log`,"aria-live":`polite`,"aria-relevant":`additions`,children:[
      r.messages.length?r.messages.map(e=>(0,A.jsxs)(`article`,{className:`mp-reflect-msg mp-reflect-msg-${e.role}${e.kind?` is-${e.kind}`:``}`,children:[
        (0,A.jsx)(`p`,{className:`mp-reflect-who`,children:e.role===`user`?`You`:e.role===`assistant`?`MindPal`:`MindPal note`}),
        (0,A.jsx)(`p`,{children:e.text})
      ]},e.id)):(0,A.jsx)(`p`,{className:`muted mp-reflect-empty`,children:`Ask MindPal to help you word a question for your clinician. Enter sends · Shift+Enter starts a new line.`}),
      l?(0,A.jsx)(`p`,{className:`muted mp-reflect-pending`,role:`status`,children:`MindPal is writing a reply…`}):null
    ]}),
    (0,A.jsxs)(`form`,{className:`mp-reflect-composer`,onSubmit:e=>{e.preventDefault();y()},children:[
      (0,A.jsx)(`label`,{htmlFor:`mp-appoint-input`,children:`Message MindPal`}),
      (0,A.jsx)(`textarea`,{id:`mp-appoint-input`,maxLength:mpReflect.MESSAGE_TEXT_MAX,value:a,disabled:r.crisis||l,onChange:e=>o(e.target.value),onKeyDown:b,placeholder:r.crisis?`This chat has stopped so you can use human help.`:m?`What do you want to ask your clinician?`:`Write a question to prepare. Send stays on this device until Live is connected.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`button`,{className:`primary`,type:`submit`,disabled:!mpReflect.canSendText(a)||l||r.crisis,children:l?`Sending…`:`Send`}),
        (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:g,disabled:!S&&!r.messages.length,children:`Clear appointment chat`})
      ]}),
      (0,A.jsx)(`p`,{className:`muted`,children:`Enter sends. Shift+Enter adds a line. Nothing is sent until you press Send.`}),
      d?(0,A.jsx)(`p`,{role:`status`,children:d}):null
    ]})
  ]});
}
