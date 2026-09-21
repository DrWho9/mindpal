function mpGoHome(navigate){
  return mpNav.goHome(navigate);
}
function mpNotifySession(){
  try{window.dispatchEvent(new Event(`mindpal-session-change`))}catch{}
}
function mpNeedsFaithSetup(){
  try{
    if(typeof Dt==`function`&&!Dt())return !1;
    return !mpFaith.hasFaithPreference(mpFaith.sessionPreferences()||{});
  }catch{return !1}
}
function mpShowSignInGate(){
  try{return typeof Dt==`function`?!Dt()||mpNeedsFaithSetup():!0}catch{return !0}
}
function mpSignedInName(fallback){
  try{
    let e=typeof Mt==`function`?Mt(Dt()):null;
    return (e&&e.displayName||e&&e.username||fallback||``).trim();
  }catch{return (fallback||``).trim()}
}
function mpFaithCatalog(){
  try{return typeof Ft<`u`?Ft:null}catch{return null}
}
function mpFaithChoice(stance,traditionId){
  return mpFaith.prefsFromChoice({stance,traditionId});
}
function mpSaveFaithChoice(stance,traditionId){
  return mpFaith.setSessionFaithPrefs({stance,traditionId});
}
function mpFaithPrefQuestions({mode:e=`setup`,onDone:t}){
  let n=mpFaith.sessionPreferences()||{};
  let[r,i]=(0,_.useState)(()=>mpFaith.isSecularPrefs(n)?`secular`:n.faithStance===`religious`||mpFaith.hasFaithPreference(n)?`religious`:``);
  let[a,o]=(0,_.useState)(()=>mpFaith.traditionIdFromPrefs(n)||``);
  let[s,c]=(0,_.useState)(()=>mpFaith.OTHER_TRADITIONS.some(e=>e.id===(mpFaith.traditionIdFromPrefs(n)||``)));
  let[l,u]=(0,_.useState)(``);
  function d(){
    if(r===`secular`){
      mpSaveFaithChoice(`secular`);
      t&&t(mpFaithChoice(`secular`));
      return;
    }
    if(r!==`religious`||!a){
      u(`Pick a religion, or choose Other if yours is not in the first four.`);
      return;
    }
    mpSaveFaithChoice(`religious`,a);
    t&&t(mpFaithChoice(`religious`,a));
  }
  function f(e){
    o(e);
    c(mpFaith.OTHER_TRADITIONS.some(t=>t.id===e));
    u(``);
  }
  return(0,A.jsxs)(`section`,{className:`mp-faith-pref`,"aria-label":`Faith preference`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:e===`edit`?`YOUR SPACE`:`A QUIET QUESTION`}),
    (0,A.jsx)(`h2`,{children:e===`edit`?`Faith preference`:`How should mornings meet you?`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`A short preference so we can keep scripture optional and kind. Nothing preachy — just so Today can relate to you.`}),
    (0,A.jsx)(`p`,{children:`Would you like faith-aware words, or a secular space?`}),
    (0,A.jsxs)(`div`,{className:`mp-faith-chips`,"aria-label":`Religious or not`,children:[
      (0,A.jsx)(`button`,{type:`button`,className:`mp-faith-chip${r===`religious`?` is-open`:``}`,"aria-pressed":r===`religious`,onClick:()=>{i(`religious`);u(``)},children:`I have a faith / religion`}),
      (0,A.jsx)(`button`,{type:`button`,className:`mp-faith-chip${r===`secular`?` is-open`:``}`,"aria-pressed":r===`secular`,onClick:()=>{i(`secular`);o(``);c(!1);u(``)},children:`No religion / prefer secular`})
    ]}),
    r===`religious`?(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:`So we can relate to you — what’s your religion?`}),
      (0,A.jsx)(`p`,{className:`muted`,children:`Four common choices first. Other opens a fuller list. One selection is enough.`}),
      (0,A.jsxs)(`div`,{className:`mp-faith-chips`,"aria-label":`Religion`,children:[
        mpFaith.PRIMARY_TRADITIONS.map(e=>(0,A.jsx)(`button`,{type:`button`,className:`mp-faith-chip${a===e.id?` is-open`:``}`,"aria-pressed":a===e.id,onClick:()=>f(e.id),children:e.label},e.id)),
        (0,A.jsx)(`button`,{type:`button`,className:`mp-faith-chip${s?` is-open`:``}`,"aria-pressed":s,onClick:()=>{c(e=>!e);if(mpFaith.PRIMARY_TRADITIONS.some(e=>e.id===a)){o(``)}},children:`Other`})
      ]}),
      s?(0,A.jsx)(`div`,{className:`mp-faith-chips mp-faith-chips-other`,"aria-label":`Other traditions`,children:mpFaith.OTHER_TRADITIONS.map(e=>(0,A.jsx)(`button`,{type:`button`,className:`mp-faith-chip${a===e.id?` is-open`:``}`,"aria-pressed":a===e.id,onClick:()=>f(e.id),children:e.label},e.id))}):null
    ]}):null,
    (0,A.jsx)(`p`,{className:`muted`,children:`Saved on this device with your local profile. You can change it later in Account.`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:d,children:e===`edit`?`Save preference`:r===`secular`?`Continue with a secular space`:`Continue`})
    ]}),
    l?(0,A.jsx)(`p`,{role:`status`,children:l}):null
  ]});
}
function mpSignInPage({onSignedIn:e}){
  let[t,n]=(0,_.useState)(``),[r,i]=(0,_.useState)(``),[a,o]=(0,_.useState)(``),[s,c]=(0,_.useState)(``),[l,u]=(0,_.useState)(!1),[d,f]=(0,_.useState)(()=>{try{return Tt()}catch{return[]}}),[p,m]=(0,_.useState)(()=>mpNeedsFaithSetup());
  function h(g){
    mpNotifySession();
    if(!mpFaith.hasFaithPreference(g&&g.preferences)&&!mpFaith.hasFaithPreference(mpFaith.sessionPreferences()||{})){
      m(!0);
      return;
    }
    e&&e(g);
  }
  async function g(v){
    u(!0),c(``);
    try{
      let y=v===`create`?await At(t,r,a):await jt(t,r);
      h(y);
    }catch(y){
      if(v===`create`){
        try{let b=await jt(t,r);h(b);return}catch{}
      }
      c(y instanceof Error?y.message:`Could not sign in.`);
    }finally{u(!1)}
  }
  if(p){
    return(0,A.jsxs)(`section`,{className:`mp-signin-page`,"aria-label":`Faith preference`,children:[
      (0,A.jsx)(mpFaithPrefQuestions,{mode:`setup`,onDone:()=>e&&e(mpFaith.sessionPreferences())})
    ]});
  }
  return(0,A.jsxs)(`section`,{className:`mp-signin-page`,"aria-label":`Sign in`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`YOUR SPACE`}),
    (0,A.jsx)(`h1`,{children:`Sign in to begin`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`MindPal stays on this device. Create a local profile, or choose one you already use here, so Today can greet you by name.`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Demo login only — use a throwaway password. Nothing is sent to the cloud.`}),
    d.length?(0,A.jsxs)(`div`,{className:`mp-profile-chips`,"aria-label":`Profiles on this device`,children:[
      (0,A.jsx)(`p`,{className:`muted`,children:`On this device:`}),
      d.map(v=>(0,A.jsx)(`button`,{type:`button`,className:`secondary small-button`,onClick:()=>{n(v.username),o(v.displayName||``)},children:v.displayName||v.username},v.username))
    ]}):null,
    (0,A.jsx)(`label`,{htmlFor:`mp-signin-name`,children:`What should we call you?`}),
    (0,A.jsx)(`input`,{id:`mp-signin-name`,value:a,onChange:v=>o(v.target.value),autoComplete:`nickname`,placeholder:`A first name is enough`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-signin-user`,children:`Username`}),
    (0,A.jsx)(`input`,{id:`mp-signin-user`,value:t,onChange:v=>n(v.target.value),autoComplete:`username`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-signin-pass`,children:`Password`}),
    (0,A.jsx)(`input`,{id:`mp-signin-pass`,type:`password`,value:r,onChange:v=>i(v.target.value),autoComplete:`current-password`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:l,onClick:()=>g(`in`),children:`Sign in`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,disabled:l,onClick:()=>g(`create`),children:`Create local profile`})
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
    e===`evening`?(0,A.jsx)(`h2`,{children:`Today’s wins`}):e===`nudge`?(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{className:`mp-wins-nudge`,children:`Add a daily win when something small goes well.`}),
      (0,A.jsx)(`p`,{className:`muted`,children:`Optional. Never a test.`})
    ]}):(0,A.jsxs)(A.Fragment,{children:[
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
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:l,children:`Save this win`}),
      t&&(e===`nudge`||e===`problem`)?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:t,children:`Add a win in Journal`}):null
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
function mpMorningVerse(){
  let[e,t]=(0,_.useState)(()=>mpFaith.sessionPreferences()||{});
  (0,_.useEffect)(()=>{function n(){t(mpFaith.sessionPreferences()||{})}return window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.addEventListener(`mindpal-session-change`,n),()=>{window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.removeEventListener(`mindpal-session-change`,n)}},[]);
  if(!mpFaith.shouldShowFaithModules(e))return null;
  let n=mpFaith.pickMorningVerse(mpFaithCatalog(),e);
  if(!n||!n.verse)return null;
  let r=mpFaith.shouldShowMorningPrayer(e);
  let i=typeof Pt<`u`?Pt.entries:null;
  let a=r&&i?(i[(typeof It==`function`?It():``)]||i.default):null;
  let[o,s]=(0,_.useState)(``);
  let{listening:c,listenStatus:l,toggle:u}=mt();
  let d=[n.verse.reference,n.verse.text,n.reflection,n.practice?.text?`1-min practice. ${n.practice.text}`:``,a?.prayer?.text?`Prayer. ${a.prayer.text}`:``].filter(Boolean).join(`

`);
  return(0,A.jsxs)(`section`,{id:`today-verse`,className:`simple-panel mp-morning-verse`,"aria-label":n.fallback?`Quiet reflection`:`Morning faith reading`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:mpFaith.verseEyebrow(n)}),
    (0,A.jsx)(`h3`,{children:n.verse.reference||`Today’s reading`}),
    (0,A.jsxs)(`p`,{children:[`“`,n.verse.text,`”`]}),
    n.verse.url?(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`a`,{href:n.verse.url,target:`_blank`,rel:`noreferrer`,children:`Open passage`}),n.verse.source_note?` · ${n.verse.source_note}`:``]}):n.verse.source_note?(0,A.jsx)(`p`,{children:n.verse.source_note}):null,
    n.reflection?(0,A.jsx)(`p`,{children:n.reflection}):null,
    n.practice?.text?(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`1-min practice:`}),` `,n.practice.text]}):null,
    a?.prayer?.text?(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`h3`,{children:`Prayer`}),
      (0,A.jsx)(`p`,{children:a.prayer.text}),
      a.prayer.note?(0,A.jsx)(`p`,{children:a.prayer.note}):null
    ]}):null,
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>u(d),children:c?`Pause`:`Listen`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:async()=>{let e=await ft(d+`

— MindPal faith reading`);s(e===`copied`?`Copied.`:`Could not copy.`),setTimeout(()=>s(``),2e3)},children:`Copy`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:async()=>{let e=await pt(d+`

— MindPal faith reading`,`MindPal faith reading`);e!==`cancelled`&&(s(e===`shared`?`Shared.`:e===`copied`?`Copied for sharing.`:`Could not share.`),setTimeout(()=>s(``),2e3))},children:`Share`})
    ]}),
    o||l?(0,A.jsx)(`p`,{role:`status`,"aria-live":`polite`,children:o||l}):null
  ]});
}
function mpCollapsedVerse(){
  let[e,t]=(0,_.useState)(()=>mpFaith.shouldShowFaithModules(mpFaith.sessionPreferences()||{}));
  (0,_.useEffect)(()=>{function n(){t(mpFaith.shouldShowFaithModules(mpFaith.sessionPreferences()||{}))}return window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.addEventListener(`mindpal-session-change`,n),()=>{window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.removeEventListener(`mindpal-session-change`,n)}},[]);
  if(!e)return null;
  return(0,A.jsxs)(`details`,{className:`mp-verse-collapse`,children:[
    (0,A.jsx)(`summary`,{children:`Today’s verse — tap to expand`}),
    (0,A.jsx)(mpMorningVerse,{})
  ]});
}
function mpReadingsPage(){
  let[e,t]=(0,_.useState)(()=>mpFaith.shouldShowFaithModules(mpFaith.sessionPreferences()||{}));
  (0,_.useEffect)(()=>{function n(){t(mpFaith.shouldShowFaithModules(mpFaith.sessionPreferences()||{}))}return window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.addEventListener(`mindpal-session-change`,n),()=>{window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.removeEventListener(`mindpal-session-change`,n)}},[]);
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-readings`,"aria-label":`Readings`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`READINGS`}),
    (0,A.jsx)(`h1`,{children:`Today’s readings`}),
    (0,A.jsx)(`p`,{className:`lede`,children:e?`A verse or faith reading, an optional prayer when it fits, and the pack reading for this morning. Take what helps; leave the rest.`:`Today’s pack reading. Faith words stay tucked away unless you choose them in Account.`}),
    e?(0,A.jsx)(mpMorningVerse,{}):null,
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
    (0,A.jsx)(`p`,{className:`muted`,children:`Kept here so the morning page stays tidy.`})
  ]});
}
function mpAccountFaithCard(){
  let[e,t]=(0,_.useState)(()=>mpFaith.sessionPreferences()||{});
  let[n,r]=(0,_.useState)(!1);
  (0,_.useEffect)(()=>{function n(){t(mpFaith.sessionPreferences()||{})}return window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.addEventListener(`mindpal-session-change`,n),()=>{window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,n),window.removeEventListener(`mindpal-session-change`,n)}},[]);
  return(0,A.jsxs)(`div`,{className:`mp-account-faith`,children:[
    (0,A.jsx)(`p`,{children:`Faith preference: ${mpFaith.faithSummary(e)}`}),
    (0,A.jsx)(`button`,{className:`text-button`,type:`button`,"aria-expanded":n,onClick:()=>r(e=>!e),children:n?`Close`:`Edit`}),
    n?(0,A.jsx)(mpFaithPrefQuestions,{mode:`edit`,onDone:()=>{t(mpFaith.sessionPreferences()||{});r(!1)}}):null
  ]});
}
function mpAccountFooter(){
  let e=mpSignedInName(``);
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-account-footer`,"aria-label":`Account`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`ACCOUNT`}),
    (0,A.jsx)(`h2`,{children:e?`Signed in as ${e}`:`Local account`}),
    (0,A.jsx)(`p`,{children:`Demo login only — this profile stays on this device. Nothing is sent to the cloud.`}),
    (0,A.jsx)(mpAccountFaithCard,{}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{Ot(),mpNotifySession()},children:`Sign out`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Sign out returns you to the first-run sign-in page. Your notes and wins stay on this device.`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Wins, photos and friends stay on this device. Sharing them with other people needs a future backend — nothing is uploaded today.`})
  ]});
}
function mpDedicatedProblemRoute(id){
  if(mpProblems.dedicatedProblemRoute)return mpProblems.dedicatedProblemRoute(id);
  if(id===`mothers`)return`Struggling mothers`;
  if(id===`aod`)return`Drugs & alcohol`;
  if(id===`mens-health`)return mpProblems.MENS_HEALTH_ROUTE||`Mens health`;
  return`Problem`;
}
function mpOpenProblem(id,onOpen){
  mpProblems.selectProblem(id);
  try{window.dispatchEvent(new Event(`mindpal-problem-change`))}catch{}
  onOpen&&onOpen(id);
}
function mpProblemChipClass(item,open){
  let extra=item.group===`growth`||mpProblems.isGrowthProblem&&mpProblems.isGrowthProblem(item)
    ?` mp-problem-chip-growth`
    :item.id===`mothers`?` mp-problem-chip-mothers`:item.id===`aod`?` mp-problem-chip-aod`:item.id===`mens-health`?` mp-problem-chip-mens`:``;
  return `mp-problem-chip${open?` is-open`:``}${extra}`;
}
function mpVisibleProblemGroups(){
  let e=mpProblems.listProblemGroups?mpProblems.listProblemGroups(mpProblemHubs):[{id:`support`,title:`Support`,lede:`When it's heavy`,problems:mpProblems.listProblems(mpProblemHubs)},{id:`growth`,title:`Growth`,lede:`Build strength`,problems:[]}];
  if(mpFaith.shouldShowFaithModules(mpFaith.sessionPreferences()||{}))return e;
  return e.map(t=>({...t,problems:(t.problems||[]).filter(t=>t.id!==`faith`)})).filter(t=>(t.problems||[]).length);
}
function mpProblemHubList({onOpen:e,variant:t=`explore`}){
  let[n,o]=(0,_.useState)(()=>mpVisibleProblemGroups()),[r,i]=(0,_.useState)(null);
  (0,_.useEffect)(()=>{
    function e(){i(null)}
    function t(){o(mpVisibleProblemGroups())}
    window.addEventListener(mpNav.HOME_EVENT,e);
    window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,t);
    window.addEventListener(`mindpal-session-change`,t);
    return()=>{window.removeEventListener(mpNav.HOME_EVENT,e);window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,t);window.removeEventListener(`mindpal-session-change`,t)};
  },[]);
  function chipsFor(group){return group.problems||[]}
  return(0,A.jsxs)(`section`,{className:`mp-problem-list mp-problem-list-${t}`,"aria-label":`What do you need help with?`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`SUPPORT & GROWTH`}),
    (0,A.jsx)(`h2`,{children:`What do you need help with?`}),
    (0,A.jsx)(`p`,{children:t===`today`?`Tap a chip to expand. Open hub for readings, videos and a journal line.`:`Tap a chip to expand. Each hub gathers readings, videos, Companion and a journal prompt.`}),
    n.map(g=>{
      let items=chipsFor(g);
      if(!items.length)return null;
      let open=items.find(e=>e.id===r)||null;
      return(0,A.jsxs)(`div`,{className:`mp-problem-group mp-problem-group-${g.id}`,"aria-label":g.title,children:[
        (0,A.jsx)(`p`,{className:`mp-problem-group-title`,children:g.title}),
        (0,A.jsx)(`p`,{className:`muted mp-problem-group-lede`,children:g.lede}),
        (0,A.jsx)(`div`,{className:`mp-problem-chips`,children:items.map(t=>{
          let a=r===t.id;
          return(0,A.jsx)(`button`,{type:`button`,className:mpProblemChipClass(t,a),"aria-expanded":a,onClick:()=>i(a?null:t.id),children:t.shortTitle||t.title},t.id);
        })}),
        open?(0,A.jsxs)(`div`,{className:`mp-problem-expand`,children:[
          (0,A.jsx)(`h3`,{children:open.title}),
          (0,A.jsx)(`p`,{children:open.intro}),
          (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>mpOpenProblem(r,e),children:`Open hub`})
        ]}):null
      ]},g.id);
    })
  ]});
}
function mpMotherYtEntries(problem){
  let e=mpMeditationCatalog&&mpReadings.meditationCategories(mpMeditationCatalog)||[];
  let t=problem&&Array.isArray(problem.meditationCategoryIds)&&problem.meditationCategoryIds.length
    ?problem.meditationCategoryIds
    :mpProblems.MOTHERS_MEDITATION_IDS||[`sleep`,`self-compassion`,`anxiety`];
  let n=[];
  for(let r of t){
    let i=e.find(e=>e&&e.id===r);
    if(!i)continue;
    n.push(...mpReadings.entriesForCategory(i).filter(e=>mpReadings.meditationOpenUrl(e)).slice(0,2));
  }
  return n.slice(0,6);
}
function mpMothersFeelingsChip({onOpen:e}){
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-mothers-feelings`,"aria-label":`Struggling mothers`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`A SITUATION, NOT A DIAGNOSIS`}),
    (0,A.jsx)(`h2`,{children:`Struggling mothers`}),
    (0,A.jsx)(`p`,{children:`If the hard part is caring for little ones — tired, stretched, a bit guilty — there is a quiet space for that. Optional support, not medical care.`}),
    e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:e,children:`Open the mothers space`}):null
  ]});
}
function mpAodFeelingsChip({onOpen:e}){
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-aod-feelings`,"aria-label":`Drugs & alcohol`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`OPTIONAL SUPPORT · NOT TREATMENT`}),
    (0,A.jsx)(`h2`,{children:`Drugs & alcohol`}),
    (0,A.jsx)(`p`,{children:`If drink or other substances are taking up space — craving, shame, or trying again — there is a quiet directory here. Optional company, not detox and not a replacement for AOD treatment.`}),
    (0,A.jsx)(mpSupportReadings,{feelingId:`aod`,heading:`Readings for drugs & alcohol`,showChips:!1}),
    e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:e,children:`Open the drugs & alcohol space`}):null
  ]});
}
function mpMensHealthFeelingsChip({onOpen:e}){
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-mens-feelings`,"aria-label":`Men's Health`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`MINDPAL · MEN’S HEALTH`}),
    (0,A.jsx)(`h2`,{children:`Men's Health`}),
    (0,A.jsx)(`p`,{children:`There's nothing wrong with being your best self. A strength-based MindPal space for responsibility, courage, brotherhood and showing up — not a diagnosis.`}),
    e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:e,children:`Open the Men's Health hub`}):null
  ]});
}
function mpMothersWomenCard({onOpen:e}){
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-mothers-women`,"aria-label":`Struggling mothers`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`WOMEN’S WELLBEING`}),
    (0,A.jsx)(`h2`,{children:`Struggling mothers`}),
    (0,A.jsx)(`p`,{children:`Pregnancy and postnatal medical pathways still wait for specialist review. If you are a mother under pressure — exhausted, guilty, or short of space — this is optional company, not a clinic.`}),
    e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:e,children:`Open the mothers space`}):null
  ]});
}
function mpMothersHubPage({onCompanion:e,onJournal:t,onExplore:n,onAddWin:r,onHelp:i,onWomen:a}){
  (0,_.useEffect)(()=>{mpOpenProblem(`mothers`)},[]);
  let o=mpProblems.findProblem(mpProblemHubs,`mothers`);
  if(!o)return(0,A.jsx)(`p`,{children:`The mothers space is not loaded yet.`});
  let s=mpProblems.readingsForProblem(mpPackA,`mothers`),c=mpProblems.maddyForProblem(mpMaddy,`mothers`),l=mpMotherYtEntries(o);
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem mp-lane-mothers`,"aria-label":`Struggling mothers`,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`MOTHERS · OPTIONAL SUPPORT`}),
    (0,A.jsx)(`h1`,{children:`Struggling mothers`}),
    (0,A.jsx)(`p`,{className:`lede`,children:o.intro}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Warm company for a hard stretch. Not a diagnosis, not therapy, and not a replacement for a GP, midwife or maternal-child nurse.`}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Verse / Readings`}),
      (0,A.jsx)(`p`,{children:`Support excerpts tagged for motherhood, exhaustion, overwhelm, guilt, self-compassion and faith. The main Readings path still unlocks one Pack A morning at a time — opening here does not mark a day Done.`}),
      s.length?(0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:s.map(e=>{
        let t=mpProblems.motherSupportTags?mpProblems.motherSupportTags(e):[];
        return(0,A.jsxs)(`li`,{children:[
          (0,A.jsx)(`strong`,{children:e.title}),
          (0,A.jsxs)(`span`,{className:`muted`,children:[`Day `,e.day,e.theme_label?` · ${e.theme_label}`:``]}),
          t.length?(0,A.jsx)(`span`,{className:`mp-hub-tags`,children:t.join(` · `)}):null
        ]},e.id);
      })}):(0,A.jsx)(`p`,{className:`muted`,children:`No tagged mother readings yet.`}),
      n?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:n,children:`Open today’s Readings`}):null
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Videos`}),
      (0,A.jsx)(`p`,{children:`Soothing Maddy clips and YouTube meditations for overwhelm, sleep and self-compassion. No speaker library dump here.`}),
      c.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Watch with Maddy`}),
        (0,A.jsx)(`div`,{className:`maddy-video-grid`,children:c.map(e=>(0,A.jsxs)(`button`,{type:`button`,className:`maddy-video-card`,onClick:()=>mpReadings.activateLibraryVideo({...e,person:`Maddy`,kind:`maddy`,src:e.src,videoUrl:e.src}),children:[
          (0,A.jsx)(`h3`,{children:e.cardTitle||e.title}),
          (0,A.jsx)(`p`,{children:e.description}),
          (0,A.jsx)(`span`,{className:`card-link`,children:`Play`})
        ]},e.id))})
      ]}):null,
      l.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Voice-guided on YouTube`}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Link-out only. MindPal does not host or embed this audio.`}),
        (0,A.jsx)(`ul`,{className:`mp-hub-yt`,children:l.map(e=>{
          let t=mpReadings.meditationOpenUrl(e);
          return(0,A.jsxs)(`li`,{children:[
            (0,A.jsx)(`strong`,{children:e.title}),
            (0,A.jsx)(`span`,{className:`muted`,children:e.channel||``}),
            t?(0,A.jsx)(`a`,{className:`secondary`,href:t,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`}):null
          ]},e.id);
        })})
      ]}):(0,A.jsx)(`p`,{className:`muted`,children:`YouTube meditation links for this theme are filling.`})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Companion`}),
      (0,A.jsx)(`p`,{children:`Opens Companion with a mother-support prompt — educational and peer-like. It is software, not a therapist, and it cannot watch over you or treat postnatal depression.`}),
      e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(o.companionPrompt);e(o.companionPrompt)},children:`Talk this through with Companion`}):null
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Journal / wins`}),
      (0,A.jsx)(`p`,{children:o.journalPrompt}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        t?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>t(o.journalPrompt),children:`Write this in Journal`}):null
      ]}),
      (0,A.jsx)(mpWinsPanel,{variant:`problem`,onOpenJournal:r||(t?()=>t(`A small win amid caring for others: `):null)})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel mp-mothers-safety`,children:[
      (0,A.jsx)(`h2`,{children:`If this feels like too much`}),
      (0,A.jsx)(`p`,{children:`MindPal does not monitor you. If you are in immediate danger in Australia, call 000. Need support lists human help, including Lifeline.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        i?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:i,children:`Need support`}):null,
        a?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:a,children:`Women’s wellbeing`}):null
      ]})
    ]})
  ]});
}
function mpAodHubPage({onCompanion:e,onJournal:t,onExplore:n,onAddWin:r,onHelp:i}){
  (0,_.useEffect)(()=>{mpOpenProblem(`aod`)},[]);
  let[f,p]=(0,_.useState)(!1);
  let o=mpProblems.findProblem(mpProblemHubs,`aod`);
  if(!o)return(0,A.jsx)(`p`,{children:`The drugs & alcohol space is not loaded yet.`});
  let s=mpProblems.readingsForProblem(mpPackA,`aod`),c=mpProblems.maddyForProblem(mpMaddy,`aod`),l=mpMotherYtEntries(o);
  let u=s[0]||null,d=u?s.slice(1):s;
  let opener=mpProblems.ownerCompanionOpener?mpProblems.ownerCompanionOpener(`aod`,o.companionPrompt):o.companionPrompt;
  let featuredTags=u&&mpProblems.aodSupportTags?mpProblems.aodSupportTags(u):[];
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem mp-lane-aod`,"aria-label":`Drugs & alcohol`,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`DRUGS & ALCOHOL · OPTIONAL SUPPORT`}),
    (0,A.jsx)(`h1`,{children:`Drugs & alcohol`}),
    (0,A.jsx)(`p`,{className:`lede`,children:o.intro}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Not detox, not medical advice, and not a replacement for alcohol and other drug treatment. Soft pointers only.`}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Verse / Readings`}),
      (0,A.jsx)(`p`,{children:`Start with the MindPal original talk-through on drugs and alcohol — DNA is only a nickname for that phrase, not genetics. Tagged support excerpts sit underneath. The main Readings path still unlocks one Pack A morning at a time — opening here does not mark a day Done.`}),
      u?(0,A.jsxs)(`article`,{className:`mp-hub-featured`,"aria-label":`Featured talk-through`,children:[
        (0,A.jsx)(`p`,{className:`eyebrow`,children:`FEATURED · MINDPAL ORIGINAL`}),
        (0,A.jsx)(`h3`,{children:u.title}),
        (0,A.jsx)(`p`,{children:u.excerpt||(u.body||``).split(`\n\n`)[0]}),
        featuredTags.length?(0,A.jsx)(`span`,{className:`mp-hub-tags`,children:featuredTags.join(` · `)}):null,
        f?(0,A.jsxs)(`div`,{className:`mp-hub-featured-body`,children:[
          (u.body||``).split(`\n\n`).map((e,t)=>(0,A.jsx)(`p`,{children:e},t)),
          u.practice?(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Practice:`}),` `,u.practice]}):null,
          (0,A.jsx)(`p`,{className:`mp-support-gate`,role:`status`,children:mpReadings.supportUnlockMessage?mpReadings.supportUnlockMessage(u,s,[]):`MindPal original support reading — always open.`})
        ]}):null,
        (0,A.jsxs)(`div`,{className:`button-row`,children:[
          (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>p(e=>!e),children:f?`Hide the talk-through`:`Read the talk-through`}),
          e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(opener);e(opener)},children:`Talk this through with Companion`}):null
        ]})
      ]}):null,
      d.length?(0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:d.map(e=>{
        let t=mpProblems.aodSupportTags?mpProblems.aodSupportTags(e):[];
        return(0,A.jsxs)(`li`,{children:[
          (0,A.jsx)(`strong`,{children:e.title}),
          (0,A.jsxs)(`span`,{className:`muted`,children:[`Day `,e.day,e.theme_label?` · ${e.theme_label}`:``]}),
          t.length?(0,A.jsx)(`span`,{className:`mp-hub-tags`,children:t.join(` · `)}):null
        ]},e.id);
      })}):u?null:(0,A.jsx)(`p`,{className:`muted`,children:`No tagged drugs & alcohol readings yet.`}),
      n?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:n,children:`Open today’s Readings`}):null
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Videos`}),
      (0,A.jsx)(`p`,{children:`Soothing Maddy clips and YouTube meditations for self-compassion, worry and stress. No speaker library dump here.`}),
      c.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Watch with Maddy`}),
        (0,A.jsx)(`div`,{className:`maddy-video-grid`,children:c.map(e=>(0,A.jsxs)(`button`,{type:`button`,className:`maddy-video-card`,onClick:()=>mpReadings.activateLibraryVideo({...e,person:`Maddy`,kind:`maddy`,src:e.src,videoUrl:e.src}),children:[
          (0,A.jsx)(`h3`,{children:e.cardTitle||e.title}),
          (0,A.jsx)(`p`,{children:e.description}),
          (0,A.jsx)(`span`,{className:`card-link`,children:`Play`})
        ]},e.id))})
      ]}):null,
      l.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Voice-guided on YouTube`}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Link-out only. MindPal does not host or embed this audio.`}),
        (0,A.jsx)(`ul`,{className:`mp-hub-yt`,children:l.map(e=>{
          let t=mpReadings.meditationOpenUrl(e);
          return(0,A.jsxs)(`li`,{children:[
            (0,A.jsx)(`strong`,{children:e.title}),
            (0,A.jsx)(`span`,{className:`muted`,children:e.channel||``}),
            t?(0,A.jsx)(`a`,{className:`secondary`,href:t,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`}):null
          ]},e.id);
        })})
      ]}):(0,A.jsx)(`p`,{className:`muted`,children:`YouTube meditation links for this theme are filling.`})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Companion`}),
      (0,A.jsx)(`p`,{children:`Opens Companion on the drugs and alcohol talk-through — the puppy-and-treat loop. DNA is only a nickname for drugs and alcohol, not genetics. It is software, not a therapist or AOD clinician, and it cannot watch over you or run detox.`}),
      e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(opener);e(opener)},children:`Talk this through with Companion`}):null
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Journal / wins`}),
      (0,A.jsx)(`p`,{children:o.journalPrompt}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        t?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>t(o.journalPrompt),children:`Write this in Journal`}):null
      ]}),
      (0,A.jsx)(mpWinsPanel,{variant:`problem`,onOpenJournal:r||(t?()=>t(`A small, honest win today: `):null)})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel mp-aod-safety`,children:[
      (0,A.jsx)(`h2`,{children:`If you are in danger, or intoxicated and unsafe`}),
      (0,A.jsx)(`p`,{children:`This space is not detox and not a replacement for AOD treatment. If you are intoxicated and in danger, or in crisis in Australia, call 000. Need support lists human help and counselling lines already in the app, including Lifeline — we do not invent extra numbers here.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        i?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:i,children:`Need support`}):null
      ]})
    ]})
  ]});
}
function mpMensAccordion({id:e,title:t,lede:n,openId:r,onToggle:i,children:a}){
  let o=r===e;
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-hub-acc${o?` is-open`:``}`,"aria-label":t,children:[
    (0,A.jsxs)(`button`,{className:`mp-hub-acc-toggle`,type:`button`,"aria-expanded":o,onClick:()=>i(o?``:e),children:[
      (0,A.jsx)(`h2`,{children:t}),
      (0,A.jsx)(`span`,{className:`mp-hub-acc-flag`,children:o?`Open · tap to hide`:`Tap to open`})
    ]}),
    n?(0,A.jsx)(`p`,{className:`muted`,children:n}):null,
    o?a:null
  ]});
}
function mpMensHealthHubPage({onCompanion:e,onJournal:t,onExplore:n,onAddWin:r,onHelp:i}){
  (0,_.useEffect)(()=>{mpOpenProblem(`mens-health`)},[]);
  let[f,p]=(0,_.useState)(`picture`);
  let[m,h]=(0,_.useState)(``);
  let o=mpProblems.findProblem(mpProblemHubs,`mens-health`);
  if(!o)return(0,A.jsx)(`p`,{children:`The MindPal Men's Health hub is not loaded yet.`});
  let s=mpProblems.readingsForProblem(mpPackA,`mens-health`);
  let stats=mpProblems.mensHealthStats?mpProblems.mensHealthStats():[];
  let yt=mpProblems.mensHealthYoutube?mpProblems.mensHealthYoutube():[];
  let lines=mpProblems.mensHealthHelplines?mpProblems.mensHealthHelplines():[];
  let queued=mpProblems.mensHealthQueuedVideos?mpProblems.mensHealthQueuedVideos():[];
  let featured=mpProblems.featuredMensHelpline?mpProblems.featuredMensHelpline():null;
  let opener=mpProblems.ownerCompanionOpener?mpProblems.ownerCompanionOpener(`mens-health`,o.companionPrompt):o.companionPrompt;
  function toggle(id){p(e=>e===id?``:id)}
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem mp-lane-mens`,"aria-label":`Men's Health`,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`MINDPAL · MEN’S HEALTH`}),
    (0,A.jsx)(`h1`,{children:`Men's Health`}),
    (0,A.jsx)(`p`,{className:`lede mp-mens-hero`,children:`There's nothing wrong with being your best self.`}),
    (0,A.jsx)(`p`,{className:`lede`,children:o.intro}),
    (0,A.jsx)(`p`,{className:`muted`,children:`MindPal offers reflection and support — not a diagnosis, not treatment, and not a replacement for a GP or a counsellor. In immediate danger in Australia, call 000.`}),
    (0,A.jsxs)(`section`,{className:`simple-panel mp-mens-strip`,"aria-label":`Australian men and women — official figures`,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`AUSTRALIA · MEN AND WOMEN`}),
      (0,A.jsx)(`h2`,{children:`The numbers, then the work`}),
      (0,A.jsx)(`p`,{children:`Official ABS figures — literacy only. MindPal does not invent rates. Sources sit on each card.`}),
      stats.length?(0,A.jsx)(`div`,{className:`mp-mens-compare`,children:stats.map(e=>(0,A.jsxs)(`article`,{className:`mp-mens-stat`,children:[
        (0,A.jsx)(`h3`,{children:e.topic}),
        (0,A.jsx)(`p`,{className:`muted`,children:e.period}),
        (0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Men`}),` · `,e.male]}),
        e.maleRate?(0,A.jsx)(`p`,{className:`muted`,children:e.maleRate}):null,
        (0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Women`}),` · `,e.female]}),
        e.femaleRate?(0,A.jsx)(`p`,{className:`muted`,children:e.femaleRate}):null,
        e.compare?(0,A.jsx)(`p`,{children:e.compare}):null,
        (0,A.jsx)(`a`,{className:`text-button`,href:e.sourceUrl,target:`_blank`,rel:`noopener noreferrer`,children:e.sourceLabel})
      ]},e.id))}):(0,A.jsx)(`p`,{children:`Official comparison figures are loading.`}),
      (0,A.jsx)(`p`,{className:`mp-mens-bridge`,children:`The picture is uneven. The invitation is not shame. It is skill: show up for family, mates and work. There's nothing wrong with being your best self.`})
    ]}),
    (0,A.jsx)(mpMensAccordion,{id:`picture`,title:`The picture in Australia`,lede:`ABS suicide, prison and homelessness figures — tap to open.`,openId:f,onToggle:toggle,children:(0,A.jsxs)(`div`,{className:`mp-hub-acc-body`,children:[
      (0,A.jsx)(`p`,{children:`MindPal shows these official comparisons so the load on Australian men is not invisible. They are not a verdict on you, and they are not a diagnosis.`}),
      stats.length?(0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:stats.map(e=>(0,A.jsxs)(`li`,{children:[
        (0,A.jsx)(`strong`,{children:e.topic}),
        (0,A.jsx)(`span`,{className:`muted`,children:e.period}),
        (0,A.jsxs)(`span`,{children:[`Men: `,e.male,e.maleRate?` · ${e.maleRate}`:``]}),
        (0,A.jsxs)(`span`,{children:[`Women: `,e.female,e.femaleRate?` · ${e.femaleRate}`:``]}),
        e.note?(0,A.jsx)(`span`,{className:`muted`,children:e.note}):null,
        (0,A.jsx)(`a`,{href:e.sourceUrl,target:`_blank`,rel:`noopener noreferrer`,children:e.sourceLabel})
      ]},e.id))}):null
    ]})}),
    (0,A.jsx)(mpMensAccordion,{id:`bestself`,title:`Best self`,lede:`Short original MindPal readings — discipline, mateship, purpose, fatherhood, courage, sleep and work.`,openId:f,onToggle:toggle,children:(0,A.jsxs)(`div`,{className:`mp-hub-acc-body`,children:[
      (0,A.jsx)(`p`,{children:`Strength-based MindPal pieces. Opening here does not mark a Pack A day Done. Take what helps; leave the rest.`}),
      s.length?(0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:s.map(item=>{
        let extra=mpProblems.mensSupportTags?mpProblems.mensSupportTags(item):[];
        let open=m===item.id;
        return(0,A.jsxs)(`li`,{children:[
          (0,A.jsx)(`strong`,{children:item.title}),
          extra.length?(0,A.jsx)(`span`,{className:`mp-hub-tags`,children:extra.join(` · `)}):null,
          item.excerpt&&!open?(0,A.jsx)(`p`,{children:item.excerpt}):null,
          open?(0,A.jsxs)(`div`,{className:`mp-hub-featured-body`,children:[
            (item.body||``).split(`\n\n`).map((para,idx)=>(0,A.jsx)(`p`,{children:para},idx)),
            item.practice?(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Practice:`}),` `,item.practice]}):null
          ]}):null,
          (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>h(open?``:item.id),children:open?`Hide this reading`:`Read this piece`})
        ]},item.id);
      })}):(0,A.jsx)(`p`,{className:`muted`,children:`MindPal best-self readings are filling.`}),
      n?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:n,children:`Open today’s Readings`}):null
    ]})}),
    (0,A.jsx)(mpMensAccordion,{id:`watch`,title:`Watch / listen`,lede:`External YouTube only. MindPal does not host or embed these clips.`,openId:f,onToggle:toggle,children:(0,A.jsxs)(`div`,{className:`mp-hub-acc-body`,children:[
      (0,A.jsx)(`p`,{children:`Official and well-known Australian men’s health and support channels. Labelled external. Link-out only.`}),
      yt.length?(0,A.jsx)(`ul`,{className:`mp-hub-yt`,children:yt.map(item=>(0,A.jsxs)(`li`,{children:[
        (0,A.jsx)(`strong`,{children:item.title}),
        (0,A.jsx)(`span`,{className:`muted`,children:`${item.channel} · External YouTube`}),
        item.blurb?(0,A.jsx)(`p`,{children:item.blurb}):null,
        (0,A.jsx)(`a`,{className:`secondary`,href:item.url,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`})
      ]},item.id))}):(0,A.jsx)(`p`,{className:`muted`,children:`YouTube references are filling.`})
    ]})}),
    (0,A.jsx)(mpMensAccordion,{id:`talk`,title:`Talk to someone`,lede:`Human help. MindPal does not monitor you.`,openId:f,onToggle:toggle,children:(0,A.jsxs)(`div`,{className:`mp-hub-acc-body`,children:[
      featured?(0,A.jsxs)(`article`,{className:`mp-hub-featured mp-mens-featured-help`,"aria-label":`MensLine Australia`,children:[
        (0,A.jsx)(`p`,{className:`eyebrow`,children:`FEATURED · MENSLINE AUSTRALIA`}),
        (0,A.jsx)(`h3`,{children:featured.name}),
        (0,A.jsx)(`p`,{className:`mp-mens-phone`,children:featured.phone}),
        (0,A.jsx)(`p`,{children:featured.blurb}),
        featured.url?(0,A.jsx)(`a`,{className:`primary`,href:featured.url,target:`_blank`,rel:`noopener noreferrer`,children:`MensLine website`}):null
      ]}):null,
      (0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:lines.filter(e=>!e.featured).map(item=>(0,A.jsxs)(`li`,{children:[
        (0,A.jsx)(`strong`,{children:item.name}),
        (0,A.jsx)(`span`,{className:`mp-mens-phone`,children:item.phone}),
        item.blurb?(0,A.jsx)(`p`,{children:item.blurb}):null
      ]},item.id))}),
      (0,A.jsx)(`p`,{className:`muted`,children:`MensLine Australia 1300 78 99 78 · Lifeline 13 11 14 · Beyond Blue 1300 22 4636 · Emergency 000. MindPal does not invent extra numbers here.`}),
      i?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:i,children:`Need support`}):null
    ]})}),
    (0,A.jsx)(mpMensAccordion,{id:`videos`,title:`MindPal videos (soon)`,lede:`Queued titles only. No HeyGen render in this hub.`,openId:f,onToggle:toggle,children:(0,A.jsxs)(`div`,{className:`mp-hub-acc-body`,children:[
      (0,A.jsx)(`p`,{children:`MindPal will film short companion clips for this hub later. Nothing here is a HeyGen draft and nothing is claimed as ready to play.`}),
      (0,A.jsx)(`p`,{className:`muted`,children:`Queued script titles:`}),
      (0,A.jsx)(`ol`,{className:`mp-mens-queue`,children:queued.map(item=>(0,A.jsx)(`li`,{children:item.title},item.id))})
    ]})}),
    (0,A.jsx)(mpMensAccordion,{id:`companion`,title:`Companion / journal`,lede:`Optional. Software, not a therapist.`,openId:f,onToggle:toggle,children:(0,A.jsxs)(`div`,{className:`mp-hub-acc-body`,children:[
      (0,A.jsx)(`h3`,{children:`Companion`}),
      (0,A.jsx)(`p`,{children:`Opens Companion with a Men's Health prompt — educational and peer-like. It is software, not a therapist, and it cannot watch over you.`}),
      e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(opener);e(opener)},children:`Talk this through with Companion`}):null,
      (0,A.jsx)(`h3`,{children:`Journal / wins`}),
      (0,A.jsx)(`p`,{children:o.journalPrompt}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        t?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>t(o.journalPrompt),children:`Write this in Journal`}):null
      ]}),
      (0,A.jsx)(mpWinsPanel,{variant:`problem`,onOpenJournal:r||(t?()=>t(`A way I showed up today: `):null)})
    ]})})
  ]});
}
function mpProblemHubPage({onOpenVideo:e,onCompanion:t,onJournal:n,onExplore:r,onAddWin:i,onHelp:a,onWomen:o,onSpeakers:v}){
  let[s,c]=(0,_.useState)(()=>mpProblems.selectedProblemId());
  (0,_.useEffect)(()=>{function e(){c(mpProblems.selectedProblemId())}return window.addEventListener(`mindpal-problem-change`,e),e(),()=>window.removeEventListener(`mindpal-problem-change`,e)},[]);
  if(s===`mothers`)return(0,A.jsx)(mpMothersHubPage,{onCompanion:t,onJournal:n,onExplore:r,onAddWin:i,onHelp:a,onWomen:o});
  if(s===`aod`)return(0,A.jsx)(mpAodHubPage,{onCompanion:t,onJournal:n,onExplore:r,onAddWin:i,onHelp:a});
  if(s===`mens-health`)return(0,A.jsx)(mpMensHealthHubPage,{onCompanion:t,onJournal:n,onExplore:r,onAddWin:i,onHelp:a});
  let l=mpProblems.findProblem(mpProblemHubs,s);
  if(!l)return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem`,"aria-label":`Problem hub`,children:[
    (0,A.jsx)(`h1`,{children:`What do you need help with?`}),
    (0,A.jsx)(mpProblemHubList,{onOpen:e=>{c(e)}})
  ]});
  let u=mpProblems.readingsForProblem(mpPackA,l.id);
  let growth=l.group===`growth`||(mpProblems.isGrowthProblem&&mpProblems.isGrowthProblem(l));
  let videoTag=mpProblems.videoTagForProblem?mpProblems.videoTagForProblem(l.id):l.id;
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem${growth?` mp-lane-growth`:``}`,"aria-label":l.title,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:growth?`GROWTH · BUILD STRENGTH`:`SUPPORT · WHEN IT'S HEAVY`}),
    (0,A.jsx)(`h1`,{children:l.title}),
    (0,A.jsx)(`p`,{className:`lede`,children:l.intro}),
    (0,A.jsx)(`p`,{className:`muted`,children:mpProblemHubs.disclaimer}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Readings`}),
      (0,A.jsx)(`p`,{children:`Pack A mornings tagged for this theme. The daily Done gate still lives on the Readings page.`}),
      u.length?(0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:u.map(e=>(0,A.jsxs)(`li`,{children:[
        (0,A.jsx)(`strong`,{children:e.title}),
        (0,A.jsxs)(`span`,{className:`muted`,children:[`Day `,e.day,e.theme_label?` · ${e.theme_label}`:``]})
      ]},e.id))}):(0,A.jsx)(`p`,{className:`muted`,children:`No tagged readings for this theme yet.`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>r&&r(),children:`Open today’s Readings`})
    ]}),
    (0,A.jsx)(mpSupportVideos,{initialTag:videoTag,heading:growth?`Videos for this theme`:`Videos for this feeling`,showChips:!1,onSpeakers:v}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Companion`}),
      (0,A.jsx)(`p`,{children:growth?`Opens Companion with a short educational prompt for this growth theme. The usual disclaimer stays — this is not a therapist or emergency service.`:`Opens Companion with a short educational prompt for this problem. The usual disclaimer stays — this is not a therapist or emergency service.`}),
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(l.companionPrompt);t&&t(l.companionPrompt)},children:`Talk this through with Companion`})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Journal`}),
      (0,A.jsx)(`p`,{children:l.journalPrompt}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        n?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>n(l.journalPrompt),children:`Write this in Journal`}):null
      ]}),
      (0,A.jsx)(mpWinsPanel,{variant:`problem`,onOpenJournal:i||(n?()=>n(`A small win today: `):null)})
    ]})
  ]});
}
function mpNotifyRitual(){
  try{mpTeamRitual.notifyRitualChange()}catch{}
}
function mpSaveRitual(next){
  let e=mpTeamRitual.saveRitual(next,mpPackA);
  mpNotifyRitual();
  return e;
}
function mpTeamRitualCard({onOpen:e}){
  let[t,n]=(0,_.useState)(()=>mpTeamRitual.loadRitual(mpPackA)),[r,i]=(0,_.useState)(!1);
  (0,_.useEffect)(()=>{function e(){n(mpTeamRitual.loadRitual(mpPackA))}return window.addEventListener(mpTeamRitual.TEAM_RITUAL_CHANGE_EVENT,e),()=>window.removeEventListener(mpTeamRitual.TEAM_RITUAL_CHANGE_EVENT,e)},[]);
  let a=mpTeamRitual.ritualStepStatus(t,`breathe`),o=mpTeamRitual.ritualStepStatus(t,`reading`),s=mpTeamRitual.nextRitualStep(t);
  let c=s===`reading`?`Continue to the reading`:s?`Start the settle`:`Open the ritual again`;
  return(0,A.jsxs)(`section`,{className:`mp-team-ritual-card`,"aria-label":`Work team morning ritual`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:mpTeamRitual.TEAM_RITUAL_EYEBROW}),
    (0,A.jsx)(`h2`,{children:mpTeamRitual.TEAM_RITUAL_TITLE}),
    (0,A.jsx)(`p`,{children:mpTeamRitual.TEAM_RITUAL_LEDE}),
    (0,A.jsx)(`p`,{className:`muted`,children:mpTeamRitual.TEAM_RITUAL_HINT}),
    (0,A.jsx)(`button`,{className:`text-button`,type:`button`,"aria-expanded":r,onClick:()=>i(e=>!e),children:r?`Hide the two steps`:`See the two steps`}),
    r?(0,A.jsxs)(`ol`,{className:`mp-team-ritual-steps`,children:[
      (0,A.jsxs)(`li`,{className:a!==`todo`?`is-${a}`:``,children:[
        (0,A.jsx)(`strong`,{children:`Step 1 · Breathe (~3 min)`}),
        (0,A.jsx)(`span`,{children:mpTeamRitual.RITUAL_STEPS.breathe.blurb}),
        a!==`todo`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:a===`done`?`Done`:`Skipped`}):null
      ]}),
      (0,A.jsxs)(`li`,{className:`${o!==`todo`?`is-${o} `:``}${s===`reading`?`is-next`:``}`,children:[
        (0,A.jsx)(`strong`,{children:`Step 2 · Peaceful reading`}),
        (0,A.jsx)(`span`,{children:mpTeamRitual.RITUAL_STEPS.reading.blurb}),
        s===`reading`?(0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}):null,
        o!==`todo`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:o===`done`?`Done`:`Skipped`}):null
      ]})
    ]}):null,
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      e?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:e,children:c}):null
    ]})
  ]});
}
function mpTeamRitualPage({onToday:e,onReadings:t}){
  let[n,r]=(0,_.useState)(()=>mpTeamRitual.loadRitual(mpPackA));
  let[i,a]=(0,_.useState)(()=>mpTeamRitual.canOpenReading(mpTeamRitual.loadRitual(mpPackA))?`reading`:`breathe`);
  let[o,s]=(0,_.useState)(!1);
  let[c,l]=(0,_.useState)(0);
  let u=(0,_.useRef)(null);
  let{listening:d,listenStatus:f,toggle:p,stop:m}=mt();
  let h=mpTeamRitual.breathClip(mpMaddy);
  let g=mpReadings.maddyPublishedSrc(mpTeamRitual.breathClipSrc(mpMaddy));
  let v=mpTeamRitual.ritualReading(mpPackA,n);
  let y=mpTeamRitual.ritualStepStatus(n,`breathe`);
  let b=mpTeamRitual.ritualStepStatus(n,`reading`);
  let x=mpTeamRitual.canOpenReading(n);
  let S=mpTeamRitual.nextRitualStep(n);
  let C=mpTeamRitual.breathCueAt(c);
  let w=mpTeamRitual.formatBreathClock(Math.max(0,mpTeamRitual.BREATH_DURATION_SEC-c));
  (0,_.useEffect)(()=>{function e(){r(mpTeamRitual.loadRitual(mpPackA))}return window.addEventListener(mpTeamRitual.TEAM_RITUAL_CHANGE_EVENT,e),()=>window.removeEventListener(mpTeamRitual.TEAM_RITUAL_CHANGE_EVENT,e)},[]);
  (0,_.useEffect)(()=>{if(!o)return;let e=setInterval(()=>{l(t=>{let n=t+1;if(n>=mpTeamRitual.BREATH_DURATION_SEC){s(!1);let t=mpSaveRitual(mpTeamRitual.markRitual(mpTeamRitual.loadRitual(mpPackA),`breathe`,`done`));r(t);try{u.current&&u.current.pause()}catch{}return mpTeamRitual.BREATH_DURATION_SEC}return n})},1e3);return()=>clearInterval(e)},[o]);
  (0,_.useEffect)(()=>()=>{m&&m()},[m]);
  function E(e,t){
    let i=mpSaveRitual(mpTeamRitual.markRitual(n,e,t));
    r(i);
    if(e===`breathe`&&t!==`todo`){
      s(!1);
      try{u.current&&u.current.pause()}catch{}
      a(`reading`);
    }
    if(e===`breathe`&&t===`todo`){
      l(0);s(!1);a(`breathe`);
    }
    return i;
  }
  function D(){
    if(o){s(!1);try{u.current&&u.current.pause()}catch{};return}
    s(!0);
    try{u.current&&u.current.play&&u.current.play()}catch{}
  }
  function T(){
    if(!x)return;
    a(`reading`);
  }
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-readings mp-lane-team-ritual`,"aria-label":`Work team morning ritual`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:mpTeamRitual.TEAM_RITUAL_EYEBROW}),
    (0,A.jsx)(`h1`,{children:mpTeamRitual.TEAM_RITUAL_SHORT}),
    (0,A.jsx)(`p`,{className:`lede`,children:mpTeamRitual.TEAM_RITUAL_LEDE}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Step 1 Breathe (~3 min), then Step 2 Peaceful reading. One piece is enough.`}),
    (0,A.jsxs)(`ol`,{className:`mp-team-ritual-path`,children:[
      (0,A.jsxs)(`li`,{className:`mp-day-step${i===`breathe`?` is-current`:``}${S===`breathe`?` is-next`:``}${y!==`todo`?` is-${y}`:``}`,children:[
        (0,A.jsxs)(`div`,{className:`mp-step-head`,children:[
          (0,A.jsx)(`span`,{className:`mp-step-num`,children:`Step 1 · Breathe (~3 min)`}),
          S===`breathe`?(0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}):null,
          y===`done`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Done`}):null,
          y===`skipped`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Skipped`}):null
        ]})
      ]}),
      (0,A.jsxs)(`li`,{className:`mp-day-step${i===`reading`?` is-current`:``}${S===`reading`?` is-next`:``}${b!==`todo`?` is-${b}`:``}`,children:[
        (0,A.jsxs)(`div`,{className:`mp-step-head`,children:[
          (0,A.jsx)(`span`,{className:`mp-step-num`,children:`Step 2 · Peaceful reading`}),
          S===`reading`?(0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}):null,
          b===`done`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Done`}):null,
          b===`skipped`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Skipped`}):null
        ]})
      ]})
    ]}),
    i===`breathe`?(0,A.jsxs)(`section`,{className:`simple-panel mp-team-breath`,"aria-label":`Step 1 Breathe`,children:[
      (0,A.jsx)(`h2`,{children:`Step 1 · Breathe`}),
      (0,A.jsx)(`p`,{children:`About three minutes. Follow Maddy’s timed breath if you’d like company — inhale 4, hold 4, exhale 6. The clock keeps going after the clip ends.`}),
      (0,A.jsx)(`p`,{className:`mp-team-breath-clock`,"aria-live":`polite`,children:w}),
      (0,A.jsx)(`p`,{className:`mp-team-breath-cue`,"aria-live":`polite`,children:C.label}),
      h?(0,A.jsxs)(`div`,{className:`mp-team-breath-video`,children:[
        (0,A.jsx)(`video`,{ref:u,controls:!0,playsInline:!0,preload:`metadata`,src:g,"aria-label":`Timed breath with Maddy`}),
        (0,A.jsx)(`p`,{className:`muted`,children:h.description||`Maddy’s timed breath.`})
      ]}):(0,A.jsx)(`p`,{className:`muted`,children:`A quiet in-app timer is enough if the clip is not to hand.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:D,children:o?`Pause`:`Start the breath`}),
        y===`todo`?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>E(`breathe`,`done`),children:`That’s enough`}):null,
        y===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>E(`breathe`,`skipped`),children:`Skip this breath`}):null,
        y!==`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>E(`breathe`,`todo`),children:`Undo breath`}):null
      ]}),
      x?(0,A.jsxs)(`div`,{className:`mp-team-next`,children:[
        (0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}),
        (0,A.jsx)(`p`,{children:`The body has had a moment. Open the peaceful reading when you’re ready.`}),
        (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:T,children:`Open the peaceful reading`})
      ]}):null
    ]}):null,
    i===`reading`?(0,A.jsxs)(`section`,{className:`simple-panel mp-team-reading`,"aria-label":`Step 2 Peaceful reading`,children:[
      (0,A.jsx)(`h2`,{children:`Step 2 · Peaceful reading`}),
      (0,A.jsx)(`p`,{children:`One gentle Pack A piece for this morning. Opening here does not mark a Pack A day Done.`}),
      v?(0,A.jsxs)(`article`,{className:`mp-team-reading-body`,children:[
        (0,A.jsx)(`p`,{className:`eyebrow`,children:`PACK A · PEACEFUL`}),
        (0,A.jsx)(`h3`,{children:v.title}),
        (0,A.jsx)(`p`,{className:`muted`,children:v.theme_label?`Day ${v.day} · ${v.theme_label}`:`Day ${v.day}`}),
        (v.body||``).split(`\n\n`).map((e,t)=>(0,A.jsx)(`p`,{children:e},t)),
        v.practice?(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Practice:`}),` `,v.practice]}):null
      ]}):(0,A.jsx)(`p`,{children:`No peaceful reading is loaded yet.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        v?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>p({id:v.id,text:yt(v)}),children:d?`Pause`:`Listen`}):null,
        b===`todo`?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>E(`reading`,`done`),children:`That’s enough for this morning`}):null,
        b===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>E(`reading`,`skipped`),children:`Skip the reading`}):null,
        b!==`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>E(`reading`,`todo`),children:`Undo reading`}):null,
        t?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:t,children:`Today’s pack reading`}):null
      ]}),
      f?(0,A.jsx)(`p`,{role:`status`,"aria-live":`polite`,children:f}):null
    ]}):null,
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      i===`reading`&&!x?null:i===`reading`?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>a(`breathe`),children:`Back to the breath`}):null,
      e?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:e,children:`Back to Today`}):null
    ]})
  ]});
}
function mpDayStep({id:e,day:t,isNext:n,onOpen:r,onMark:i,extra:a}){
  let o=mpTodaySteps.STEP_META[e],s=mpTodaySteps.stepStatus(t,e);
  return(0,A.jsxs)(`li`,{className:`mp-day-step mp-step-${e}${n?` is-next`:``}${s!==`todo`?` is-${s}`:``}`,children:[
    (0,A.jsxs)(`div`,{className:`mp-step-head`,children:[
      (0,A.jsxs)(`span`,{className:`mp-step-num`,children:[`Step ${o.number}`,` · `,o.when]}),
      n?(0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}):null,
      s===`done`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Done`}):null,
      s===`skipped`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Skipped`}):null
    ]}),
    (0,A.jsx)(`h3`,{children:o.title}),
    (0,A.jsx)(`p`,{children:o.blurb}),
    a||null,
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:n?`primary`:`secondary`,type:`button`,onClick:r,children:`Open ${o.title}`}),
      s===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>i(e,`done`),children:`Mark done`}):null,
      s===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>i(e,`skipped`),children:`Skip`}):null,
      s!==`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>i(e,`todo`),children:`Undo`}):null
    ]})
  ]});
}
function Rr({name:e,onOpenVerse:t,onOpenFocus:n,onWriteJournal:r,onOpenLater:i,onOpenEvening:a,onAddWin:o,onOpenMaddy:s,onOpenProblem:v,onOpenTeamRitual:w}){
  let c=mpSignedInName(e),l=mpCalendar.partOfDay(),[u,d]=(0,_.useState)(()=>mpTodaySteps.loadDay()),[faithAsk,setFaithAsk]=(0,_.useState)(()=>mpNeedsFaithSetup());
  (0,_.useEffect)(()=>{function e(){d(mpTodaySteps.loadDay())}function n(){setFaithAsk(mpNeedsFaithSetup())}window.addEventListener(`visibilitychange`,e);window.addEventListener(`mindpal-session-change`,n);window.addEventListener(mpFaith.FAITH_CHANGE_EVENT,n);e();n();return()=>{window.removeEventListener(`visibilitychange`,e);window.removeEventListener(`mindpal-session-change`,n);window.removeEventListener(mpFaith.FAITH_CHANGE_EVENT,n)}},[]);
  if(faithAsk){
    return(0,A.jsxs)(`section`,{className:`today-shortcuts mp-today-hub mp-signin-page`,"aria-label":`Faith preference`,children:[
      (0,A.jsx)(mpFaithPrefQuestions,{mode:`setup`,onDone:()=>setFaithAsk(!1)})
    ]});
  }
  let f=mpTodaySteps.nextStepId(u),p=mpFaith.isCopticDateEnabled();
  function m(e,t){
    let n=mpTodaySteps.saveDay(mpTodaySteps.markStep(u,e,t));
    d(n);
  }
  let h={readings:t,focus:n,later:i||n,evening:a||r};
  return(0,A.jsxs)(`section`,{className:`today-shortcuts mp-today-hub`,"aria-label":`Today’s steps`,children:[
    (0,A.jsxs)(`header`,{className:`today-greeting`,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`TODAY`}),
      (0,A.jsx)(`p`,{className:`mp-civil-date`,children:mpCalendar.formatCivilDate()}),
      p?(0,A.jsx)(`p`,{className:`muted mp-coptic-date`,children:mpCalendar.formatCopticLabel()}):null,
      (0,A.jsx)(`h1`,{children:c?`Good ${l}, ${c}.`:`Good ${l}.`}),
      (0,A.jsx)(`p`,{className:`lede mp-hub-flow`,children:mpTodaySteps.HUB_FLOW_LINE})
    ]}),
    (0,A.jsx)(mpProblemHubList,{variant:`today`,onOpen:v}),
    mpTodaySteps.BANDS.map(e=>(0,A.jsxs)(`section`,{className:`mp-day-band mp-band-${e.id}`,"aria-label":e.title,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:e.title.toUpperCase()}),
      (0,A.jsx)(`p`,{className:`muted`,children:e.lede}),
      e.id===`morning`?(0,A.jsx)(mpTeamRitualCard,{onOpen:w}):null,
      e.id===`morning`?(0,A.jsx)(mpCollapsedVerse,{}):null,
      e.id===`morning`?(0,A.jsx)(mpWinsPanel,{variant:`hub`,onOpenJournal:o||r}):null,
      (0,A.jsx)(`ol`,{className:`mp-day-steps`,children:e.stepIds.map(t=>{
        let n=mpTodaySteps.STEP_META[t],i=mpTodaySteps.stepStatus(u,t),a=f===t,g=n.rowLabel||n.title;
        return(0,A.jsxs)(`li`,{className:`mp-day-step mp-step-row mp-step-${t}${a?` is-next`:``}${i!==`todo`?` is-${i}`:``}`,children:[
          (0,A.jsxs)(`button`,{className:`mp-step-main`,type:`button`,onClick:()=>h[t]&&h[t](),children:[
            (0,A.jsxs)(`span`,{className:`mp-step-num`,children:[`Step ${n.number}`,` · `,g]}),
            a?(0,A.jsx)(`span`,{className:`mp-do-next`,children:`Do this next`}):null,
            i===`done`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Done`}):null,
            i===`skipped`?(0,A.jsx)(`span`,{className:`mp-step-flag`,children:`Skipped`}):null
          ]}),
          (0,A.jsxs)(`div`,{className:`mp-step-actions`,children:[
            i===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>m(t,`done`),children:`Mark done`}):null,
            i===`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>m(t,`skipped`),children:`Skip`}):null,
            i!==`todo`?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>m(t,`todo`),children:`Undo`}):null
          ]})
        ]},t)
      })}),
      e.id===`day`?(0,A.jsx)(mpMaddyTeaser,{onOpen:s}):null
    ]},e.id))
  ]});
}
