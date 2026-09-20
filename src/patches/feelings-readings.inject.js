function mpSupportReadings({initialTag:e=``,feelingId:t=``,heading:n=`Readings for this feeling`,showChips:r=!0}={}){
  let i=mpReadings.tagsForFeeling(t),a=e&&mpReadings.TAG_VOCAB.includes(e)?e:``,[o,s]=(0,_.useState)(a),[c,l]=(0,_.useState)(null),[u,d]=(0,_.useState)(()=>mpReadings.loadProgress());
  (0,_.useEffect)(()=>{d(mpReadings.loadProgress())},[]);
  (0,_.useEffect)(()=>{s(a||``)},[a]);
  let f=mpReadings.orderedReadings(mpPackA),p=mpReadings.usedTags(mpPackA),m=o?[o]:i,h=mpReadings.readingsForTags(mpPackA,m),g=c&&f.find(e=>e.id===c)||null,v=g?mpReadings.canMarkDone(f,u.completedIds,g):!1;
  function y(){
    if(!v||!g)return;
    let e=mpReadings.markReadingDone(u,g,f);
    mpReadings.saveProgress(e),d(e);
  }
  return(0,A.jsxs)(`section`,{className:`mp-support-readings`,"aria-label":n,children:[
    (0,A.jsx)(`h2`,{children:n}),
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer`,children:mpReadings.SUPPORT_DISCLAIMER}),
    r?(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{className:`muted`,children:`Browse by tag. Stored without # — shown as hashtags.`}),
      (0,A.jsx)(`div`,{className:`mp-tag-chips`,role:`list`,"aria-label":`Browse readings by tag`,children:p.map(e=>{
        let t=o===e.id||!o&&i.includes(e.id);
        return(0,A.jsxs)(`button`,{type:`button`,role:`listitem`,className:`mp-tag-chip${t?` is-active`:``}`,"aria-pressed":t,onClick:()=>{s(n=>n===e.id?``:e.id),l(null)},children:[e.chip,` · `,e.count]},e.id);
      })})
    ]}):null,
    g?(0,A.jsxs)(`article`,{className:`mp-support-article`,"aria-label":g.title,children:[
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>l(null),children:`← Back to readings list`}),
      (0,A.jsxs)(`p`,{className:`eyebrow`,children:[`SUPPORT READING · DAY `,g.day,` · `,g.theme_label]}),
      (0,A.jsx)(`h3`,{children:g.title}),
      g.body.split(`

`).map((e,t)=>(0,A.jsx)(`p`,{children:e},t)),
      (0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Practice:`}),` `,g.practice]}),
      (0,A.jsx)(`p`,{className:`mp-support-gate`,role:`status`,children:mpReadings.supportUnlockMessage(g,f,u.completedIds)}),
      (0,A.jsx)(`p`,{className:`muted`,children:`The morning Readings pathway still unlocks one Pack A day at a time. Opening or listening here is not Done.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:!v,onClick:y,children:u.completedIds.includes(g.id)?`Done`:`Done for today`}),
        (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>l(null),children:`Back to list`})
      ]})
    ]}):(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{className:`muted`,children:m.length?`${h.length} matching Pack A reading${h.length===1?``:`s`}.`:`Choose a feeling or a tag to see matching readings.`}),
      h.length?(0,A.jsx)(`ul`,{className:`mp-support-list`,children:h.map(e=>{
        let t=mpReadings.isDayUnlocked(f,u.completedIds,e.day),n=u.completedIds.includes(e.id);
        return(0,A.jsxs)(`li`,{children:[
          (0,A.jsxs)(`button`,{type:`button`,className:`mp-support-row`,onClick:()=>l(e.id),children:[
            (0,A.jsxs)(`span`,{className:`mp-support-row-meta`,children:[`Day `,e.day,n?` · Done`:t?` · Unlocked`:` · Locked on morning path`]}),
            (0,A.jsx)(`strong`,{children:e.title}),
            (0,A.jsx)(`span`,{className:`mp-support-row-tags`,children:mpReadings.readingTags(e).map(mpReadings.formatTag).join(` `)})
          ]})
        ]},e.id);
      })}):(0,A.jsx)(`p`,{children:`No Pack A readings match this tag yet.`})
    ]})
  ]});
}
function mpSupportVideos({initialTag:e=``,feelingId:t=``,heading:n=`Videos for this feeling`,showChips:r=!0,onSpeakers:i}={}){
  let a=mpReadings.tagsForFeeling(t),o=mpReadings.canonicalizeTag(e),[s,c]=(0,_.useState)(o),[l,u]=(0,_.useState)(null);
  (0,_.useEffect)(()=>{c(o||``)},[o]);
  let d=s?[s]:a,f={catalog:typeof mpVideoCatalog<`u`?mpVideoCatalog:null,maddy:typeof mpMaddy<`u`?mpMaddy:null,meditations:typeof mpMeditationCatalog<`u`?mpMeditationCatalog:null},p=mpReadings.mediaForTags(f,d,mpReadings.VIDEO_DIRECTORY_LIMIT),m=l&&p.find(e=>e.id===l)||null;
  return(0,A.jsxs)(`section`,{className:`mp-support-videos`,"aria-label":n,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`h2`,{children:n}),
    (0,A.jsx)(`p`,{className:`mp-support-disclaimer`,children:mpReadings.SUPPORT_DISCLAIMER}),
    (0,A.jsx)(`p`,{className:`muted`,children:`A short tagged set for this feeling — not the speaker directory.`}),
    r?(0,A.jsx)(`div`,{className:`mp-tag-chips`,role:`list`,"aria-label":`Browse videos by tag`,children:mpReadings.TAG_VOCAB.map(e=>{
      let t=s===e||!s&&a.includes(e);
      return(0,A.jsx)(`button`,{type:`button`,role:`listitem`,className:`mp-tag-chip${t?` is-active`:``}`,"aria-pressed":t,onClick:()=>{c(t=>t===e?``:e),u(null)},children:mpReadings.formatTag(e)},e);
    })}):null,
    (0,A.jsx)(`p`,{className:`muted`,children:d.length?`Top ${p.length} tagged video${p.length===1?``:`s`} for this feeling.`:`Choose a feeling or a tag to see matching videos.`}),
    p.length?(0,A.jsx)(`ul`,{className:`mp-support-list mp-video-list`,children:p.map(e=>{
      let t=mpReadings.mediaSourceLabel(e),n=e.source===`youtube`?mpReadings.meditationOpenUrl(e):null;
      return(0,A.jsxs)(`li`,{className:`mp-video-row`,children:[
        (0,A.jsxs)(`div`,{className:`mp-support-row-meta`,children:[t,` · `,mpReadings.itemTags(e).map(mpReadings.formatTag).join(` `)]}),
        (0,A.jsx)(`h3`,{children:e.title}),
        e.description||e.outline?(0,A.jsx)(`p`,{children:e.description||e.outline}):null,
        (0,A.jsxs)(`div`,{className:`button-row`,children:[
          e.source===`maddy`||e.source===`catalog`?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>mpReadings.activateLibraryVideo({...e,person:e.source===`maddy`?`Maddy`:e.person,kind:e.source===`maddy`?`maddy`:e.kind,src:e.src||e.publishedSrc,videoUrl:e.videoUrl||e.src}),children:e.source===`maddy`?`Play`:mpReadings.videoCardCta(e)}):null,
          n?(0,A.jsx)(`a`,{className:`secondary`,href:n,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`}):null
        ]})
      ]},e.id);
    })}):(0,A.jsx)(`p`,{children:`No tagged videos for this feeling yet.`}),
    i?(0,A.jsx)(`p`,{className:`muted mp-speakers-secondary`,children:(0,A.jsxs)(`button`,{className:`text-button`,type:`button`,onClick:i,children:[`Browse signed coaches (optional) `]}) }):null,
    m&&typeof gi==`function`?(0,A.jsx)(gi,{video:m,onClose:()=>u(null),onHelp:()=>u(null)}):null
  ]});
}
function mpFeelingDirectory({feelingId:e=``,initialTag:t=``,onSpeakers:n}={}){
  return(0,A.jsxs)(`div`,{className:`mp-feeling-directory`,children:[
    (0,A.jsx)(mpSupportReadings,{feelingId:e,initialTag:t,heading:`Readings for this feeling`}),
    (0,A.jsx)(mpSupportVideos,{feelingId:e,initialTag:t,heading:`Videos for this feeling`,onSpeakers:n})
  ]});
}
function mpExploreFeelingChoice({onSpeakers:e}={}){
  let[t,n]=(0,_.useState)(``);
  return(0,A.jsxs)(`section`,{className:`simple-panel mp-explore-feeling`,"aria-label":`Explore an emotion or problem`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`FEELINGS · PROBLEMS`}),
    (0,A.jsx)(`h2`,{children:`Explore an emotion or problem`}),
    (0,A.jsx)(`p`,{children:`Choose a word if it fits, or browse the tag directory. This is not an assessment and is not saved or sent anywhere.`}),
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
      (0,A.jsx)(`option`,{value:`unsure`,children:`Not sure`})
    ]}),
    (0,A.jsx)(mpFeelingDirectory,{feelingId:t,onSpeakers:e})
  ]});
}
function mpFeelingsPage({onDiary:e,onPractice:t,onLeave:n,onDirectory:r,onSpeakers:i}){
  let[a,o]=(0,_.useState)(``),[s,c]=(0,_.useState)(``),l=(0,_.useRef)(null),u=(0,_.useRef)(null),d=mpReadings.FEELING_EMOTIONS,f=[[`lonely`,`Lonely or disconnected`],[`guilty`,`Guilty or ashamed`],[`numb`,`Numb or flat`],[`unsure`,`Not sure`],[`mothers`,`Struggling mothers`]];
  return(0,_.useEffect)(()=>{s&&l.current?.focus()},[s]),(0,A.jsxs)(`section`,{className:`simple-panel feelings-space`,children:[
    (0,A.jsx)(`h1`,{children:`Help with how I’m feeling`}),
    (0,A.jsx)(`p`,{children:`Choose a word if it fits, or browse without choosing. You do not need to explain why you feel this way. This choice is not an assessment and is not saved or sent anywhere.`}),
    (0,A.jsx)(`label`,{htmlFor:`feeling-choice`,children:`How would you describe this moment? · optional`}),
    (0,A.jsxs)(`select`,{ref:u,id:`feeling-choice`,value:a,onChange:e=>{o(e.target.value),c(``)},children:[
      (0,A.jsx)(`option`,{value:``,children:`Browse without choosing`}),
      d.map(([e,t])=>(0,A.jsx)(`option`,{value:e,children:t},e)),
      f.map(([e,t])=>(0,A.jsx)(`option`,{value:e,children:t},e))
    ]}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>c(`read`),children:`Read something supportive`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>c(`video`),children:`Videos`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>e(),children:`Open my diary`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>t(),children:`Try a short practice`})
    ]}),
    (0,A.jsx)(`p`,{children:`Opening your diary keeps your existing draft and does not add your selection to it. This page has no listener or live AI conversation. “One steady detail” is an optional practice you can skip or stop; it is offered to everyone here, not selected as a treatment for your feeling.`}),
    s&&(0,A.jsxs)(`div`,{children:[
      (0,A.jsx)(`h2`,{ref:l,tabIndex:-1,children:s===`read`?`Readings for this feeling`:`Videos for this feeling`}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>{c(``),u.current?.focus()},children:`Back to choices`}),
      s===`read`?(0,A.jsx)(mpSupportReadings,{feelingId:a,heading:`Readings for this feeling`}):(0,A.jsxs)(A.Fragment,{children:[
        (0,A.jsx)(MpEmotionVideos,{headingRef:l,emotion:a,onBrowseSpeakers:i||r}),
        (0,A.jsx)(mpSupportVideos,{feelingId:a,heading:`Videos for this feeling`,onSpeakers:i})
      ]})
    ]}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:i||r,children:mpReadings.BROWSE_SPEAKERS_LABEL}),
      i?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:i,children:`Browse signed coaches (optional)`}):null,
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>{o(``),c(``),n()},children:`Stop and return to Today`})
    ]}),
    (0,A.jsx)(`p`,{children:`If this makes things harder, stop. You can take a break or seek human support. “Need support?” lists human-support options independently of this activity. In immediate danger in Australia, call 000. MindPal does not monitor you or contact help for you.`})
  ]});
}
