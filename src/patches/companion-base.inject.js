function mpCompanionBaseCard({onChanged:e}){
  let[t,n]=(0,_.useState)(()=>mpCompanion.storedCompanionBase());
  let[r,i]=(0,_.useState)(``);
  function a(s){
    s&&s.preventDefault&&s.preventDefault();
    let o=mpCompanion.persistCompanionBase(t);
    n(o);
    i(o?`Saved on this device. MindPal will re-check Live status.`:`Cleared. Using the default /mindpal/ path until a public URL is pasted.`);
    e&&e(o);
  }
  function o(){
    n(``);
    mpCompanion.persistCompanionBase(``);
    i(`Cleared. Using the default /mindpal/ path until a public URL is pasted.`);
    e&&e(``);
  }
  return(0,A.jsxs)(`form`,{className:`mp-companion-base`,onSubmit:a,children:[
    (0,A.jsx)(`label`,{htmlFor:`mp-companion-base`,children:`Companion API base · paste when Live is up`}),
    (0,A.jsx)(`input`,{id:`mp-companion-base`,type:`text`,inputMode:`url`,autoComplete:`off`,spellCheck:!1,value:t,placeholder:`https://your-proxy.example/mindpal/`,onChange:s=>n(s.target.value)}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`secondary`,type:`submit`,children:`Save base on this device`}),
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:o,children:`Use default /mindpal/`})
    ]}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Overrides stay in this browser (localStorage mindpal.companion.base, or window.MINDPAL_COMPANION_BASE). No public tunnel is baked into the app. Demo stays up until status returns available.`}),
    r?(0,A.jsx)(`p`,{role:`status`,children:r}):null
  ]});
}
