function Gt(){
  let e=Vt(),[t,n]=(0,_.useState)(null),[r,i]=(0,_.useState)(null),a=(0,_.useId)(),o=(0,_.useRef)(null);
  let s=()=>n(null);
  (0,_.useEffect)(()=>{
    function e(){s();i(null)}
    window.addEventListener(mpNav.HOME_EVENT,e);
    return()=>window.removeEventListener(mpNav.HOME_EVENT,e);
  },[]);
  let c=t?mpReadings.videosForCoach(t,(mpVideoCatalog&&mpVideoCatalog.videos)||li.videos):[];
  let l=e=>{
    s();
    let t=e&&typeof e==`object`?e:(mpVideoCatalog&&mpVideoCatalog.videos||li.videos||[]).find(t=>t.id===e);
    t&&mpReadings.activateLibraryVideo(t,n=>{
      let r=(li.videos||[]).find(t=>t.id===n);
      r&&i(r);
    });
  };
  (0,_.useEffect)(()=>{
    if(!t)return;
    let e=document.activeElement,n=()=>o.current?.querySelector(`button`)?.focus(),r=e=>{o.current?.contains(e.target)||n()},i=document.body.style.overflow;
    return document.body.style.overflow=`hidden`,n(),document.addEventListener(`focusin`,r),()=>{document.removeEventListener(`focusin`,r),document.body.style.overflow=i,e?.focus()};
  },[t]);
  return(0,A.jsxs)(`section`,{className:`simple-panel signed-coaches`,"aria-label":`MindPal coaches`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`COACHES · SIGNED PRO`}),
    (0,A.jsx)(`h2`,{children:`Meet the signed MindPal coaches`}),
    (0,A.jsx)(`p`,{children:`Choose a signed DayStart coach to see their look and related Explore videos.`}),
    (0,A.jsx)(`div`,{className:`coach-grid`,children:e.map(e=>(0,A.jsxs)(`button`,{type:`button`,className:`coach-card`,"data-look-id":e.look_id,"data-coach-slug":e.slug,"aria-haspopup":`dialog`,"aria-label":`Open ${e.person}, signed DayStart coach`,onClick:()=>mpReadings.activateCoachCard(e,n),onKeyDown:t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),mpReadings.activateCoachCard(e,n))},children:[
      (0,A.jsx)(Wt,{look:e}),
      (0,A.jsx)(`p`,{className:`eyebrow coach-pro-badge`,children:e.kind||`PRO`}),
      (0,A.jsx)(`h3`,{children:e.person}),
      (0,A.jsx)(`p`,{children:e.blurb}),
      (0,A.jsxs)(`span`,{className:`card-link`,children:[`Meet `,e.person,` `,(0,A.jsx)(nn,{size:16})]})
    ]},e.look_id||e.slug))}),
    (0,A.jsx)(`p`,{className:`muted coach-hold`,children:`More coaches are on hold for now.`}),
    t?(0,A.jsx)(`div`,{className:`modal-backdrop`,onClick:e=>{e.target===e.currentTarget&&s()},children:(0,A.jsxs)(`div`,{className:`modal coach-modal`,ref:o,role:`dialog`,"aria-modal":`true`,"aria-labelledby":a,onKeyDown:e=>{
      if(e.key===`Escape`&&(e.stopPropagation(),s()),e.key===`Tab`){
        let t=Array.from(o.current?.querySelectorAll(`button:not(:disabled), a[href], [tabindex="0"]`)??[]).filter(e=>e.getClientRects().length>0),n=t[0],r=t[t.length-1];
        e.shiftKey&&document.activeElement===n?(e.preventDefault(),r?.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),n?.focus());
      }
    },children:[
      (0,A.jsxs)(`div`,{className:`modal-top`,children:[
        (0,A.jsx)(`span`,{className:`eyebrow`,children:`Signed DayStart coach`}),
        (0,A.jsx)(`button`,{className:`icon-button`,type:`button`,"aria-label":`Close coach`,onClick:s,children:(0,A.jsx)(On,{size:20})})
      ]}),
      (0,A.jsx)(Wt,{look:t}),
      (0,A.jsx)(`h2`,{id:a,children:t.person}),
      (0,A.jsx)(`p`,{className:`eyebrow coach-pro-badge`,children:t.kind||`PRO`}),
      (0,A.jsx)(`p`,{children:t.blurb}),
      (0,A.jsx)(`p`,{className:`muted`,children:`This is a signed DayStart coach look.`}),
      (0,A.jsx)(`h3`,{children:`Related Explore videos`}),
      c.length?(0,A.jsx)(`ul`,{className:`coach-related-videos`,children:c.map(e=>{
        let t=mpReadings.videoCardCta(e);
        return(0,A.jsx)(`li`,{children:(0,A.jsxs)(`button`,{type:`button`,className:`secondary coach-related-video`,"aria-label":mpReadings.videoCardAriaLabel(e),onClick:()=>l(e),onKeyDown:n=>{(n.key===`Enter`||n.key===` `)&&(n.preventDefault(),l(e))},children:[(0,A.jsx)(`strong`,{children:e.title}),(0,A.jsx)(`span`,{children:t})] })},e.id);
      })}):(0,A.jsx)(`p`,{className:`muted`,children:`No related Explore videos for this coach yet.`})
    ]})}):null,
    r?(0,A.jsx)(gi,{video:r,onClose:()=>i(null),onHelp:()=>i(null)}):null
  ]});
}
