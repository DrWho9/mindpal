function mpNotifySession(){
  try{window.dispatchEvent(new Event(`mindpal-session-change`))}catch{}
}
function mpSignedInName(fallback){
  try{
    let e=typeof Mt==`function`?Mt(Dt()):null;
    return (e&&e.displayName||e&&e.username||fallback||``).trim();
  }catch{return (fallback||``).trim()}
}
function mpSignInPage({onSignedIn:e}){
  let[t,n]=(0,_.useState)(``),[r,i]=(0,_.useState)(``),[a,o]=(0,_.useState)(``),[s,c]=(0,_.useState)(``),[l,u]=(0,_.useState)(!1),[d,f]=(0,_.useState)(()=>{try{return Tt()}catch{return[]}});
  async function p(m){
    u(!0),c(``);
    try{
      let h=m===`create`?await At(t,r,a):await jt(t,r);
      mpNotifySession();
      e&&e(h);
    }catch(h){
      if(m===`create`){
        try{let g=await jt(t,r);mpNotifySession();e&&e(g);return}catch{}
      }
      c(h instanceof Error?h.message:`Could not sign in.`);
    }finally{u(!1)}
  }
  return(0,A.jsxs)(`section`,{className:`mp-signin-page`,"aria-label":`Sign in`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`YOUR SPACE`}),
    (0,A.jsx)(`h1`,{children:`Sign in to begin`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`MindPal stays on this device. Create a local profile, or choose one you already use here, so Today can greet you by name.`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Demo login only — use a throwaway password. Nothing is sent to the cloud.`}),
    d.length?(0,A.jsxs)(`div`,{className:`mp-profile-chips`,"aria-label":`Profiles on this device`,children:[
      (0,A.jsx)(`p`,{className:`muted`,children:`On this device:`}),
      d.map(m=>(0,A.jsx)(`button`,{type:`button`,className:`secondary small-button`,onClick:()=>{n(m.username),o(m.displayName||``)},children:m.displayName||m.username},m.username))
    ]}):null,
    (0,A.jsx)(`label`,{htmlFor:`mp-signin-name`,children:`What should we call you?`}),
    (0,A.jsx)(`input`,{id:`mp-signin-name`,value:a,onChange:m=>o(m.target.value),autoComplete:`nickname`,placeholder:`A first name is enough`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-signin-user`,children:`Username`}),
    (0,A.jsx)(`input`,{id:`mp-signin-user`,value:t,onChange:m=>n(m.target.value),autoComplete:`username`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-signin-pass`,children:`Password`}),
    (0,A.jsx)(`input`,{id:`mp-signin-pass`,type:`password`,value:r,onChange:m=>i(m.target.value),autoComplete:`current-password`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:l,onClick:()=>p(`in`),children:`Sign in`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,disabled:l,onClick:()=>p(`create`),children:`Create local profile`})
    ]}),
    s?(0,A.jsx)(`p`,{role:`status`,children:s}):null
  ]});
}
function mpWinsPanel({variant:e=`hub`,onOpenJournal:t}){
  let[n,r]=(0,_.useState)(()=>mpWins.winsForDate(mpWins.loadWinsStore())),[i,a]=(0,_.useState)(``),[o,s]=(0,_.useState)(``);
  function c(){r(mpWins.winsForDate(mpWins.loadWinsStore()))}
  (0,_.useEffect)(()=>{function e(){c()}return window.addEventListener(`mindpal-wins-change`,e),()=>window.removeEventListener(`mindpal-wins-change`,e)},[]);
  function l(){
    let e=mpWins.addWin(i);
    if(!e.item){s(`Write a few words first — a cup of tea counts.`);return}
    a(``),s(`Saved on this device for today.`),r(e.items);
    try{window.dispatchEvent(new Event(`mindpal-wins-change`))}catch{}
  }
  if(e===`hub`){
    return(0,A.jsxs)(`section`,{className:`mp-wins-panel mp-wins-hub`,"aria-label":`Daily wins`,children:[
      (0,A.jsx)(`p`,{className:`mp-wins-nudge`,children:`Through the day, add your daily wins — small ones count — so you can read them together tonight.`}),
      n.length?(0,A.jsx)(`p`,{className:`muted mp-wins-count`,children:n.length===1?`1 saved today.`:`${n.length} saved today.`}):null,
      t?(0,A.jsx)(`button`,{className:`secondary small-button`,type:`button`,onClick:t,children:`Add a win`}):null
    ]});
  }
  return(0,A.jsxs)(`section`,{className:`mp-wins-panel mp-wins-${e}`,"aria-label":`Daily wins`,children:[
    e===`evening`?(0,A.jsx)(`h2`,{children:`Today’s wins`}):(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`DAILY WINS`}),
      (0,A.jsx)(`h2`,{children:`A win from today`}),
      (0,A.jsx)(`p`,{children:`A sentence is enough. You’ll see these again in Before you sleep.`})
    ]}),
    n.length?(0,A.jsx)(`ul`,{className:`mp-wins-list`,children:n.map(e=>(0,A.jsxs)(`li`,{children:[
      (0,A.jsx)(`span`,{children:e.text}),
      (0,A.jsx)(`time`,{dateTime:e.at,children:new Date(e.at).toLocaleTimeString(undefined,{hour:`numeric`,minute:`2-digit`})})
    ]},e.id))}):(0,A.jsx)(`p`,{className:`muted`,children:e===`evening`?`No wins saved yet today. You can still write a short wind-down note.`:`Nothing saved yet today.`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-win-${e}`,children:`Add a win`}),
    (0,A.jsx)(`input`,{id:`mp-win-${e}`,value:i,maxLength:280,onChange:e=>a(e.target.value),onKeyDown:e=>{e.key===`Enter`&&l()},placeholder:`A kind word, a finished chore, a quiet cup of tea…`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:l,children:`Save this win`})
    ]}),
    o?(0,A.jsx)(`p`,{role:`status`,children:o}):null
  ]});
}
function mpMaddyTeaser({onOpen:e}){
  return(0,A.jsxs)(`aside`,{className:`mp-maddy-teaser`,"aria-label":`Watch with Maddy`,children:[
    (0,A.jsx)(`p`,{className:`mp-maddy-teaser-label`,children:`Watch with Maddy`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Welcome, Daily tip and Timed breath — open the clips on Explore.`}),
    e?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:e,children:`Open Watch with Maddy`}):null
  ]});
}
function mpReadingsPage(){
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-readings`,"aria-label":`Readings`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`READINGS`}),
    (0,A.jsx)(`h1`,{children:`Today’s readings`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`A verse, an optional prayer, and the pack reading for this morning. Take what helps; leave the rest.`}),
    (0,A.jsx)(Rt,{}),
    (0,A.jsx)(bt,{})
  ]});
}
function mpLaterPage({onExercise:e,onFocus:t}){
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-later`,"aria-label":`A later pause`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`LATER`}),
    (0,A.jsx)(`h1`,{children:`A later pause`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`Only if the day still has a quiet corner. One short moment is enough.`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>e(`E01`),children:`Try a two-minute steady detail`}):null,
      t?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:t,children:`Open Focus for more`}):null
    ]})
  ]});
}
function mpEveningPage({onJournal:e}){
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-evening`,"aria-label":`Before you sleep`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`BEFORE YOU SLEEP`}),
    (0,A.jsx)(`h1`,{children:`Close the day gently`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`Read today’s wins if you saved any, then leave a short wind-down note in Journal. Nothing here is required.`}),
    (0,A.jsx)(mpWinsPanel,{variant:`evening`}),
    (0,A.jsx)(`p`,{children:`When you’re ready, open Journal for a few lines before sleep — a sentence about the day is plenty.`}),
    e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:e,children:`Write a short wind-down note`}):null
  ]});
}
function mpMoreStepsCard(){
  let[e,t]=(0,_.useState)(!1);
  return(0,A.jsxs)(`section`,{className:`mp-more-steps simple-panel`,"aria-label":`More steps, optional`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`MORE STEPS · OPTIONAL`}),
    (0,A.jsx)(`h2`,{children:`Small-steps pathway`}),
    (0,A.jsx)(`p`,{children:`A longer optional sequence of tiny steps — only if you want more than one short moment.`}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,"aria-expanded":e,onClick:()=>t(n=>!n),children:e?`Hide extra steps`:`Show extra steps`}),
    e?(0,A.jsx)(We,{}):null
  ]});
}
function mpFaithSettings(){
  let[e,t]=(0,_.useState)(()=>mpFaith.isCopticDateEnabled()),[n,r]=(0,_.useState)(()=>mpFaith.isWelcomeImageEnabled());
  return(0,A.jsxs)(`section`,{className:`simple-panel`,"aria-label":`Calendar and morning picture`,children:[
    (0,A.jsx)(`h2`,{children:`Calendar & morning picture`}),
    (0,A.jsxs)(`label`,{className:`toggle`,children:[
      (0,A.jsx)(`input`,{type:`checkbox`,checked:e,onChange:n=>{let r=n.target.checked;mpFaith.setCopticDateEnabled(r),t(r)}}),
      `Show Coptic calendar date`
    ]}),
    (0,A.jsx)(`p`,{className:`muted`,children:`When this is on, Today also shows the Coptic date under the civil date. It follows your faith calendar choice if a Coptic tradition is already saved.`}),
    (0,A.jsxs)(`label`,{className:`toggle`,children:[
      (0,A.jsx)(`input`,{type:`checkbox`,checked:n,onChange:e=>{let t=e.target.checked;mpFaith.setWelcomeImageEnabled(t),r(t)}}),
      `Show welcome image`
    ]}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Kept here so the morning page stays tidy.`}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{Ot(),mpNotifySession()},children:`Sign out`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Sign out returns you to the local sign-in page. Your notes and wins stay on this device.`})
  ]});
}
function Rr({name:e,onOpenVerse:t,onOpenFocus:n,onWriteJournal:r,onOpenLater:i,onOpenEvening:a,onAddWin:o,onOpenMaddy:s}){
  let c=mpSignedInName(e),l=mpCalendar.partOfDay(),[u,d]=(0,_.useState)(()=>mpTodaySteps.loadDay());
  (0,_.useEffect)(()=>{function e(){d(mpTodaySteps.loadDay())}return window.addEventListener(`visibilitychange`,e),e(),()=>window.removeEventListener(`visibilitychange`,e)},[]);
  let f=mpTodaySteps.nextStepId(u),p=mpFaith.isCopticDateEnabled();
  function m(e,t){
    let n=mpTodaySteps.saveDay(mpTodaySteps.markStep(u,e,t));
    d(n);
  }
  let h={readings:t,focus:n,journal:r,later:i||n,evening:a||r};
  return(0,A.jsxs)(`section`,{className:`today-shortcuts mp-today-hub`,"aria-label":`Today’s steps`,children:[
    (0,A.jsxs)(`div`,{className:`today-greeting`,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`TODAY`}),
      (0,A.jsx)(`p`,{className:`mp-civil-date`,children:mpCalendar.formatCivilDate()}),
      p?(0,A.jsx)(`p`,{className:`muted mp-coptic-date`,children:mpCalendar.formatCopticLabel()}):null,
      (0,A.jsx)(`h1`,{children:c?`Good ${l}, ${c}.`:`Good ${l}.`}),
      (0,A.jsx)(`p`,{className:`lede mp-hub-flow`,children:mpTodaySteps.HUB_FLOW_LINE})
    ]}),
    (0,A.jsx)(mpWinsPanel,{variant:`hub`,onOpenJournal:o||r}),
    (0,A.jsx)(`ol`,{className:`mp-day-steps`,children:mpTodaySteps.STEP_IDS.map(e=>{
      let t=mpTodaySteps.STEP_META[e],n=mpTodaySteps.stepStatus(u,e),i=f===e,a=t.rowLabel||t.title;
      return(0,A.jsxs)(`li`,{className:`mp-day-step mp-step-row mp-step-${e}${i?` is-next`:``}${n!==`todo`?` is-${n}`:``}`,children:[
        (0,A.jsxs)(`button`,{className:`mp-step-main`,type:`button`,onClick:()=>h[e]&&h[e](),children:[
          (0,A.jsxs)(`span`,{className:`mp-step-num`,children:[`Step ${t.number}`,` · `,a]}),
          i?(0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}):null,
          n===`done`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Done`}):null,
          n===`skipped`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Skipped`}):null
        ]}),
        (0,A.jsxs)(`div`,{className:`mp-step-actions`,children:[
          n===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>m(e,`done`),children:`Mark done`}):null,
          n===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>m(e,`skipped`),children:`Skip`}):null,
          n!==`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>m(e,`todo`),children:`Undo`}):null
        ]})
      ]},e)
    })}),
    (0,A.jsx)(mpMaddyTeaser,{onOpen:s})
  ]});
}
