function MpEmotionVideoCard({item:e}){
  let[t,n]=(0,_.useState)(!1),r=mpReadings.emotionVideoCta(e),i=e.kind===`maddy`||e.kind===`mindpal-playable`,a=e.kind===`youtube`&&e.openUrl,o=e.kind===`mindpal-draft`;
  function s(){
    n(!0);
    if(i){
      requestAnimationFrame(()=>{
        let t=document.getElementById(`mp-emotion-video-${e.id}`);
        if(t&&typeof t.play==`function`)try{t.play()}catch{}
        t?.focus?.();
      });
    }
  }
  return(0,A.jsxs)(`article`,{className:`mp-emotion-video`,"aria-label":`${e.title} · ${r}`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:e.source}),
    (0,A.jsx)(`h3`,{children:e.title}),
    e.description?(0,A.jsx)(`p`,{children:e.description}):null,
    e.durationLabel?(0,A.jsx)(`p`,{className:`muted`,children:e.durationLabel}):null,
    a?(0,A.jsx)(`a`,{className:`primary`,href:e.openUrl,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:r}):(0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:s,children:r}),
    i&&t&&e.publishedSrc?(0,A.jsx)(`video`,{id:`mp-emotion-video-${e.id}`,controls:!0,playsInline:!0,preload:`metadata`,src:typeof Ge==`function`?Ge(e.src||e.publishedSrc):e.publishedSrc,"aria-label":`${e.title} · Play`}):null,
    o&&t?(0,A.jsxs)(`div`,{className:`mp-emotion-draft`,children:[
      e.outline?(0,A.jsx)(`p`,{children:e.outline}):null,
      e.transcriptText?(0,A.jsx)(`p`,{children:e.transcriptText}):(0,A.jsx)(`p`,{className:`muted`,children:`Draft script preview. HeyGen has not rendered this clip yet.`})
    ]}):null
  ]});
}
function MpEmotionVideos({emotion:e,onBrowseSpeakers:t,onBack:n,headingRef:s}){
  let r=mpReadings.normalizeEmotionId(e),i=mpReadings.emotionLabel(r),a=mpReadings.emotionBreadcrumb(r),o=mpReadings.curatedVideosForEmotion(r,{maddy:typeof mpMaddy<`u`?mpMaddy:null,videos:typeof mpVideoCatalog<`u`?mpVideoCatalog:null,meditations:typeof mpMeditationCatalog<`u`?mpMeditationCatalog:null});
  return(0,A.jsxs)(`section`,{className:`mp-emotion-videos`,"aria-label":`Videos`,children:[
    (0,A.jsx)(`nav`,{"aria-label":`Breadcrumb`,children:(0,A.jsx)(`ol`,{className:`mp-emotion-crumb`,children:a.map((e,t)=>(0,A.jsxs)(`li`,{children:[t?` → `:null,(0,A.jsx)(`span`,{children:e})]},`${e}-${t}`))})}),
    (0,A.jsx)(`h2`,{ref:s,tabIndex:-1,children:`Videos`}),
    (0,A.jsx)(`p`,{children:i?`A short list for ${i} — Maddy, MindPal clips, and YouTube meditations tagged for this feeling. Play or open here; nothing starts by itself.`:`A short mixed list to start with. Choose a feeling above if you want a tighter set.`}),
    o.length?(0,A.jsx)(`div`,{className:`mp-emotion-video-list`,children:o.map(e=>(0,A.jsx)(MpEmotionVideoCard,{item:e},e.id))}):(0,A.jsx)(`p`,{className:`muted`,children:`No tagged videos for this feeling yet.`}),
    t?(0,A.jsx)(`p`,{className:`mp-emotion-speakers`,children:(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:t,children:mpReadings.BROWSE_SPEAKERS_LABEL})}):null,
    n?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:n,children:`Back to choices`}):null
  ]});
}
function ve({onDiary:e,onPractice:t,onLeave:n,onDirectory:r}){
  let[i,a]=(0,_.useState)(``),[o,s]=(0,_.useState)(``),c=(0,_.useRef)(null),l=(0,_.useRef)(null),u=mpReadings.FEELING_EMOTIONS,d=mpReadings.FEELING_SUPPORT;
  (0,_.useEffect)(()=>{o&&c.current?.focus()},[o]);
  return(0,A.jsxs)(`section`,{className:`simple-panel feelings-space`,children:[
    (0,A.jsx)(`h1`,{children:`Help with how I’m feeling`}),
    (0,A.jsx)(`p`,{children:`Choose a word if it fits, or browse without choosing. You do not need to explain why you feel this way. This choice is not an assessment and is not saved or sent anywhere.`}),
    (0,A.jsx)(`label`,{htmlFor:`feeling-choice`,children:`How would you describe this moment? · optional`}),
    (0,A.jsxs)(`select`,{ref:l,id:`feeling-choice`,value:i,onChange:e=>{a(e.target.value),s(``)},children:[
      (0,A.jsx)(`option`,{value:``,children:`Browse without choosing`}),
      u.map(([e,t])=>(0,A.jsx)(`option`,{value:e,children:t},e))
    ]}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>s(`read`),children:`Read something supportive`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>s(`video`),children:`Videos`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>e(),children:`Open my diary`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>t(),children:`Try a short practice`})
    ]}),
    (0,A.jsx)(`p`,{children:`Opening your diary keeps your existing draft and does not add your selection to it. This page has no listener or live AI conversation. “One steady detail” is an optional practice you can skip or stop; it is offered to everyone here, not selected as a treatment for your feeling.`}),
    o===`read`?(0,A.jsxs)(`div`,{children:[
      (0,A.jsx)(`h2`,{ref:c,tabIndex:-1,children:`A little support`}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>{s(``),l.current?.focus()},children:`Back to choices`}),
      (0,A.jsx)(`blockquote`,{children:d[mpReadings.normalizeEmotionId(i)]??d[``]}),
      (0,A.jsx)(`p`,{children:`You can leave this here. There is no need to change how you feel or choose an activity.`}),
      (0,A.jsx)(`p`,{children:`Original MindPal draft · human review pending.`})
    ]}):null,
    o===`video`?(0,A.jsx)(MpEmotionVideos,{headingRef:c,emotion:i,onBrowseSpeakers:r,onBack:()=>{s(``),l.current?.focus()}}):null,
    (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>{a(``),s(``),n()},children:`Stop and return to Today`}),
    (0,A.jsx)(`p`,{children:`Draft v0.1 · If this makes things harder, stop. You can take a break or seek human support. “Need support?” lists human-support options independently of this activity. In immediate danger in Australia, call 000. MindPal does not monitor you or contact help for you.`})
  ]});
}
