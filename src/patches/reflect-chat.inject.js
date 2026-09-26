function mpReflectPage({active:e,onHelp:t,onDiary:n}){
  let[r,i]=(0,_.useState)(()=>mpReflect.loadThread());
  let[a,o]=(0,_.useState)(``);
  let[s,c]=(0,_.useState)({available:!1,model:null,reason:`pending`});
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
    let t=mpReflect.saveThread(e);
    i(t);
    return t;
  }
  function g(){
    let e=mpReflect.clearThread();
    i(e);
    o(``);
    f(`Reflection cleared from this device for today.`);
  }
  function v(e){
    return mpReflect.appendMessage(r,e);
  }
  async function y(){
    let w=a.trim();
    if(!mpReflect.canSendText(w)||l||r.crisis)return;
    f(``);
    let C=mpReflect.detectCrisisIntent(w);
    o(``);
    let T=v({role:`user`,text:w,at:new Date().toISOString()});
    if(C.crisis){
      let k=mpReflect.appendMessage(T,{role:`note`,kind:`crisis`,text:mpReflect.CRISIS_COPY.body,at:new Date().toISOString()});
      k.crisis=!0;
      h(k);
      return;
    }
    if(!m){
      h(mpReflect.appendMessage(T,{role:`note`,kind:`unavailable`,text:mpCompanion.UNAVAILABLE_NOTE,at:new Date().toISOString()}));
      return;
    }
    u(!0);
    try{
      let q=T.messages.filter(z=>z.role===`user`||z.role===`assistant`).map(z=>({role:z.role,content:z.text}));
      let R=await mpCompanion.sendCompanionChat({
        message:w,
        messages:q,
        system:mpReflect.REFLECT_SYSTEM_PROMPT,
        lane:mpReflect.REFLECT_LANE,
        safetyState:mpReflect.safetyStateForText(w)
      });
      if(R.kind===`reply`&&R.value&&R.value.reply){
        let k=mpReflect.appendMessage(T,{role:`assistant`,text:R.value.reply,at:new Date().toISOString()});
        if(R.value.kind===`human_help`){
          k=mpReflect.appendMessage(k,{role:`note`,kind:`crisis`,text:mpReflect.CRISIS_COPY.body,at:new Date().toISOString()});
          k.crisis=!0;
        }else if(R.value.modelDisclosure){
          k=mpReflect.appendMessage(k,{role:`note`,kind:`disclosure`,text:R.value.modelDisclosure,at:new Date().toISOString()});
        }
        h(k);
        return;
      }
      h(mpReflect.appendMessage(T,{role:`note`,kind:`unavailable`,text:mpCompanion.UNAVAILABLE_NOTE,at:new Date().toISOString()}));
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
  function x(){
    let e=mpReflect.downloadableTranscript(r);
    if(typeof Hi==`function`){Hi(`mindpal-reflection.txt`,e);return}
    let t=URL.createObjectURL(new Blob([e],{type:`text/plain`}));
    let n=document.createElement(`a`);
    n.href=t;n.download=`mindpal-reflection.txt`;n.click();
    setTimeout(()=>URL.revokeObjectURL(t),1e3);
  }
  let S=r.messages.some(e=>e.role===`user`||e.role===`assistant`);
  let statusCopy=mpCompanion.companionStatusCopy(s,{savedBase:mpCompanion.storedCompanionBase(),surface:`reflect`});
  return(0,A.jsxs)(`section`,{hidden:!e,className:`reflection-space mp-reflect-chat`,"aria-label":`Talk with MindPal`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`TALK WITH MINDPAL`}),
    (0,A.jsx)(`img`,{className:`section-photo`,src:Ge(`/journal-scene.jpg`),alt:`A woman taking a quiet moment with tea`,loading:`lazy`}),
    (0,A.jsx)(`h1`,{children:`Talk with MindPal`}),
    (0,A.jsxs)(`p`,{className:`lede`,children:[`A conversation about your day — reflective listening, a gentle reframe if it fits, and one small next step. You can stop anytime.`] }),
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer mp-reflect-disclaimer`,children:mpReflect.CLINICAL_DISCLAIMER}),
    (0,A.jsxs)(`p`,{className:`mp-reflect-status${m?` is-live`:s.reason===`pending`?` is-checking`:``}`,role:`status`,children:[
      (0,A.jsx)(`span`,{className:`mp-reflect-pill`,children:statusCopy.label}),
      (0,A.jsx)(`span`,{children:` ${statusCopy.detail}`}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>j(e=>e+1),children:`Check again`})
    ]}),
    (0,A.jsxs)(`details`,{className:`mp-reflect-setup`,open:!m,children:[
      (0,A.jsx)(`summary`,{children:`Live companion address`}),
      (0,A.jsx)(mpCompanionBaseCard,{onChanged:()=>j(e=>e+1)}),
      (0,A.jsx)(`p`,{children:`Live chat is off on this phone until you save the companion address. Tap Save the MindPal address, or paste another one. Nothing is invented if it does not answer.`})
    ]}),
    (0,A.jsxs)(`details`,{children:[
      (0,A.jsx)(`summary`,{children:`A thought to reflect on`}),
      (0,A.jsx)(`blockquote`,{children:`Thoughts are one part of an experience. Your circumstances, health and support matter too.`}),
      (0,A.jsx)(`p`,{children:`Original MindPal reflection prompt. You do not have to change your thoughts or feelings.`})
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
      ]},e.id)):(0,A.jsx)(`p`,{className:`muted mp-reflect-empty`,children:`Your conversation with MindPal will appear here. Enter sends · Shift+Enter starts a new line.`}),
      l?(0,A.jsx)(`p`,{className:`muted mp-reflect-pending`,role:`status`,children:`MindPal is writing a reply…`}):null
    ]}),
    (0,A.jsxs)(`form`,{className:`mp-reflect-composer`,onSubmit:e=>{e.preventDefault();y()},children:[
      (0,A.jsx)(`label`,{htmlFor:`mp-reflect-input`,children:`Message MindPal`}),
      (0,A.jsx)(`textarea`,{id:`mp-reflect-input`,maxLength:mpReflect.MESSAGE_TEXT_MAX,value:a,disabled:r.crisis||l,onChange:e=>o(e.target.value),onKeyDown:b,placeholder:r.crisis?`This chat has stopped so you can use human help.`:m?`What’s on your mind today?`:`Write here. Send stays on this device until Live is connected.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`button`,{className:`primary`,type:`submit`,disabled:!mpReflect.canSendText(a)||l||r.crisis,children:l?`Sending…`:`Send`}),
        (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:n,children:`Open my diary · no automatic copying`})
      ]}),
      (0,A.jsx)(`p`,{className:`muted`,children:`Enter sends. Shift+Enter adds a line. Nothing is sent until you press Send.`})
    ]}),
    (0,A.jsx)(`p`,{children:`The downloaded file may be visible to others using this device. Clearing this page does not delete downloaded copies.`}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,disabled:!S,onClick:x,children:`Download a copy of my reflection`}),
    d?(0,A.jsx)(`p`,{role:`status`,children:d}):null,
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:g,children:`Clear reflection & finish`}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:t,children:`Help me now · stop reflection`})
    ]})
  ]});
}
