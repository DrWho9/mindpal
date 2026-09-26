function mpCompanionBaseCard({onChanged:e}){
  let fromLink=mpCompanion.companionBaseFromSearch((typeof location!==`undefined`&&location.search)||``);
  let[t,n]=(0,_.useState)(()=>mpCompanion.storedCompanionBase()||fromLink);
  let[r,i]=(0,_.useState)(``);
  function a(s){
    s&&s.preventDefault&&s.preventDefault();
    let o=mpCompanion.persistCompanionBase(t);
    n(o);
    i(o?`Saved on this phone. Checking live chat now.`:`Cleared. Live chat stays off until an address is saved.`);
    e&&e(o);
  }
  function known(){
    let o=mpCompanion.persistCompanionBase(mpCompanion.SUGGESTED_COMPANION_BASE);
    n(o);
    i(`Saved the MindPal address on this phone. Checking live chat now.`);
    e&&e(o);
  }
  function saveLink(){
    if(!fromLink)return;
    let o=mpCompanion.persistCompanionBase(fromLink);
    n(o);
    i(`Saved the address from this link. Checking live chat now.`);
    e&&e(o);
  }
  function o(){
    n(``);
    mpCompanion.persistCompanionBase(``);
    i(`Cleared. Live chat stays off until an address is saved.`);
    e&&e(``);
  }
  return(0,A.jsxs)(`form`,{className:`mp-companion-base`,onSubmit:a,children:[
    (0,A.jsx)(`p`,{children:`Live chat stays off until this phone saves an address. One save is enough.`}),
    (0,A.jsx)(`label`,{htmlFor:`mp-companion-base`,children:`Companion address`}),
    (0,A.jsx)(`input`,{id:`mp-companion-base`,type:`url`,inputMode:`url`,autoComplete:`off`,spellCheck:!1,value:t,placeholder:mpCompanion.SUGGESTED_COMPANION_BASE,onChange:s=>n(s.target.value)}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`primary`,type:`submit`,children:`Save address`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:known,children:`Save the MindPal address`}),
      fromLink?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:saveLink,children:`Save the address from this link`}):null,
      (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:o,children:`Turn live chat off`})
    ]}),
    (0,A.jsx)(`p`,{className:`muted`,children:`Saved only on this phone. This build does not invent a public tunnel. Practice mode stays on until live chat answers.`}),
    r?(0,A.jsx)(`p`,{role:`status`,children:r}):null
  ]});
}
