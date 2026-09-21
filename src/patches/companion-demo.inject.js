function mpCompanionPage({onHelp:e,onExercise:t,onReflect:n}){
  let[i,a]=(0,_.useState)(()=>mpCompanionDemo.emptyCompanionState());
  let[o,s]=(0,_.useState)(()=>typeof mpProblems<`u`&&mpProblems.takeCompanionPrompt?mpProblems.takeCompanionPrompt()||``:``);
  let[c,l]=(0,_.useState)(!1);
  let[u,d]=(0,_.useState)(``);
  let[f,p]=(0,_.useState)([]);
  let[m,h]=(0,_.useState)(!1);
  let[k,j]=(0,_.useState)(0);
  (0,_.useEffect)(()=>{
    let cancelled=!1;
    mpCompanion.fetchCompanionStatus().then(status=>{
      if(!cancelled)a(prev=>mpCompanionDemo.setCompanionLive(prev,status));
    });
    return()=>{cancelled=!0};
  },[k]);
  function C(choiceId){
    let next=mpCompanionDemo.applyChoice(i,choiceId);
    a(next);
    if(next.navigate===mpCompanionDemo.HELP_ROUTE)e&&e();
  }
  function w(){
    let next=mpCompanionDemo.revealPractices(i);
    a(next);
    if(next.navigate===mpCompanionDemo.HELP_ROUTE)e&&e();
  }
  function T(cardId){
    let next=mpCompanionDemo.activatePracticeCard(i,cardId);
    a(next);
    if(next.exerciseId)t&&t(next.exerciseId);
    if(next.navigate===mpCompanionDemo.REFLECT_ROUTE)n&&n();
    if(next.navigate===mpCompanionDemo.HELP_ROUTE)e&&e();
  }
  function E(){
    let next=mpCompanionDemo.openLiveChat(i);
    a(next);
  }
  async function O(){
    if(m)return;
    if(mpCompanionDemo.isCrisisChoice(i.choiceId)){
      e&&e();
      return;
    }
    let message=u.trim();
    if(!message){
      p(prev=>[...prev,{role:`guide`,text:`A typed message is optional. The local demo still works — show practice choices, or use Help if you need a person.`}]);
      return;
    }
    h(!0);
    try{
      let result=await mpCompanion.sendCompanionChat({
        message,
        safetyState:i.choiceId,
        lane:`companion`,
      });
      if(result.kind!==`reply`||!result.value||!result.value.reply){
        p(prev=>[...prev,{role:`you`,text:message},{role:`guide`,text:`Live chat is not available yet. Practice cards and Help still work on this page.`}]);
      }else{
        p(prev=>[...prev,{role:`you`,text:message},{role:`guide`,text:result.value.reply,disclosure:result.value.modelDisclosure}]);
        if(result.value.kind===`human_help`)e&&e();
      }
      d(``);
    }catch{
      p(prev=>[...prev,{role:`you`,text:message},{role:`guide`,text:`Could not reach the companion proxy. Local practice choices and Help remain available.`}]);
    }finally{
      h(!1);
    }
  }
  let live=i.status===`live`;
  let panel=mpCompanionDemo.INTENT_PANELS[i.choiceId]||mpCompanionDemo.INTENT_PANELS.ordinary;
  let crisis=i.panel===`crisis`||mpCompanionDemo.isCrisisChoice(i.choiceId);
  return(0,A.jsxs)(`div`,{className:`mp-companion-page`,children:[
    (0,A.jsx)(`p`,{className:`eyebrow`,children:`A LITTLE COMPANY, WITH CLEAR BOUNDARIES`}),
    (0,A.jsx)(`h1`,{children:`At your pace.`}),
    (0,A.jsx)(`p`,{className:`lede`,children:`An optional guide to a small next step.`}),
    (0,A.jsxs)(`div`,{className:`companion-layout`,children:[
      (0,A.jsxs)(`section`,{className:`companion-stage`,children:[
        !c&&(0,A.jsx)(Ui,{}),
        (0,A.jsx)(`h2`,{children:`Your MindPal companion`}),
        (0,A.jsx)(`p`,{children:`Interactive practice preview`}),
        (0,A.jsx)(Wi,{children:mpCompanionDemo.companionBanner(i)}),
        (0,A.jsxs)(`div`,{className:`button-row`,children:[
          (0,A.jsx)(`button`,{className:`secondary small-button`,type:`button`,onClick:()=>l(!c),children:c?`Show character`:`Text-only view`}),
          (0,A.jsxs)(`span`,{className:`muted`,children:[(0,A.jsx)(En,{size:16}),`No audio or microphone`]})
        ]})
      ]}),
      (0,A.jsxs)(`section`,{className:`companion-chat`,children:[
        (0,A.jsx)(`h2`,{children:`A guide, with you in control.`}),
        (0,A.jsx)(`p`,{children:`This character offers fixed practice choices. It is not a person, therapist or emergency service. Your diary is never accessed automatically.`}),
        (0,A.jsxs)(`div`,{className:`support-choices`,children:[
          (0,A.jsx)(`p`,{className:`eyebrow`,children:`CHOOSE WHAT FITS · THE DEMO DOES NOT ASSESS TEXT`}),
          mpCompanionDemo.CHOICES.map(choice=>(0,A.jsx)(`button`,{
            type:`button`,
            className:i.choiceId===choice.id?`selected`:``,
            "aria-pressed":i.choiceId===choice.id,
            onClick:()=>C(choice.id),
            children:choice.label,
          },choice.id))
        ]}),
        (0,A.jsxs)(`div`,{className:`mp-companion-panel ${crisis?`mp-companion-panel-crisis`:``}`,role:`status`,"aria-live":`polite`,children:[
          (0,A.jsx)(`h3`,{children:panel.title}),
          (0,A.jsx)(`p`,{children:panel.body})
        ]}),
        crisis?(0,A.jsxs)(`div`,{className:`urgent-box mp-crisis-panel`,children:[
          (0,A.jsx)(`strong`,{children:`Human help comes first.`}),
          (0,A.jsx)(`p`,{children:`If you are in immediate danger in Australia, call 000. For crisis support, call Lifeline on 13 11 14.`}),
          (0,A.jsxs)(`div`,{className:`button-row`,children:[
            (0,A.jsx)(`a`,{className:`primary`,href:`tel:000`,children:`Call 000`}),
            (0,A.jsx)(`a`,{className:`secondary`,href:`tel:131114`,children:`Call Lifeline 13 11 14`}),
            (0,A.jsx)(`button`,{className:`primary`,type:`button`,onClick:()=>e&&e(),children:`Open Help`})
          ]})
        ]}):null,
        i.practicesVisible&&!crisis?(0,A.jsxs)(`div`,{className:`mp-practice-grid`,"aria-label":`Practice choices`,children:[
          (0,A.jsx)(`p`,{className:`eyebrow`,children:`PRACTICE CHOICES · OPTIONAL`}),
          mpCompanionDemo.PRACTICE_CARDS.map(card=>(0,A.jsxs)(`article`,{className:`mp-practice-card${i.expandedCardId===card.id?` is-open`:``}`,children:[
            (0,A.jsx)(`h3`,{children:card.title}),
            (0,A.jsx)(`p`,{children:card.teaser||card.body}),
            (0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:()=>T(card.id),children:i.expandedCardId===card.id&&card.action.type===`expand`?`Hide this` : card.cta}),
            i.expandedCardId===card.id&&card.action.type===`expand`?(0,A.jsx)(`p`,{className:`mp-practice-expand`,children:card.body}):null
          ]},card.id))
        ]}):null,
        live&&i.chatOpen?(0,A.jsxs)(`div`,{className:`mp-companion-live-chat`,children:[
          (0,A.jsx)(`h3`,{children:`Talk with MindPal`}),
          (0,A.jsx)(`p`,{className:`muted`,children:`Live replies go through a private server proxy. Crisis paths stay on this page.`}),
          f.map((msg,idx)=>(0,A.jsxs)(`p`,{className:`mp-chat-line mp-chat-${msg.role}`,children:[
            (0,A.jsx)(`strong`,{children:msg.role===`you`?`You`:`MindPal`}),
            ` · `,
            msg.text,
            msg.disclosure?(0,A.jsx)(`span`,{className:`muted`,children:` ${msg.disclosure}`}):null
          ]},idx)),
          (0,A.jsx)(`label`,{htmlFor:`mp-live-chat`,children:`Message the AI companion`}),
          (0,A.jsx)(`textarea`,{id:`mp-live-chat`,value:u,maxLength:2e3,onChange:ev=>d(ev.target.value),placeholder:`Type a message, or leave blank and use the demo.`}),
          (0,A.jsx)(`button`,{className:`primary`,type:`button`,disabled:m,onClick:O,children:m?`Sending…`:`Send to AI companion`})
        ]}):null,
        (0,A.jsxs)(`label`,{htmlFor:`companion-message`,children:[
          `Sample message`,
          ` `,
          (0,A.jsx)(`span`,{className:`muted`,children:`optional · demo does not interpret this`})
        ]}),
        (0,A.jsx)(`textarea`,{id:`companion-message`,value:o,maxLength:2e3,onChange:ev=>s(ev.target.value),placeholder:`Use sample text only…`}),
        (0,A.jsxs)(`div`,{className:`button-row`,children:[
          (0,A.jsxs)(`button`,{className:`primary`,type:`button`,onClick:w,children:[
            mpCompanionDemo.primaryCtaLabel(i),
            ` →`
          ]}),
          live?(0,A.jsx)(`button`,{className:`secondary`,type:`button`,onClick:E,children:`Talk with MindPal`}):null,
          (0,A.jsx)(`button`,{className:`text-button`,type:`button`,onClick:()=>e&&e(),children:`Reach human support`})
        ]}),
        (0,A.jsx)(`p`,{className:`muted`,children:`Local demo · no automatic retries · Help is always available`}),
        (0,A.jsxs)(`details`,{className:`mp-companion-setup`,open:!live,children:[
          (0,A.jsx)(`summary`,{children:`Live companion address (optional)`}),
          (0,A.jsx)(`p`,{children:`Paste a companion base URL when a private proxy is up. This build does not invent a public tunnel. You can also set ?companionBase=, localStorage mindpal.companion.base, or window.MINDPAL_COMPANION_BASE.`}),
          (0,A.jsx)(mpCompanionBaseCard,{onChanged:()=>j(tick=>tick+1)})
        ]})
      ]})
    ]})
  ]});
}
