function mpYtMeditationsSection(){
  let e=mpMeditationCatalog||{},t=mpReadings.meditationCategories(e),[n,r]=(0,_.useState)(`sleep`),i=t.find(e=>e.id===n)||t[0],a=i?mpReadings.entriesForCategory(i):[],o=i?mpReadings.categoryFillNote(i):`This category is filling.`;
  return(0,A.jsxs)(`section`,{className:`simple-panel mindpal-yt-meditations`,"aria-label":`Voice-guided meditations on YouTube`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`REFERENCE · YOUTUBE`}),
    (0,A.jsx)(`h2`,{children:`Voice-guided meditations on YouTube`}),
    (0,A.jsx)(`p`,{children:`Choose a theme, then open a voice-guided session on YouTube. MindPal does not host or embed this audio.`}),
    (0,A.jsxs)(`details`,{className:`mindpal-yt-rank`,children:[
      (0,A.jsx)(`summary`,{children:`How these lists are ranked`}),
      (0,A.jsx)(`p`,{children:e.rankingRule||`English voice-guided only · primary sort = public YouTube view count · secondary = channel reach · exclude music-only · link-out only · refresh periodically · no hosting, ripping or transcripts.`})
    ]}),
    (0,A.jsx)(`div`,{className:`mindpal-yt-chips`,role:`tablist`,"aria-label":`Meditation categories`,children:t.map(e=>(0,A.jsx)(`button`,{type:`button`,className:`mindpal-yt-chip${i&&i.id===e.id?` is-active`:``}`,role:`tab`,"aria-selected":i&&i.id===e.id,onClick:()=>r(e.id),children:e.chip||e.title},e.id))}),
    i?(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsxs)(`h3`,{children:[i.title,i.status===`filling`?` · filling`:``]}),
      o?(0,A.jsx)(`p`,{className:`muted mindpal-yt-fill`,children:o}):null,
      a.length?(0,A.jsx)(`ul`,{className:`mindpal-yt-list`,children:a.map(e=>{
        let t=mpReadings.meditationOpenUrl(e);
        return(0,A.jsxs)(`li`,{className:`mindpal-yt-item`,children:[
          (0,A.jsx)(`h3`,{children:e.title}),
          (0,A.jsx)(`p`,{className:`mindpal-yt-meta`,children:[e.channel,` · `,mpReadings.formatMeditationViews(e)].filter(Boolean).join(``)}),
          t?(0,A.jsx)(`a`,{className:`secondary`,href:t,target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`}):(0,A.jsx)(`p`,{className:`muted`,children:`This entry is not available to open here.`})
        ]},e.id);
      })}):(0,A.jsx)(`p`,{className:`muted`,children:`No cards in this theme yet. This category is filling.`})
    ]}):null
  ]});
}
