function mpVoicePicker(){
  let[e,t]=(0,_.useState)(()=>mpReadings.loadSavedVoiceURI()||``);
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
    (0,A.jsx)(`span`,{children:`Voice`}),
    (0,A.jsxs)(`select`,{"aria-label":`Listen voice`,value:e,onChange:n=>{
      let r=n.target.value;
      t(r);
      mpReadings.saveVoiceURI(r);
    },children:[
      (0,A.jsx)(`option`,{value:``,children:`Auto (best English)`}),
      n.map(e=>(0,A.jsx)(`option`,{value:e.voiceURI,children:e.label},e.voiceURI))
    ]})
  ]});
}
