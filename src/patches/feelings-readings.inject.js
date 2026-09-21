function mpKitReadingMeta(reading){
  let theme=reading&&reading.theme_label||reading&&reading.theme||``;
  if(reading&&(reading.pack===`owner`||reading.gate===!1||reading.owner)){
    return theme?`MindPal original · ${theme}`:`MindPal original`;
  }
  return theme||``;
}
function mpKitTagFilter(tags,active,onChange){
  if(!tags||!tags.length)return null;
  return(0,A.jsx)(`div`,{className:`mp-tag-chips`,role:`list`,"aria-label":`Browse by Pack A chapter tag`,children:tags.map(tag=>{
    let on=active===tag;
    return(0,A.jsx)(`button`,{type:`button`,role:`listitem`,className:`mp-tag-chip${on?` is-active`:``}`,"aria-pressed":on,onClick:()=>onChange(on?``:tag),children:mpReadings.formatTag(tag)||tag},tag);
  })});
}
function mpKitReadingArticle({reading:e,onBack:t,kitReadings:n}){
  if(!e)return null;
  let r=mpReadings.mergeOwnerReadings?mpReadings.mergeOwnerReadings(mpPackA):mpPackA.readings||[];
  let i=mpReadings.loadProgress?mpReadings.loadProgress():{completedIds:[]};
  let a=e.pack===`owner`||e.gate===!1||(mpReadings.isOwnerReading&&mpReadings.isOwnerReading(e));
  let o=e.chapterChips||(mpReadings.chapterTagChips?mpReadings.chapterTagChips(e):[]);
  return(0,A.jsxs)(`article`,{className:`mp-support-article mp-kit-article`,"aria-label":e.title,children:[
    (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:t,children:`← Back to the kit`}),
    (0,A.jsxs)(`p`,{className:`eyebrow`,children:[a?`MINDPAL ORIGINAL`:e.theme_label?e.theme_label.toUpperCase():`PACK A CHAPTER`,e.theme_label&&!a?` · ${e.theme_label}`:``]}),
    (0,A.jsx)(`h3`,{children:e.title}),
    o.length?(0,A.jsx)(`p`,{className:`mp-hub-tags`,children:o.join(` `)}):null,
    (e.body||``).split(`\n\n`).map((t,n)=>(0,A.jsx)(`p`,{children:t},n)),
    e.practice?(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Practice:`}),` `,e.practice]}):null,
    (0,A.jsx)(`p`,{className:`mp-support-gate`,role:`status`,children:mpReadings.supportUnlockMessage?mpReadings.supportUnlockMessage(e,n&&n.length?n:r,i.completedIds||[]):`You can read this as support. Opening here does not mark a Pack A day Done.`}),
    (0,A.jsx)(`p`,{className:`muted`,children:a?`This MindPal original is always open as support. It is not a Pack A morning day.`:`Title and theme first. The morning Readings path still unlocks one Pack A day at a time — opening here does not skip that gate.`}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:t,children:`Back to the kit`})
  ]});
}
function mpKitReadingRow({reading:e,onOpen:t}){
  let n=mpKitReadingMeta(e);
  let r=e.chapterChips||(mpReadings.chapterTagChips?mpReadings.chapterTagChips(e):[]);
  return(0,A.jsxs)(`button`,{type:`button`,className:`mp-support-row mp-kit-reading-row`,onClick:()=>t(e),children:[
    (0,A.jsx)(`strong`,{children:e.title}),
    n?(0,A.jsx)(`span`,{className:`mp-support-row-meta`,children:n}):null,
    e.blurb?(0,A.jsx)(`span`,{className:`mp-kit-blurb`,children:e.blurb}):null,
    r.length?(0,A.jsx)(`span`,{className:`mp-hub-tags`,children:r.join(` `)}):null
  ]});
}
function mpKitAccordionSection({id:e,title:t,openId:n,onOpen:r,children:i}){
  let a=n===e;
  return(0,A.jsxs)(`section`,{className:`mp-kit-section${a?` is-open`:``}`,"aria-labelledby":`mp-kit-${e}`,children:[
    (0,A.jsx)(`button`,{type:`button`,id:`mp-kit-${e}`,className:`mp-kit-toggle`,"aria-expanded":a,onClick:()=>r(a?``:e),children:t}),
    a?(0,A.jsx)(`div`,{className:`mp-kit-body`,children:i}):null
  ]});
}
function mpFeelingKitAccordion({kit:e,onCompanion:t,onJournal:n,onSpeakers:r,onHelp:i,onAddWin:a,onExplore:o,onWomen:s}={}){
  let[c,l]=(0,_.useState)(`start`);
  let[u,d]=(0,_.useState)(null);
  let[f,p]=(0,_.useState)(``);
  let[m,h]=(0,_.useState)(!1);
  if(!e)return null;
  let g=u&&(u.id===(e.startHere&&e.startHere.id)||e.readings.some(t=>t.id===u.id))?u:null;
  let v=f?e.readings.filter(t=>t.chapterTags&&t.chapterTags.includes(f)):e.readings;
  function y(t){
    return(0,A.jsx)(MpEmotionVideoCard,{item:t},t.id);
  }
  return(0,A.jsxs)(`div`,{className:`mp-feeling-kit`,"aria-label":`${e.title} kit`,children:[
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer`,children:mpReadings.SUPPORT_DISCLAIMER}),
    (0,A.jsx)(mpKitAccordionSection,{id:`start`,title:`Start here`,openId:c,onOpen:l,children:e.startHere?(0,A.jsxs)(`article`,{className:`mp-hub-featured`,"aria-label":`Featured reading`,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:e.startHere.owner?`FEATURED · MINDPAL ORIGINAL`:`START HERE · PACK A`}),
      (0,A.jsx)(`h3`,{children:e.startHere.title}),
      e.startHere.theme?(0,A.jsx)(`p`,{className:`mp-support-row-meta`,children:e.startHere.theme}):null,
      e.startHere.chapterChips&&e.startHere.chapterChips.length?(0,A.jsx)(`p`,{className:`mp-hub-tags`,children:e.startHere.chapterChips.join(` `)}):null,
      (0,A.jsx)(`p`,{children:e.startHere.blurb}),
      m?(0,A.jsx)(mpKitReadingArticle,{reading:e.startHere,onBack:()=>h(!1),kitReadings:[e.startHere,...e.readings]}):null,
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>h(t=>!t),children:m?`Hide the reading`:e.id===`aod`?`Read the talk-through`:`Open the reading`}),
        t&&e.companionPrompt?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(e.companionPrompt);t(e.companionPrompt)},children:`Talk this through with Companion`}):null
      ]})
    ]}):(0,A.jsx)(`p`,{children:`A featured opener is still being chosen for this kit.`})}),
    (0,A.jsx)(mpKitAccordionSection,{id:`readings`,title:`Readings`,openId:c,onOpen:e=>{l(e);d(null)},children:g?(0,A.jsx)(mpKitReadingArticle,{reading:g,onBack:()=>d(null),kitReadings:[e.startHere,...e.readings].filter(Boolean)}):(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:e.id===`aod`?`Readings for drugs & alcohol — a short curated list, title and theme first. Open a chapter to read the full Pack A body. The morning path still unlocks one day at a time.`:`Readings for this feeling — a curated shortlist from Pack A daily chapters. Open a card for the full body. Tags are from those chapters, not a Day-number dump.`}),
      e.browseTags.length>1?(0,A.jsx)(mpKitTagFilter,{tags:e.browseTags,active:f,onChange:p}):null,
      v.length?(0,A.jsx)(`ul`,{className:`mp-support-list mp-hub-readings`,children:v.map(t=>(0,A.jsx)(`li`,{children:(0,A.jsx)(mpKitReadingRow,{reading:t,onOpen:d})},t.id))}):(0,A.jsx)(`p`,{className:`muted`,children:f?`No chapters on this kit match that tag.`:`No curated readings for this kit yet.`}),
      o?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:o,children:`Open today’s Readings`}):null
    ]})}),
    (0,A.jsx)(mpKitAccordionSection,{id:`videos`,title:`Videos`,openId:c,onOpen:l,children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(MpLibraryHost,{}),
      (0,A.jsx)(`p`,{children:`A short emotion-scoped list — playable clips first, then YouTube link-outs, then Open draft. No speaker library dump here.`}),
      e.videos.length?(0,A.jsx)(`div`,{className:`mp-emotion-video-list`,children:e.videos.map(t=>typeof MpEmotionVideoCard==`function`?y(t):(0,A.jsxs)(`article`,{className:`mp-emotion-video`,children:[
        (0,A.jsx)(`h3`,{children:t.title}),
        t.description?(0,A.jsx)(`p`,{children:t.description}):null
      ]},t.id))}):(0,A.jsx)(`p`,{className:`muted`,children:`No curated videos for this kit yet.`}),
      r?(0,A.jsx)(`p`,{className:`muted mp-speakers-secondary`,children:(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:r,children:mpReadings.BROWSE_SPEAKERS_LABEL})}):null
    ]})}),
    e.evidence?(0,A.jsx)(mpKitAccordionSection,{id:`evidence`,title:`Evidence & guidance`,openId:c,onOpen:l,children:(0,A.jsxs)(`div`,{className:`mp-kit-evidence`,children:[
      (0,A.jsx)(`p`,{className:`muted`,children:e.evidence.disclaimer}),
      e.evidence.notes.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`MindPal literacy notes`}),
        e.evidence.notes.map(t=>(0,A.jsxs)(`article`,{className:`mp-kit-note`,children:[
          (0,A.jsx)(`h4`,{children:t.title}),
          (0,A.jsx)(`p`,{children:t.body})
        ]},t.title))
      ]}):null,
      e.evidence.guides.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Evidence-based support books and chapters`}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Public Australian guides and chapters — titles and why they help. Outbound only. We do not invent studies or DOIs.`}),
        (0,A.jsx)(`ul`,{className:`mp-kit-guides`,children:e.evidence.guides.map(t=>(0,A.jsxs)(`li`,{children:[
          (0,A.jsx)(`strong`,{children:t.title}),
          t.org?(0,A.jsx)(`span`,{className:`muted`,children:t.org}):null,
          t.why?(0,A.jsx)(`p`,{children:t.why}):null,
          (0,A.jsx)(`a`,{className:`secondary`,href:t.url,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open ${t.org||`source`}`})
        ]},t.url))})
      ]}):null,
      e.evidence.sources.length?(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(`h3`,{children:`Clinic notes and public evidence`}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Plain-language notes with links to real organisation pages. No fabricated statistics.`}),
        (0,A.jsx)(`ul`,{className:`mp-kit-guides`,children:e.evidence.sources.map(t=>(0,A.jsxs)(`li`,{children:[
          (0,A.jsx)(`strong`,{children:t.title}),
          t.org?(0,A.jsx)(`span`,{className:`muted`,children:t.org}):null,
          t.note?(0,A.jsx)(`p`,{children:t.note}):null,
          (0,A.jsx)(`a`,{className:`secondary`,href:t.url,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open source`})
        ]},t.url))})
      ]}):null
    ]})}):null,
    (0,A.jsx)(mpKitAccordionSection,{id:`talk`,title:`Talk / Companion`,openId:c,onOpen:l,children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:e.id===`aod`?`Opens Companion on the drugs and alcohol talk-through — the puppy-and-treat loop. DNA is only a nickname for drugs and alcohol, not genetics. It is software, not a therapist or AOD clinician.`:`Opens Companion with a short educational prompt for this kit. Software, not a therapist or emergency service.`}),
      t&&e.companionPrompt?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>{mpProblems.saveCompanionPrompt(e.companionPrompt);t(e.companionPrompt)},children:`Talk this through with Companion`}):null
    ]})}),
    (0,A.jsx)(mpKitAccordionSection,{id:`journal`,title:`Journal / wins`,openId:c,onOpen:l,children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:e.journalPrompt}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        n?(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>n(e.journalPrompt),children:`Write this in Journal`}):null
      ]}),
      (0,A.jsx)(mpWinsPanel,{variant:`problem`,onOpenJournal:a||(n?()=>n(`A small win today: `):null)})
    ]})}),
    e.safety?(0,A.jsxs)(`section`,{className:`simple-panel mp-kit-safety${e.id===`aod`?` mp-aod-safety`:``}${e.id===`mothers`?` mp-mothers-safety`:``}`,children:[
      (0,A.jsx)(`h2`,{children:e.safety.title}),
      (0,A.jsx)(`p`,{children:e.safety.body}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        i?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:i,children:`Need support`}):null,
        s?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:s,children:`Women’s wellbeing`}):null
      ]})
    ]}):null
  ]});
}
function mpFeelingKitPage({feelingId:e,onCompanion:t,onJournal:n,onExplore:r,onAddWin:i,onHelp:a,onWomen:o,onSpeakers:s}){
  let c=mpReadings.feelingKit?mpReadings.feelingKit(e,{pack:mpPackA,hubs:mpProblemHubs}):null;
  if(!c)return(0,A.jsx)(`p`,{children:`This space is not loaded yet.`});
  let l=c.id===`aod`||c.id===`mothers`||c.id===`low-mood`||c.id===`anxiety`||c.id===`sleep`||c.id===`stress`;
  let u=c.eyebrow&&c.eyebrow.indexOf(`GROWTH`)===0;
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-problem${u?` mp-lane-growth`:``}${c.id===`mothers`?` mp-lane-mothers`:``}${c.id===`aod`?` mp-lane-aod`:``}`,"aria-label":c.title,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:c.eyebrow}),
    (0,A.jsx)(`h1`,{children:c.title}),
    (0,A.jsx)(`p`,{className:`lede`,children:c.lede}),
    l?(0,A.jsx)(`p`,{className:`muted`,children:c.id===`mothers`?`Warm company for a hard stretch. Not a diagnosis, not therapy, and not a replacement for a GP, midwife or maternal-child nurse.`:c.id===`aod`?`Not detox, not medical advice, and not a replacement for alcohol and other drug treatment. Soft pointers only.`:mpProblemHubs&&mpProblemHubs.disclaimer||mpReadings.SUPPORT_DISCLAIMER}):null,
    (0,A.jsx)(mpFeelingKitAccordion,{kit:c,onCompanion:t,onJournal:n,onSpeakers:s,onHelp:a,onAddWin:i,onExplore:r,onWomen:o})
  ]});
}
function mpSupportReadings({initialTag:e=``,feelingId:t=``,heading:n=`Readings for this feeling`,showChips:r=!0}={}){
  let i=mpReadings.feelingKit&&t?mpReadings.feelingKit(t,{pack:mpPackA,hubs:mpProblemHubs}):null;
  let[a,o]=(0,_.useState)(null);
  let[s,c]=(0,_.useState)(``);
  let l=i?[...i.startHere?[i.startHere]:[],...i.readings]:mpReadings.readingsForTags(mpPackA,e?[e]:mpReadings.tagsForFeeling(t)).slice(0,10).map(e=>({...e,theme:e.theme_label||``,chapterTags:mpReadings.chapterTags?mpReadings.chapterTags(e):e.tags||[],chapterChips:mpReadings.chapterTagChips?mpReadings.chapterTagChips(e):[],blurb:(e.body||``).split(`\n\n`)[0]||``}));
  let u=s?l.filter(e=>(e.chapterTags||[]).includes(s)):l;
  let d=a&&l.find(e=>e.id===a)||null;
  return(0,A.jsxs)(`section`,{className:`mp-support-readings`,"aria-label":n,children:[
    (0,A.jsx)(`h2`,{children:n}),
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer`,children:mpReadings.SUPPORT_DISCLAIMER}),
    r&&!i?(0,A.jsx)(`p`,{className:`muted`,children:`A short curated list — title and theme first, not a Day-number dump.`}):null,
    d?(0,A.jsx)(mpKitReadingArticle,{reading:d,onBack:()=>o(null),kitReadings:l}):(0,A.jsxs)(A.Fragment,{children:[
      i&&i.browseTags.length>1?(0,A.jsx)(mpKitTagFilter,{tags:i.browseTags,active:s,onChange:c}):null,
      u.length?(0,A.jsx)(`ul`,{className:`mp-support-list`,children:u.map(e=>(0,A.jsx)(`li`,{children:(0,A.jsx)(mpKitReadingRow,{reading:e,onOpen:t=>o(t.id)})},e.id))}):(0,A.jsx)(`p`,{children:`No Pack A readings in this shortlist yet.`})
    ]})
  ]});
}
function mpSupportVideos({initialTag:e=``,feelingId:t=``,heading:n=`Videos for this feeling`,showChips:r=!0,onSpeakers:i}={}){
  let a=mpReadings.feelingKit&&t?mpReadings.feelingKit(t,{pack:mpPackA,hubs:mpProblemHubs}):null;
  let o=a&&a.videos&&a.videos.length?a.videos:mpReadings.mediaForTags({catalog:typeof mpVideoCatalog<`u`?mpVideoCatalog:null,maddy:typeof mpMaddy<`u`?mpMaddy:null,meditations:typeof mpMeditationCatalog<`u`?mpMeditationCatalog:null},e?[e]:mpReadings.tagsForFeeling(t),mpReadings.VIDEO_DIRECTORY_LIMIT);
  return(0,A.jsxs)(`section`,{className:`mp-support-videos`,"aria-label":n,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`h2`,{children:n}),
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer`,children:mpReadings.SUPPORT_DISCLAIMER}),
    (0,A.jsx)(`p`,{className:`muted`,children:`A short tagged set for this feeling — not the speaker directory.`}),
    o.length?(0,A.jsx)(`div`,{className:`mp-emotion-video-list`,children:o.map(e=>{
      if(e.kind&&typeof MpEmotionVideoCard==`function`)return(0,A.jsx)(MpEmotionVideoCard,{item:e},e.id);
      let t=mpReadings.mediaSourceLabel?mpReadings.mediaSourceLabel(e):``;
      let n=e.source===`youtube`&&mpReadings.meditationOpenUrl?mpReadings.meditationOpenUrl(e):e.openUrl;
      return(0,A.jsxs)(`article`,{className:`mp-emotion-video`,children:[
        t?(0,A.jsx)(`p`,{className:`eyebrow`,children:t}):null,
        (0,A.jsx)(`h3`,{children:e.title}),
        n?(0,A.jsx)(`a`,{className:`primary`,href:n,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`}):null
      ]},e.id);
    })}):(0,A.jsx)(`p`,{children:`No tagged videos for this feeling yet.`}),
    i?(0,A.jsx)(`p`,{className:`muted mp-speakers-secondary`,children:(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:i,children:`Browse signed coaches (optional)`})}):null
  ]});
}
function mpFeelingDirectory({feelingId:e=``,initialTag:t=``,onSpeakers:n,onCompanion:r,onJournal:i,onHelp:a}={}){
  let o=mpReadings.feelingKit&&e?mpReadings.feelingKit(e,{pack:mpPackA,hubs:mpProblemHubs}):null;
  if(o)return(0,A.jsx)(mpFeelingKitAccordion,{kit:o,onSpeakers:n,onCompanion:r,onJournal:i,onHelp:a});
  return(0,A.jsx)(`p`,{className:`muted`,children:`Choose a feeling to open a small kit — not a random list of Pack A days.`});
}
function mpExploreFeelingChoice({onSpeakers:e}={}){
  let[t,n]=(0,_.useState)(``);
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-explore-feeling`,"aria-label":`Explore an emotion or problem`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`FEELINGS · PROBLEMS`}),
    (0,A.jsx)(`h2`,{children:`Explore an emotion or problem`}),
    (0,A.jsx)(`p`,{children:`Choose a word if it fits. Each choice opens a small kit — not an assessment, and nothing is saved or sent.`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-explore-feeling`,children:`How would you describe this moment? · optional`}),
    (0,A.jsxs)(`select`,{id:`mp-explore-feeling`,value:t,onChange:e=>n(e.target.value),children:[
      (0,A.jsx)(`option`,{value:``,children:`Browse without choosing`}),
      (0,A.jsx)(`option`,{value:`sad`,children:`Sad or low`}),
      (0,A.jsx)(`option`,{value:`anxious`,children:`Anxious or worried`}),
      (0,A.jsx)(`option`,{value:`angry`,children:`Angry or frustrated`}),
      (0,A.jsx)(`option`,{value:`overwhelmed`,children:`Overwhelmed or stressed`}),
      (0,A.jsx)(`option`,{value:`lonely`,children:`Lonely or disconnected`}),
      (0,A.jsx)(`option`,{value:`guilty`,children:`Guilty or ashamed`}),
      (0,A.jsx)(`option`,{value:`numb`,children:`Numb or flat`}),
      (0,A.jsx)(`option`,{value:`unsure`,children:`Not sure`}),
      (0,A.jsx)(`option`,{value:`mothers`,children:`Struggling mothers`}),
      (0,A.jsx)(`option`,{value:`aod`,children:`Drugs & alcohol`}),
      (0,A.jsx)(`option`,{value:`mens-health`,children:`Men's Health`})
    ]}),
    (0,A.jsx)(mpFeelingDirectory,{feelingId:t,onSpeakers:e})
  ]});
}
function mpFeelingsPage({onDiary:e,onPractice:t,onLeave:n,onDirectory:r,onSpeakers:i,onCompanion:a,onHelp:o,onJournal:s}){
  let[c,l]=(0,_.useState)(``);
  let u=(0,_.useRef)(null);
  let d=mpReadings.FEELING_EMOTIONS;
  let f=[[`lonely`,`Lonely or disconnected`],[`guilty`,`Guilty or ashamed`],[`numb`,`Numb or flat`],[`unsure`,`Not sure`],[`mothers`,`Struggling mothers`],[`aod`,`Drugs & alcohol`],[`mens-health`,`Men's Health`]];
  let p=mpReadings.feelingKit&&c?mpReadings.feelingKit(c,{pack:mpPackA,hubs:mpProblemHubs}):null;
  return(0,A.jsxs)(`section`,{className:`simple-panel feelings-space`,children:[
    (0,A.jsx)(`h1`,{children:`Help with how I’m feeling`}),
    (0,A.jsx)(`p`,{children:`Choose a word if it fits. You get a small kit — start here, readings, videos — not a random list of Pack A days. This choice is not an assessment and is not saved or sent anywhere.`}),
    (0,A.jsx)(`label`,{htmlFor:`feeling-choice`,children:`How would you describe this moment? · optional`}),
    (0,A.jsxs)(`select`,{ref:u,id:`feeling-choice`,value:c,onChange:e=>l(e.target.value),children:[
      (0,A.jsx)(`option`,{value:``,children:`Browse without choosing`}),
      d.map(([e,t])=>(0,A.jsx)(`option`,{value:e,children:t},e)),
      f.map(([e,t])=>(0,A.jsx)(`option`,{value:e,children:t},e))
    ]}),
    p?(0,A.jsx)(mpFeelingKitAccordion,{kit:p,onCompanion:a,onJournal:s||e,onSpeakers:i||r,onHelp:o,onAddWin:s||e}):(0,A.jsx)(`p`,{className:`muted`,children:`Pick a feeling to open a calm kit. Browse without choosing stays empty on purpose — we no longer dump every matching Pack A day.`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>e(),children:`Open my diary`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>t(),children:`Try a short practice`})
    ]}),
    (0,A.jsx)(`p`,{children:`Opening your diary keeps your existing draft and does not add your selection to it. This page has no listener or live AI conversation.`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:i||r,children:mpReadings.BROWSE_SPEAKERS_LABEL}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>{l(``),n()},children:`Stop and return to Today`})
    ]}),
    (0,A.jsx)(`p`,{children:`If this makes things harder, stop. You can take a break or seek human support. “Need support?” lists human-support options independently of this activity. In immediate danger in Australia, call 000. MindPal does not monitor you or contact help for you.`})
  ]});
}
