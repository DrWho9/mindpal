function _e({initialTopic:e=``,entries:t=T,onPractice:n,onDiary:r,onHelp:i}){
  let{state:a}=I();
  let catalog=mpReadings.withDirectorySnapshot(t,typeof mpYtDirectoryCandidates<`u`?mpYtDirectoryCandidates:{entries:[]},typeof mpYtDirectoryViews<`u`?mpYtDirectoryViews:{videos:{}});
  let[c,l]=(0,_.useState)(``);
  let[Y,z]=(0,_.useState)(``);
  let[J,X]=(0,_.useState)(``);
  let[f,p]=(0,_.useState)(!1);
  let[m,h]=(0,_.useState)(``);
  let[b,x]=(0,_.useState)(()=>({...se,topic:e}));
  let S=(0,_.useRef)(null);
  let te=mpReadings.directorySpeakerOptions(catalog,E);
  let M={...b,favouriteIds:a.ids};
  let speakerIds=J?[]:(M.speakerMode===`discover`?[]:a.ids);
  let ne=mpReadings.filterDirectoryEntries(catalog,{
    query:Y,
    speakerId:J,
    speakerIds,
    speakers:E,
    topic:M.topic,
    time:M.time
  });
  let L=e=>{x(t=>({...t,...e}))};
  function applySearch(e){
    if(e&&e.preventDefault)e.preventDefault();
    z(c.trim());
    h(``);
  }
  function onSearchChange(e){
    let next=e.target.value;
    l(next);
    if(!next.trim())z(``);
  }
  function onSpeakerFilter(e){
    X(e.target.value);
    z(c.trim());
    h(``);
  }
  let re=(entry)=>(0,A.jsxs)(`article`,{className:`activity-detail mp-yt-dir-card`,"aria-label":entry.title,children:[
    (0,A.jsx)(`h3`,{children:entry.title}),
    (0,A.jsxs)(`p`,{children:[entry.creator,` · `,he(entry.durationSeconds)]}),
    (0,A.jsx)(`p`,{className:`mp-yt-views`,children:mpReadings.formatDirectoryViews(entry)}),
    !!entry.speakerIds?.length&&(0,A.jsxs)(`p`,{children:[`Speaker:`,` `,entry.speakerIds.map(id=>E.find(s=>s.id===id)?.name||`Identity awaiting verification`).join(`, `)]}),
    (0,A.jsx)(`p`,{children:entry.synopsis}),
    (0,A.jsxs)(`details`,{children:[
      (0,A.jsx)(`summary`,{children:`Source and review context`}),
      entry.sourceContext?(0,A.jsxs)(`p`,{children:[`Source: `,entry.sourceContext]}):null,
      entry.proposedRelevance?.reason&&(0,A.jsxs)(`p`,{children:[`Proposed topic connection: `,entry.proposedRelevance.reason,` This research note does not make the video eligible for a personalised suggestion.`]}),
      entry.reviewNotes?(0,A.jsx)(`p`,{children:entry.reviewNotes}):null,
      (0,A.jsx)(`p`,{children:entry.selection?.captions===`verified`?`Caption review recorded for this source version.`:`Captions and full audiovisual accessibility have not been verified by MindPal.`}),
      (0,A.jsxs)(`p`,{children:[`Availability checked: `,entry.checkedAt||`not yet checked`,` · `,entry.coverage||`Review context is listed for literacy, not as a clinical clearance.`]})
    ]}),
    (0,A.jsx)(`p`,{className:`mp-yt-badge`,children:le(entry)?`Human content review recorded · see scope and date`:`Draft candidate · human review pending`}),
    le(entry)&&(0,A.jsxs)(`p`,{children:[`Reviewer: `,entry.humanReview?.reviewer,` · `,entry.humanReview?.date,` · `,entry.humanReview?.scope]}),
    mpReadings.directoryOpenUrl(entry)
      ?(0,A.jsx)(`a`,{className:`primary mp-yt-open`,href:mpReadings.directoryOpenUrl(entry),target:`_blank`,rel:`noopener noreferrer`,referrerPolicy:`no-referrer`,children:`Open on YouTube`})
      :(0,A.jsx)(`p`,{className:`muted`,children:`This entry is not available to open here.`})
  ]},entry.id);
  return(0,A.jsxs)(`section`,{className:`simple-panel feelings-space mp-yt-directory`,"aria-label":`YouTube video directory`,children:[
    (0,A.jsx)(`h2`,{ref:S,tabIndex:-1,children:`YouTube video directory`}),
    (0,A.jsx)(`p`,{children:`Search titles, creators, speakers and tags, then open a matching video on YouTube. Videos are grouped by topic, with the highest public view count first in each group. A listing is a reference, not a recommendation or a diagnosis.`}),
    (0,A.jsxs)(`details`,{children:[
      (0,A.jsx)(`summary`,{children:`External videos and your privacy`}),
      (0,A.jsx)(`p`,{children:`YouTube opens only when you choose a link. Its ads, recommendations and privacy practices apply. MindPal does not load YouTube players or thumbnails here, or include your chosen feeling or diary text in the link.`})
    ]}),
    (0,A.jsxs)(`form`,{className:`mp-yt-dir-search`,role:`search`,"aria-label":`Search the YouTube directory`,onSubmit:applySearch,children:[
      (0,A.jsxs)(`div`,{className:`mp-yt-dir-field`,children:[
        (0,A.jsx)(`label`,{htmlFor:`youtube-search`,children:`Search titles, creators and descriptions`}),
        (0,A.jsx)(`input`,{id:`youtube-search`,type:`search`,value:c,onChange:onSearchChange,autoComplete:`off`})
      ]}),
      (0,A.jsxs)(`div`,{className:`mp-yt-dir-field`,children:[
        (0,A.jsx)(`label`,{htmlFor:`youtube-speaker-filter`,children:`Choose a speaker`}),
        (0,A.jsxs)(`select`,{id:`youtube-speaker-filter`,value:J,onChange:onSpeakerFilter,children:[
          (0,A.jsx)(`option`,{value:``,children:`All speakers`}),
          te.map(s=>(0,A.jsx)(`option`,{value:s.id,children:s.name},s.id))
        ]})
      ]}),
      (0,A.jsx)(`button`,{className:`primary`,type:`submit`,children:`Search`})
    ]}),
    (0,A.jsx)(`p`,{role:`status`,"aria-label":`Directory entries`,children:ne.length?`${ne.length} director${ne.length===1?`y entry`:`y entries`}`:mpReadings.directoryEmptyCopy({query:Y,speakerId:J,speakerIds})}),
    ne.length
      ?(String(Y||``).trim()||J
        ?(0,A.jsx)(`div`,{className:`mp-yt-dir-results`,children:ne.map(entry=>re(entry))})
        :(0,A.jsx)(`div`,{className:`mp-yt-dir-groups`,children:mpReadings.groupDirectoryByCategory(ne).map(group=>(0,A.jsxs)(`section`,{className:`mp-yt-dir-group`,"aria-label":group.title,children:[
          (0,A.jsx)(`h3`,{className:`mp-yt-dir-category`,children:group.title}),
          (0,A.jsx)(`div`,{className:`mp-yt-dir-results`,children:group.entries.map(entry=>re(entry))})
        ]},group.id))}))
      :(0,A.jsx)(`p`,{className:`muted`,children:mpReadings.directoryEmptyCopy({query:Y,speakerId:J,speakerIds})}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,"aria-expanded":f,onClick:()=>p(e=>!e),children:`Choose or edit speakers`})
    ]}),
    f&&(0,A.jsx)(ee,{onSkip:()=>{p(!1),S.current?.focus()},onDiscover:()=>{L({speakerMode:`discover`}),X(``),p(!1),S.current?.focus()}}),
    (0,A.jsxs)(`details`,{children:[
      (0,A.jsx)(`summary`,{children:`Adjust time, style and speaker choices · optional`}),
      (0,A.jsxs)(`fieldset`,{className:`video-filters`,children:[
        (0,A.jsx)(`legend`,{children:`Adjust your choices · optional`}),
        (0,A.jsx)(`label`,{htmlFor:`youtube-topic`,children:`Feeling or topic · optional`}),
        (0,A.jsxs)(`select`,{id:`youtube-topic`,value:b.topic,onChange:e=>L({topic:e.target.value}),children:[
          (0,A.jsx)(`option`,{value:``,children:`Browse without choosing a feeling`}),
          C.map(([id,label])=>(0,A.jsx)(`option`,{value:id,children:label},id))
        ]}),
        (0,A.jsx)(`label`,{htmlFor:`youtube-duration`,children:`Video length`}),
        (0,A.jsxs)(`select`,{id:`youtube-duration`,value:b.time,onChange:e=>L({time:e.target.value}),children:[
          (0,A.jsx)(`option`,{value:`any`,children:`Any full length`}),
          (0,A.jsx)(`option`,{value:`short`,children:`Up to 5 minutes`}),
          (0,A.jsx)(`option`,{value:`medium`,children:`Over 5 to 10 minutes`}),
          (0,A.jsx)(`option`,{value:`long`,children:`Over 10 to 15 minutes`}),
          (0,A.jsx)(`option`,{value:`more`,children:`More time · over 15 minutes`})
        ]}),
        (0,A.jsx)(`label`,{htmlFor:`youtube-speakers`,children:`Speaker choices`}),
        (0,A.jsxs)(`select`,{id:`youtube-speakers`,value:b.speakerMode,onChange:e=>L({speakerMode:e.target.value}),children:[
          (0,A.jsx)(`option`,{value:`favourites-first`,children:`Favourites first`}),
          (0,A.jsx)(`option`,{value:`only-mine`,children:`Only my speakers`}),
          (0,A.jsx)(`option`,{value:`discover`,children:`Discover other speakers`})
        ]})
      ]})
    ]}),
    (0,A.jsx)(`p`,{role:`status`,"aria-label":`Video feedback`,children:m}),
    (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>{x({...se}),h(`Filters cleared.`),l(``),z(``),X(``)},children:`Clear filters and feedback`}),
    (0,A.jsxs)(`div`,{className:`button-row`,children:[
      n&&(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:n,children:`Choose a short practice`}),
      r&&(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:r,children:`Open my diary instead`}),
      i&&(0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:i,children:`View human-support options`})
    ]})
  ]});
}
