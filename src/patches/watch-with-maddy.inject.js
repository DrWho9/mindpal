function MpLibraryHost(){
  let[e,t]=(0,_.useState)(null);
  let n=(0,_.useId)();
  let r=(0,_.useRef)(null);
  let i=(0,_.useRef)(null);
  (0,_.useEffect)(()=>{
    globalThis.__mpLibraryHostMounted=!0;
    function a(e){
      let n=e?.detail;
      if(n?.video)t({video:n.video,model:n.model||mpReadings.libraryCardModel(n.video)});
    }
    window.addEventListener(`mindpal-open-library-video`,a);
    return()=>{globalThis.__mpLibraryHostMounted=!1,window.removeEventListener(`mindpal-open-library-video`,a)};
  },[]);
  let a=()=>{
    try{i.current&&(i.current.pause(),i.current.currentTime=0)}catch{}
    t(null);
  };
  (0,_.useEffect)(()=>{
    function e(){a()}
    window.addEventListener(mpNav.HOME_EVENT,e);
    return()=>window.removeEventListener(mpNav.HOME_EVENT,e);
  },[]);
  (0,_.useEffect)(()=>{
    if(!e)return;
    let t=document.activeElement,n=()=>r.current?.querySelector(`button`)?.focus(),i=e=>{r.current?.contains(e.target)||n()},o=document.body.style.overflow;
    return document.body.style.overflow=`hidden`,n(),document.addEventListener(`focusin`,i),()=>{document.removeEventListener(`focusin`,i),document.body.style.overflow=o,t?.focus()};
  },[e]);
  if(!e)return null;
  let o=e.model||mpReadings.libraryCardModel(e.video);
  let s=o.playable&&o.src;
  return(0,A.jsx)(`div`,{className:`modal-backdrop mp-library-backdrop`,onClick:e=>{e.target===e.currentTarget&&a()},children:(0,A.jsxs)(`div`,{className:`modal video-modal mp-library-modal`,ref:r,role:`dialog`,"aria-modal":`true`,"aria-labelledby":n,onKeyDown:e=>{
    if(e.key===`Escape`&&(e.stopPropagation(),a()),e.key===`Tab`){
      let t=Array.from(r.current?.querySelectorAll(`button:not(:disabled), a[href], video[controls], [tabindex="0"]`)??[]).filter(e=>e.getClientRects().length>0),n=t[0],i=t[t.length-1];
      e.shiftKey&&document.activeElement===n?(e.preventDefault(),i?.focus()):!e.shiftKey&&document.activeElement===i&&(e.preventDefault(),n?.focus());
    }
  },children:[
    (0,A.jsxs)(`div`,{className:`modal-top`,children:[
      (0,A.jsx)(`span`,{className:`eyebrow`,children:o.eyebrow||(o.kind===`maddy-play`?`Watch with Maddy`:o.playable?`Ready to play`:`Open draft`)}),
      (0,A.jsx)(`button`,{className:`icon-button`,type:`button`,"aria-label":`Close video`,onClick:a,children:(0,A.jsx)(On,{size:20})})
    ]}),
    (0,A.jsx)(`h2`,{id:n,children:o.title}),
    o.durationLabel?(0,A.jsx)(`p`,{className:`muted mp-clip-meta`,children:o.durationLabel}):null,
    s?(0,A.jsxs)(`div`,{className:`mp-clip-player`,children:[
      (0,A.jsx)(`video`,{controls:!0,playsInline:!0,preload:`metadata`,src:o.src,ref:i,"aria-label":o.presenter?`${o.title} with ${o.presenter}`:o.title,autoPlay:!0}),
      o.captionsNote?(0,A.jsx)(`p`,{className:`muted mp-captions-note`,children:o.captionsNote}):null
    ]}):(0,A.jsxs)(`div`,{className:`video-placeholder`,children:[
      (0,A.jsx)(`h3`,{children:`HeyGen not rendered yet`}),
      (0,A.jsx)(`p`,{children:`This card opens the script. Play appears only when a real mp4 or webm file exists.`}),
      (0,A.jsx)(`p`,{children:`No video has been rendered for this item. No credits are used by this preview.`})
    ]}),
    (0,A.jsxs)(`section`,{className:`transcript`,tabIndex:0,"aria-label":`Video text`,children:[
      (0,A.jsx)(`h3`,{children:s?`Words from this clip`:e.video.transcriptText?`Script transcript · draft`:`Production outline · draft`}),
      (0,A.jsx)(`p`,{style:{whiteSpace:`pre-line`},children:e.video.transcriptText||e.video.outline||e.video.description||`A full script and reviewed video will be added after content and production review.`}),
      s?null:(0,A.jsx)(`p`,{className:`muted`,children:`Preparation material, awaiting qualified content review. You can leave or choose another activity at any time.`})
    ]})
  ]})});
}
function MpWatchWithMaddy(){
  let e=mpReadings.maddyCompanionVideos(mpMaddy);
  return(0,A.jsxs)(`section`,{className:`simple-panel watch-with-maddy`,"aria-label":`Watch with Maddy`,children:[
    (0,A.jsx)(MpLibraryHost,{}),
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`COMPANION · READY TO PLAY`}),
    (0,A.jsx)(`h2`,{children:`Watch with Maddy`}),
    (0,A.jsx)(`p`,{children:`Welcome, Daily tip and Timed breath — finished companion clips. Tap Play to open the player. These are not HeyGen drafts.`}),
    (0,A.jsx)(`div`,{className:`maddy-video-grid`,children:e.map(t=>{
      let n=mpReadings.libraryCardModel(t);
      return(0,A.jsxs)(`button`,{type:`button`,className:`maddy-video-card`,"aria-label":n.ariaLabel,onClick:()=>mpReadings.activateLibraryVideo(t),onKeyDown:e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),mpReadings.activateLibraryVideo(t))},children:[
        (0,A.jsx)(`h3`,{children:t.cardTitle}),
        (0,A.jsx)(`p`,{children:t.description}),
        (0,A.jsxs)(`div`,{className:`maddy-play-cover`,"aria-hidden":`true`,children:[
          (0,A.jsx)(`span`,{className:`play-dot`,children:(0,A.jsx)(rn,{size:18})}),
          (0,A.jsx)(`span`,{className:`card-link`,children:n.cta})
        ]}),
        (0,A.jsx)(`p`,{className:`muted`,children:t.durationLabel})
      ]},t.id);
    })}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Native MP4 · /mindpal/videos/maddy · Welcome · Daily tip · Timed breath`})
  ]});
}
