function mpProfileAvatarMark({profile:e,name:t,size:n=`chrome`}){
  let r=mpProfile.avatarStyle(e&&e.avatar),i=mpProfile.findAvatarShape(e&&e.avatar&&e.avatar.shape),a=mpProfile.avatarFace(e,t);
  return(0,A.jsx)(`span`,{className:`mp-avatar mp-avatar-${n} is-${i.id}`,style:r,"aria-hidden":`true`,children:a.text});
}
function mpProfileButton({onOpen:e,placement:t=`sidebar`}){
  let[n,r]=(0,_.useState)(()=>mpProfile.loadProfile(undefined,typeof mpSpeakersCatalog<`u`?mpSpeakersCatalog:[])),[i,a]=(0,_.useState)(()=>mpSignedInName(``));
  (0,_.useEffect)(()=>{
    function e(){
      r(mpProfile.loadProfile(undefined,typeof mpSpeakersCatalog<`u`?mpSpeakersCatalog:[]));
      a(mpSignedInName(``));
    }
    window.addEventListener(mpProfile.PROFILE_CHANGE_EVENT,e);
    window.addEventListener(`mindpal-session-change`,e);
    return()=>{
      window.removeEventListener(mpProfile.PROFILE_CHANGE_EVENT,e);
      window.removeEventListener(`mindpal-session-change`,e);
    };
  },[]);
  return(0,A.jsx)(`button`,{type:`button`,className:`mp-profile-btn mp-profile-btn-${t}`,"aria-label":`Open your MindPal profile`,onClick:()=>e&&e(),children:(0,A.jsx)(mpProfileAvatarMark,{profile:n,name:i,size:`chrome`})});
}
function mpProfileAccordion({open:e,onOpen:t,id:n,title:r,summary:i,children:a}){
  let o=e===n;
  return(0,A.jsxs)(`div`,{className:`mp-profile-acc${o?` is-open`:``}`,children:[
    (0,A.jsxs)(`button`,{type:`button`,className:`mp-profile-acc-head`,"aria-expanded":o,onClick:()=>t(o?``:n),children:[
      (0,A.jsx)(`span`,{className:`mp-profile-acc-title`,children:r}),
      i?(0,A.jsx)(`span`,{className:`muted mp-profile-acc-sum`,children:i}):null
    ]}),
    o?(0,A.jsx)(`div`,{className:`mp-profile-acc-body`,children:a}):null
  ]});
}
function mpProfilePage(){
  let speakers=typeof mpSpeakersCatalog<`u`?mpSpeakersCatalog:[];
  let catalog=mpProfile.listProfileSpeakers(speakers);
  let[e,t]=(0,_.useState)(()=>mpProfile.loadProfile(undefined,speakers));
  let[n,r]=(0,_.useState)(()=>mpSignedInName(``));
  let[i,a]=(0,_.useState)(`avatar`);
  let[o,s]=(0,_.useState)(``);
  let[c,l]=(0,_.useState)(``);
  let[u,d]=(0,_.useState)(``);
  let[f,p]=(0,_.useState)(``);
  let[m,h]=(0,_.useState)(``);
  let[g,v]=(0,_.useState)(``);
  (0,_.useEffect)(()=>{
    function e(){
      t(mpProfile.loadProfile(undefined,speakers));
      r(mpSignedInName(``));
    }
    window.addEventListener(mpProfile.PROFILE_CHANGE_EVENT,e);
    window.addEventListener(`mindpal-session-change`,e);
    return()=>{
      window.removeEventListener(mpProfile.PROFILE_CHANGE_EVENT,e);
      window.removeEventListener(`mindpal-session-change`,e);
    };
  },[]);
  function C(next){
    let saved=mpProfile.persistProfile(next,undefined,speakers);
    t(saved);
    return saved;
  }
  function likes(){return mpProfile.listLikeOptions(e)}
  function extras(){return{name:n,speakers}}
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-lane-profile`,"aria-label":`MindPal profile`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`MINDPAL · YOUR SPACE`}),
    (0,A.jsx)(`h1`,{children:`Your MindPal profile`}),
    (0,A.jsx)(`p`,{className:`lede`,children:n?`A quiet corner for ${n} — likes, speakers, books and the things you hope to do.`:`A quiet corner for likes, speakers, books and the things you hope to do.`}),
    (0,A.jsx)(`p`,{className:`muted`,children:`This stays on this device. Nothing is sent to the cloud.`}),
    (0,A.jsxs)(`div`,{className:`mp-profile-hero`,children:[
      (0,A.jsx)(mpProfileAvatarMark,{profile:e,name:n,size:`hero`}),
      (0,A.jsxs)(`div`,{children:[
        (0,A.jsx)(`p`,{className:`mp-profile-name`,children:n||`You`}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Open one section at a time. Add only what feels useful.`})
      ]})
    ]}),
    (0,A.jsx)(mpProfileAccordion,{open:i,onOpen:a,id:`avatar`,title:`Avatar`,summary:mpProfile.sectionSummary(`avatar`,e,extras()),children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:`Use your initials, then pick a colour and shape. An illustration is optional.`}),
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`COLOUR`}),
      (0,A.jsx)(`div`,{className:`mp-profile-swatches`,"aria-label":`Avatar colour`,children:mpProfile.AVATAR_COLORS.map(color=>(0,A.jsx)(`button`,{type:`button`,className:`mp-profile-swatch${e.avatar.color===color.id?` is-on`:``}`,style:{background:color.bg,color:color.fg},"aria-pressed":e.avatar.color===color.id,"aria-label":color.label,onClick:()=>C(mpProfile.setAvatar({color:color.id},e)),children:color.label},color.id))}),
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`SHAPE`}),
      (0,A.jsx)(`div`,{className:`mp-profile-chips`,"aria-label":`Avatar shape`,children:mpProfile.AVATAR_SHAPES.map(shape=>(0,A.jsx)(`button`,{type:`button`,className:`mp-tag-chip${e.avatar.shape===shape.id?` is-active`:``}`,"aria-pressed":e.avatar.shape===shape.id,onClick:()=>C(mpProfile.setAvatar({shape:shape.id},e)),children:shape.label},shape.id))}),
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`ILLUSTRATION · OPTIONAL`}),
      (0,A.jsx)(`div`,{className:`mp-profile-chips`,"aria-label":`Avatar illustration`,children:[
        (0,A.jsx)(`button`,{type:`button`,className:`mp-tag-chip${!e.avatar.emoji?` is-active`:``}`,"aria-pressed":!e.avatar.emoji,onClick:()=>C(mpProfile.setAvatar({emoji:``},e)),children:`Initials`}),
        ...mpProfile.AVATAR_EMOJIS.map(emoji=>(0,A.jsx)(`button`,{type:`button`,className:`mp-tag-chip${e.avatar.emoji===emoji?` is-active`:``}`,"aria-pressed":e.avatar.emoji===emoji,"aria-label":`Choose ${emoji}`,onClick:()=>C(mpProfile.setAvatar({emoji},e)),children:emoji},emoji))
      ]})
    ]})}),
    (0,A.jsx)(mpProfileAccordion,{open:i,onOpen:a,id:`likes`,title:`Likes`,summary:mpProfile.sectionSummary(`likes`,e,extras()),children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:`Tap a few things that feel like you. You can add your own words if the set is missing something.`}),
      e.likes.length?null:(0,A.jsx)(`p`,{className:`muted mp-profile-empty`,children:`When you’re ready, choose a few likes. Nothing here is required.`}),
      (0,A.jsx)(`div`,{className:`mp-profile-chips`,"aria-label":`Likes`,children:likes().map(item=>(0,A.jsx)(`button`,{type:`button`,className:`mp-tag-chip${e.likes.includes(item.id)?` is-active`:``}`,"aria-pressed":e.likes.includes(item.id),onClick:()=>C(mpProfile.toggleLike(item.id,e)),children:item.label},item.id))}),
      (0,A.jsx)(`label`,{htmlFor:`mp-profile-like-custom`,children:`Add your own`}),
      (0,A.jsx)(`input`,{id:`mp-profile-like-custom`,value:o,maxLength:40,onChange:ev=>s(ev.target.value),onKeyDown:ev=>{if(ev.key===`Enter`){ev.preventDefault();let added=mpProfile.addCustomLike(o,e);if(!added.item)return;C(added.profile);s(``)}} ,placeholder:`Something quiet you enjoy…`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{let added=mpProfile.addCustomLike(o,e);if(!added.item)return;C(added.profile);s(``)},children:`Add this like`})
    ]})}),
    (0,A.jsx)(mpProfileAccordion,{open:i,onOpen:a,id:`speakers`,title:`Favourite speakers`,summary:mpProfile.sectionSummary(`speakers`,e,extras()),children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:`Choose from the MindPal speaker and coach catalog. Favourites stay on this device.`}),
      e.speakers.length?null:(0,A.jsx)(`p`,{className:`muted mp-profile-empty`,children:`No favourites yet — optional, whenever you like.`}),
      (0,A.jsx)(`div`,{className:`mp-profile-speaker-list`,"aria-label":`Speakers and coaches`,children:catalog.map(item=>(0,A.jsxs)(`button`,{type:`button`,className:`mp-profile-speaker${e.speakers.includes(item.id)?` is-on`:``}`,"aria-pressed":e.speakers.includes(item.id),onClick:()=>C(mpProfile.toggleSpeaker(item.id,e,speakers)),children:[
        (0,A.jsx)(`strong`,{children:item.name}),
        (0,A.jsx)(`span`,{className:`muted`,children:item.kind===`coach`?`MindPal coach · ${item.role}`:item.role})
      ]},item.id))})
    ]})}),
    (0,A.jsx)(mpProfileAccordion,{open:i,onOpen:a,id:`books`,title:`Books`,summary:mpProfile.sectionSummary(`books`,e,extras()),children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:`A short list of books you are reading, or have read. Title is enough.`}),
      e.books.length?(0,A.jsx)(`ul`,{className:`mp-profile-list`,children:e.books.map(item=>(0,A.jsxs)(`li`,{children:[
        (0,A.jsxs)(`div`,{children:[
          (0,A.jsx)(`strong`,{children:item.title}),
          item.author?(0,A.jsx)(`span`,{className:`muted`,children:item.author}):null
        ]}),
        (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>C(mpProfile.removeBook(item.id,e)),children:`Remove`})
      ]},item.id))}):(0,A.jsx)(`p`,{className:`muted mp-profile-empty`,children:`Nothing listed yet. Add a title when one comes to mind.`}),
      (0,A.jsx)(`label`,{htmlFor:`mp-profile-book-title`,children:`Book title`}),
      (0,A.jsx)(`input`,{id:`mp-profile-book-title`,value:c,maxLength:120,onChange:ev=>l(ev.target.value),placeholder:`The book’s name`}),
      (0,A.jsx)(`label`,{htmlFor:`mp-profile-book-author`,children:`Author · optional`}),
      (0,A.jsx)(`input`,{id:`mp-profile-book-author`,value:u,maxLength:80,onChange:ev=>d(ev.target.value),placeholder:`If you remember`}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{let added=mpProfile.addBook(c,u,e);if(!added.item)return;C(added.profile);l(``);d(``)},children:`Add this book`})
    ]})}),
    (0,A.jsx)(mpProfileAccordion,{open:i,onOpen:a,id:`goals`,title:`Plans and goals`,summary:mpProfile.sectionSummary(`goals`,e,extras()),children:(0,A.jsxs)(A.Fragment,{children:[
      (0,A.jsx)(`p`,{children:`Things you wish to do with your life, or want to accomplish. Mark one done when it has had its time.`}),
      e.goals.length?(0,A.jsx)(`ul`,{className:`mp-profile-list mp-profile-goals`,children:e.goals.map(item=>(0,A.jsxs)(`li`,{className:item.done?`is-done`:``,children:[
        (0,A.jsxs)(`div`,{children:[
          (0,A.jsx)(`strong`,{children:item.title}),
          item.note?(0,A.jsx)(`span`,{children:item.note}):null,
          item.timeframe||item.done?(0,A.jsx)(`span`,{className:`muted`,children:[mpProfile.timeframeLabel(item.timeframe),item.done?`${item.timeframe?` · `:``}Done`:``].filter(Boolean).join(``)}):null
        ]}),
        (0,A.jsxs)(`div`,{className:`button-row`,children:[
          (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>C(mpProfile.setGoalDone(item.id,!item.done,e)),children:item.done?`Undo done`:`Mark done`}),
          (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>C(mpProfile.removeGoal(item.id,e)),children:`Remove`})
        ]})
      ]},item.id))}):(0,A.jsx)(`p`,{className:`muted mp-profile-empty`,children:`A quiet list of things you hope to do. Add one when it comes to mind.`}),
      (0,A.jsx)(`label`,{htmlFor:`mp-profile-goal-title`,children:`A plan or goal`}),
      (0,A.jsx)(`input`,{id:`mp-profile-goal-title`,value:f,maxLength:140,onChange:ev=>p(ev.target.value),placeholder:`Something you hope to do`}),
      (0,A.jsx)(`label`,{htmlFor:`mp-profile-goal-note`,children:`A short note · optional`}),
      (0,A.jsx)(`input`,{id:`mp-profile-goal-note`,value:m,maxLength:280,onChange:ev=>h(ev.target.value),placeholder:`Why it matters, if you like`}),
      (0,A.jsx)(`label`,{htmlFor:`mp-profile-goal-when`,children:`Timeframe · optional`}),
      (0,A.jsxs)(`select`,{id:`mp-profile-goal-when`,value:g,onChange:ev=>v(ev.target.value),children:[
        (0,A.jsx)(`option`,{value:``,children:`No timeframe`}),
        ...mpProfile.GOAL_TIMEFRAMES.map(item=>(0,A.jsx)(`option`,{value:item.id,children:item.label},item.id))
      ]}),
      (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>{let added=mpProfile.addGoal({title:f,note:m,timeframe:g},e);if(!added.item)return;C(added.profile);p(``);h(``);v(``)},children:`Add this goal`})
    ]})})
  ]});
}
