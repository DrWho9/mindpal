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
function mpCollapsedVerse(){
  return(0,A.jsxs)(`details`,{className:`mp-verse-collapse`,children:[
    (0,A.jsx)(`summary`,{children:`Today’s verse — tap to expand`}),
    (0,A.jsx)(Rt,{})
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
    (0,A.jsx)(`p`,{className:`muted`,children:`Kept here so the morning page stays tidy.`})
  ]});
}
function mpAccountFooter(){
  let e=mpSignedInName(``);
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-account-footer`,"aria-label":`Account`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`ACCOUNT`}),
    (0,A.jsx)(`h2`,{children:e?`Signed in as ${e}`:`Local account`}),
    (0,A.jsx)(`p`,{children:`Demo login only — this profile stays on this device. Nothing is sent to the cloud.`}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{Ot(),mpNotifySession()},children:`Sign out`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Sign out returns you to the first-run sign-in page. Your notes and wins stay on this device.`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Wins, photos and friends stay on this device. Sharing them with other people needs a future backend — nothing is uploaded today.`})
  ]});
}
function mpOpenProblem(id,onOpen){
  mpProblems.selectProblem(id);
  try{window.dispatchEvent(new Event(`mindpal-problem-change`))}catch{}
  onOpen&&onOpen(id);
}
function mpProblemHubList({onOpen:e,variant:t=`explore`}){
  let n=mpProblems.listProblems(mpProblemHubs);
  return(0,A.jsxs)(`section`,{className:`mp-problem-list mp-problem-list-${t}`,"aria-label":`What do you need help with?`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`PROBLEMS`}),
    (0,A.jsx)(`h2`,{children:`What do you need help with?`}),
    (0,A.jsx)(`p`,{children:t===`today`?`Open a problem hub for readings, videos and a journal line.`:`Each hub gathers readings, videos, Companion and a journal prompt for that theme.`}),
    (0,A.jsx)(`div`,{className:`mp-problem-grid`,children:n.map(n=>(0,A.jsxs)(`button`,{type:`button`,className:`mp-problem-card`,onClick:()=>mpOpenProblem(n.id,e),children:[
      (0,A.jsx)(`strong`,{children:n.title}),
      (0,A.jsx)(`span`,{className:`card-link`,children:`Open hub`})
    ]},n.id))})
  ]});
}
function mpProblemHubPage({onOpenVideo:e,onCompanion:t,onJournal:n,onExplore:r,onAddWin:i}){
  let[a,o]=(0,_.useState)(()=>mpProblems.selectedProblemId());
  (0,_.useEffect)(()=>{function e(){o(mpProblems.selectedProblemId())}return window.addEventListener(`mindpal-problem-change`,e),e(),()=>window.removeEventListener(`mindpal-problem-change`,e)},[]);
  let s=mpProblems.findProblem(mpProblemHubs,a);
  if(!s)return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem`,"aria-label":`Problem hub`,children:[
    (0,A.jsx)(`h1`,{children:`What do you need help with?`}),
    (0,A.jsx)(mpProblemHubList,{onOpen:e=>{o(e)}})
  ]});
  let c=mpProblems.readingsForProblem(mpPackA,s.id),l=mpProblems.maddyForProblem(mpMaddy,s.id),u=mpProblems.videosForProblem(mpVideoCatalog,s.id);
  let d=(mpMeditationCatalog&&mpReadings.meditationCategories(mpMeditationCatalog)||[]).find(e=>e.id===s.meditationCategoryId);
  let f=d?mpReadings.entriesForCategory(d).filter(e=>mpReadings.meditationOpenUrl(e)).slice(0,3):[];
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem`,"aria-label":s.title,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`PROBLEM HUB`}),
    (0,A.jsx)(`h1`,{children:s.title}),
    (0,A.jsx)(`p`,{className:`lede`,children:s.intro}),
    (0,A.jsx)(`p`,{className:`muted`,children:mpProblemHubs.disclaimer}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Readings`}),
      (0,A.jsx)(`p`,{children:`Pack A mornings tagged for this theme. The daily Done gate still lives on the Readings page.`}),
      c.length?(0,A.jsx)(`ul`,{className:`mp-hub-readings`,children:c.map(e=>(0,A.jsxs)(`li`,{children:[
        (0,A.jsx)(`strong`,{children:e.title}),
        (0,A.jsxs)(`span`,{className:`muted`,children:[`Day `,e.day,e.theme_label?` · ${e.theme_label}`:``]})
      ]},e.id))}):(0,A.jsx)(`p`,{className:`muted`,children:`No tagged readings for this theme yet.`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>r&&r(),children:`Open today’s Readings`})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Videos`}),
      l.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Watch with Maddy`}),
        (0,A.jsx)(`div`,{className:`maddy-video-grid`,children:l.map(t=>{
          let n=mpReadings.libraryCardModel(t);
          return(0,A.jsxs)(`button`,{type:`button`,className:`maddy-video-card`,"aria-label":n.ariaLabel,onClick:()=>mpReadings.activateLibraryVideo(t),onKeyDown:e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),mpReadings.activateLibraryVideo(t))},children:[
            (0,A.jsx)(`h3`,{children:t.cardTitle||t.title}),
            (0,A.jsx)(`p`,{children:t.description}),
            (0,A.jsxs)(`div`,{className:`maddy-play-cover`,"aria-hidden":`true`,children:[
              (0,A.jsx)(`span`,{className:`card-link`,children:n.cta})
            ]})
          ]},t.id);
        })})
      ]}):null,
      u.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Open-draft videos`}),
        (0,A.jsx)(`ul`,{className:`mp-hub-videos`,children:u.map(t=>{
          let n=mpReadings.videoCardCta?mpReadings.videoCardCta(t):`Open draft`;
          return(0,A.jsx)(`li`,{children:(0,A.jsxs)(`button`,{type:`button`,className:`secondary`,onClick:()=>mpReadings.activateLibraryVideo(t,e),onKeyDown:r=>{(r.key===`Enter`||r.key===` `)&&(r.preventDefault(),mpReadings.activateLibraryVideo(t,e))},children:[(0,A.jsx)(`strong`,{children:t.title}),(0,A.jsx)(`span`,{children:n})]})},t.id);
        })})
      ]}):null,
      f.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:d.title||`Voice-guided on YouTube`}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Link-out only. MindPal does not host or embed this audio.`}),
        (0,A.jsx)(`ul`,{className:`mp-hub-yt`,children:f.map(e=>{
          let t=mpReadings.meditationOpenUrl(e);
          return(0,A.jsxs)(`li`,{children:[
            (0,A.jsx)(`strong`,{children:e.title}),
            t?(0,A.jsx)(`a`,{className:`secondary`,href:t,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`}):null
          ]},e.id);
        })})
      ]}):(s.meditationCategoryId===`sleep`||s.meditationCategoryId===`anxiety`)?(0,A.jsx)(`p`,{className:`muted`,children:`YouTube meditation links for this theme are filling.`}):null
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Companion`}),
      (0,A.jsx)(`p`,{children:`Opens Companion with a short educational prompt for this problem. The usual disclaimer stays — this is not a therapist or emergency service.`}),
      (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(s.companionPrompt);t&&t(s.companionPrompt)},children:`Talk this through with Companion`})
    ]}),
    (0,A.jsxs)(`section`,{className:`simple-panel`,children:[
      (0,A.jsx)(`h2`,{children:`Journal`}),
      (0,A.jsx)(`p`,{children:s.journalPrompt}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        n?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>n(s.journalPrompt),children:`Write this in Journal`}):null
      ]}),
      (0,A.jsx)(mpWinsPanel,{variant:`problem`,onOpenJournal:i||(n?()=>n(`A small win today: `):null)})
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
function Rr({name:e,onOpenVerse:t,onOpenFocus:n,onWriteJournal:r,onOpenLater:i,onOpenEvening:a,onAddWin:o,onOpenMaddy:s,onOpenProblem:v}){
  let c=mpSignedInName(e),l=mpCalendar.partOfDay(),[u,d]=(0,_.useState)(()=>mpTodaySteps.loadDay());
  (0,_.useEffect)(()=>{function e(){d(mpTodaySteps.loadDay())}return window.addEventListener(`visibilitychange`,e),e(),()=>window.removeEventListener(`visibilitychange`,e)},[]);
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
    mpTodaySteps.BANDS.map(e=>(0,A.jsxs)(`section`,{className:`mp-day-band mp-band-${e.id}`,"aria-label":e.title,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:e.title.toUpperCase()}),
      (0,A.jsx)(`p`,{className:`muted`,children:e.lede}),
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
      e.id===`day`?(0,A.jsx)(mpProblemHubList,{variant:`today`,onOpen:v}):null,
      e.id===`day`?(0,A.jsx)(mpMaddyTeaser,{onOpen:s}):null
    ]},e.id))
  ]});
}
