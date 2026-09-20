function mpVoicePicker(){
  let[e,t]=(0,_.useState)(()=>mpReadings.loadSavedVoiceURI()||mpReadings.MADDY_PREF_URI);
  let[n,r]=(0,_.useState)([]);
  (0,_.useEffect)(()=>{
    let i=()=>{
      let a=typeof window<`u`&&window.speechSynthesis?window.speechSynthesis.getVoices()||[]:[];
      r(mpReadings.listPickerVoices(a));
    };
    i();
    if(typeof window<`u`&&window.speechSynthesis){
      window.speechSynthesis.addEventListener(`voiceschanged`,i);
      return()=>window.speechSynthesis.removeEventListener(`voiceschanged`,i);
    }
  },[]);
  return(0,A.jsxs)(`label`,{className:`mindpal-voice-picker`,children:[
    (0,A.jsx)(`span`,{children:`Listen voice`}),
    (0,A.jsxs)(`select`,{"aria-label":`Listen voice`,value:e,onChange:n=>{
      let r=n.target.value;
      t(r);
      mpReadings.saveVoiceURI(r);
    },children:[
      (0,A.jsx)(`option`,{value:mpReadings.MADDY_PREF_URI,children:mpReadings.MADDY_PREF_LABEL}),
      (0,A.jsx)(`option`,{value:``,children:`Auto (best English)`}),
      n.map(e=>(0,A.jsx)(`option`,{value:e.voiceURI,children:e.label},e.voiceURI))
    ]}),
    (0,A.jsx)(`span`,{className:`muted mindpal-voice-note`,children:`Maddy’s recorded clips play for her companion videos. Other text uses a calmer device voice until a Maddy voice ID is available.`})
  ]});
}
function mpMaddyListenButtons(){
  let[e,t]=(0,_.useState)(``);
  async function n(i){
    t(i);
    try{await mpReadings.playMaddyClip(i)}catch{}
    t(``);
  }
  return(0,A.jsxs)(`span`,{className:`mindpal-maddy-listen`,children:[
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>n(`welcome`),children:e===`welcome`?`Playing welcome…`:`Play Maddy’s welcome`}),
    (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>n(`tip`),children:e===`tip`?`Playing tip…`:`Play Maddy’s tip`})
  ]});
}
