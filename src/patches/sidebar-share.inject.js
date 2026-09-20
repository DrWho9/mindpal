function mpSidebarShare(){
  let[e,t]=(0,_.useState)(``);
  return(0,A.jsxs)(`div`,{className:`mindpal-sidebar-share`,children:[
    (0,A.jsx)(`button`,{type:`button`,className:`secondary mindpal-share-app`,"aria-label":`Share MindPal`,onClick:async()=>{
      let n=await mpReadings.shareMindPalApp();
      if(n===`cancelled`)return;
      t(n===`shared`?`Shared.`:n===`copied`?`Link copied.`: `Could not share.`);
      setTimeout(()=>t(``),2e3);
    },children:`Share`}),
    e?(0,A.jsx)(`p`,{role:`status`,"aria-live":`polite`,className:`muted`,children:e}):null
  ]});
}
