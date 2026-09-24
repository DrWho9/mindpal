function bt({mode:e=`random`,tag:t}){
  if(t){
    return(0,A.jsx)(mpSupportReadings,{initialTag:t,heading:`Readings for this feeling`,showChips:!1});
  }
  let[n,r]=(0,_.useState)(()=>mpReadings.loadProgress()),i=mpReadings.packAComplete(n),a=mpReadings.orderedReadings(i?mpPackB:mpPackA),o=i?mpPackB:mpPackA,[s,c]=(0,_.useState)(null),[l,u]=(0,_.useState)(i&&!n.packBBannerSeen),[d,f]=(0,_.useState)(!1),[p,m]=(0,_.useState)(``),[openedId,setOpenedId]=(0,_.useState)(()=>mpReadings.takeOpenReadingId?mpReadings.takeOpenReadingId():``);
  (0,_.useEffect)(()=>{r(mpReadings.loadProgress())},[]);
  (0,_.useEffect)(()=>{
    function e(t){
      let n=t&&t.detail&&t.detail.id||(mpReadings.takeOpenReadingId?mpReadings.takeOpenReadingId():``);
      if(n)setOpenedId(n);
    }
    window.addEventListener(mpReadings.OPEN_READING_EVENT||`mindpal-open-reading`,e);
    return()=>window.removeEventListener(mpReadings.OPEN_READING_EVENT||`mindpal-open-reading`,e);
  },[]);
  let opened=openedId&&mpReadings.findReadingById?mpReadings.findReadingById(openedId,mpPackA,mpPackB,mpReadings.mergeOwnerReadings?mpReadings.mergeOwnerReadings(mpPackA):null):null;
  let b=opened||(i?s||mpReadings.pickRandom(a):mpReadings.nextIncomplete(a,n.completedIds));
  (0,_.useEffect)(()=>{if(i&&!s)c(mpReadings.pickRandom(a))},[i,a.length]);
  if(!b)return(0,A.jsx)(`section`,{className:`activity-detail`,"aria-label":`Daily reading`,children:(0,A.jsx)(`p`,{children:`No readings are loaded yet.`})});
  let x=n.completedIds.length,S=!i&&mpReadings.canMarkDone(a,n.completedIds,b),C=()=>{if(!S)return;let e=mpReadings.markReadingDone(n,b,a);mpReadings.saveProgress(e),r(e),e.completedIds.length>=100&&u(!0),m(`Marked Done. Opening or listening does not count.`)};
  return(0,A.jsxs)(`section`,{className:`activity-detail mindpal-daily-reading`,"aria-label":`Daily reading`,"data-pack-id":o.pack_id||o.packId,children:[l?(0,A.jsxs)(`div`,{className:`notice mindpal-pack-b-banner`,role:`status`,children:[(0,A.jsx)(`p`,{children:`Pack A is complete — 100/100 Done. Soften, Appreciate & Steady is now your daily default.`}),(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{let e={...n,packBBannerSeen:!0};mpReadings.saveProgress(e),r(e),u(!1)},children:`Got it`})]}):null,(0,A.jsxs)(`p`,{className:`eyebrow`,children:[`DAILY READING · `,i?`PACK B`:`PACK A`,` · DAY `,b.day,i?``:` OF 100`]}),i?null:(0,A.jsx)(`p`,{className:`mindpal-reading-progress`,children:`${x}/100 · ${mpReadings.PACK_A_PROGRESS_LINE}`}),opened?(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>setOpenedId(``),children:`← Today’s pack reading`}):null,(0,A.jsx)(`h3`,{children:b.title}),b.body.split(`

`).map((e,t)=>(0,A.jsx)(`p`,{children:e},t)),(0,A.jsxs)(`p`,{children:[(0,A.jsx)(`strong`,{children:`Practice:`}),` `,b.practice]}),i? (0,A.jsx)(`p`,{className:`muted`,children:`Original MindPal reading · supportive wellness, not clinical therapy. AU urgent help: 000 / Lifeline 13 11 14.`}):(0,A.jsx)(`p`,{className:`mindpal-reading-credit`,children:mpReadings.PACK_A_CREDIT}),(0,A.jsxs)(`div`,{className:`button-row`,children:[i?null:(0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:!S,onClick:C,children:n.completedIds.includes(b.id)?`Done`:`Done for today`}),(0,A.jsx)(mpListenPlayer,{id:b.id,text:yt(b),label:`Reading`}),(0,A.jsx)(mpVoicePicker,{}),(0,A.jsx)(mpMaddyListenButtons,{}),(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:async()=>{let e=await ft(yt(b)+`

— MindPal daily reading`);m(e===`copied`?`Copied.`:`Could not copy.`),setTimeout(()=>m(``),2e3)},children:`Copy`}),(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>f(!d),children:`Choose another morning practice`}),i?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{m(``),c(mpReadings.pickRandom(a,b.id))},children:`Another random reading`}):null]}),d?(0,A.jsxs)(`p`,{className:`muted mindpal-other-practice`,children:[`Verse, videos and other Explore cards stay available. Homemade Pack B is not the daily default until 100/100 Done. Opening, Listen or Copy does not mark a reading Done.`] }):null,p?(0,A.jsx)(`p`,{role:`status`,"aria-live":`polite`,children:p}):null]})}
