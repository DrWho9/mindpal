function mpOpenHash(route){
  let next=`#`+encodeURIComponent(route);
  try{history.pushState(null,``,next);}catch{location.hash=next;}
  try{window.dispatchEvent(new Event(`popstate`));}catch{}
}
function mpYourBooksCard(){
  return(0,A.jsxs)(`button`,{type:`button`,className:`feature-card mp-book-entry`,onClick:()=>mpOpenHash(`Book`),children:[
    (0,A.jsx)(`span`,{className:`card-type`,children:`YOUR BOOKS`}),
    (0,A.jsx)(`h3`,{children:`Book`}),
    (0,A.jsx)(`p`,{children:`A private PDF reader on this device. Chapters, warm pages, design, ambient sound, and Listen.`}),
    (0,A.jsx)(`span`,{className:`card-link`,children:`Open your books`})
  ]});
}
function mpYourBooksPage(){
  let storage=typeof localStorage<`u`?localStorage:null;
  let[library,setLibrary]=(0,_.useState)([]);
  let[book,setBook]=(0,_.useState)(null);
  let[status,setStatus]=(0,_.useState)(``);
  let[rail,setRail]=(0,_.useState)(false);
  let[sheet,setSheet]=(0,_.useState)(``);
  let[query,setQuery]=(0,_.useState)(``);
  let[design,setDesign]=(0,_.useState)(()=>mpBook.loadDesign(storage));
  let[ambient,setAmbient]=(0,_.useState)(()=>mpBook.loadAmbientPrefs(storage));
  let[note,setNote]=(0,_.useState)(``);
  let[bookmark,setBookmark]=(0,_.useState)(null);
  let fileRef=(0,_.useRef)(null);
  let startRef=(0,_.useRef)(null);
  let bookRef=(0,_.useRef)(null);
  let indexRef=(0,_.useRef)(0);
  bookRef.current=book;
  indexRef.current=book?book.chunkIndex:0;
  function remember(next){
    if(!next)return;
    mpBook.rememberOpen(storage,next.id,next.name,next.chunkIndex);
  }
  function go(index){
    setBook(current=>{
      if(!current)return current;
      let chunkIndex=mpBook.clampChunkIndex(index,current.chunks.length);
      let next={...current,chunkIndex};
      remember(next);
      return next;
    });
  }
  function openBuilt(built,chunkIndex){
    let next={...built,chunkIndex:mpBook.clampChunkIndex(chunkIndex,built.chunks.length)};
    setBook(next);
    remember(next);
    setNote(mpBook.noteFor(storage,next.id,next.name));
    setBookmark(mpBook.readBookmark(storage,next.id));
    setRail(false);
    setSheet(``);
    setQuery(``);
    setStatus(``);
  }
  function openSample(){
    let built=mpBook.sampleBookFromPacks(typeof mpPackA<`u`?mpPackA:null,typeof mpPackB<`u`?mpPackB:null);
    openBuilt(built,mpBook.positionFor(storage,built.id));
  }
  async function openStored(meta){
    setStatus(`Opening ${meta.name}…`);
    try{
      let row=await mpBook.getBook(meta.id);
      if(!row||!row.buffer)throw new Error(`That book is no longer on this device.`);
      let pdfjs=await mpBook.loadPdfjs();
      let pdf=await pdfjs.getDocument({data:row.buffer.slice(0)}).promise;
      let built=await mpBook.bookFromPdf(pdf);
      openBuilt({id:meta.id,name:meta.name,kind:`pdf`,detectMethod:built.detectMethod,chapters:built.chapters,chunks:built.chunks,pageCount:built.pageCount,readingCount:built.chapters.length},mpBook.positionFor(storage,meta.id));
    }catch(err){
      setStatus(err&&err.message?err.message:`Could not open that book.`);
    }
  }
  async function onFile(ev){
    let file=ev.target.files&&ev.target.files[0];
    ev.target.value=``;
    if(!file)return;
    setStatus(`Reading ${file.name}…`);
    try{
      let buf=await file.arrayBuffer();
      let id=mpBook.bookIdForName(file.name);
      await mpBook.putBook({id,name:file.name,buffer:buf.slice(0),savedAt:Date.now(),kind:`pdf`});
      setLibrary(await mpBook.listBooks());
      let pdfjs=await mpBook.loadPdfjs();
      let pdf=await pdfjs.getDocument({data:buf}).promise;
      let built=await mpBook.bookFromPdf(pdf);
      openBuilt({id,name:file.name,kind:`pdf`,detectMethod:built.detectMethod,chapters:built.chapters,chunks:built.chunks,pageCount:built.pageCount,readingCount:built.chapters.length},mpBook.positionFor(storage,id));
    }catch(err){
      setStatus(err&&err.message?`Could not open that PDF. ${err.message}`:`Could not open that PDF.`);
    }
  }
  async function removeBook(meta){
    await mpBook.deleteBook(meta.id);
    if(bookRef.current&&bookRef.current.id===meta.id){
      setBook(null);
      mpBook.clearLastOpen(storage);
    }
    setLibrary(await mpBook.listBooks());
  }
  function backToShelf(){
    mpBook.clearLastOpen(storage);
    setBook(null);
    setSheet(``);
    setRail(false);
  }
  function toggleSheet(name){
    setSheet(current=>current===name?``:name);
  }
  function pickTheme(id){
    let next=mpBook.designWithTheme(design,id);
    setDesign(next);
    mpBook.saveDesign(next,storage);
  }
  function patchDesign(partial){
    let next=mpBook.normalizeDesign({...design,...partial});
    setDesign(next);
    mpBook.saveDesign(next,storage);
  }
  function pickAmbient(mode){
    let next=mpBook.setAmbientMode(mode,storage);
    setAmbient(next);
  }
  function pickVolume(value){
    let next=mpBook.setAmbientVolume(value,storage);
    setAmbient(next);
  }
  (0,_.useEffect)(()=>{
    let live=true;
    mpBook.listBooks().then(rows=>{
      if(!live)return;
      let list=rows||[];
      setLibrary(list);
      let last=mpBook.lastOpenId(storage);
      if(!last)return;
      if(last===mpBook.SAMPLE_BOOK_ID){openSample();return;}
      let row=list.find(item=>item.id===last);
      if(row)openStored(row);
    }).catch(()=>{if(live)setLibrary([]);});
    return()=>{
      live=false;
      try{mpBook.stopAmbientAudio(false);}catch{}
    };
  },[]);
  (0,_.useEffect)(()=>{
    if(!book)return;
    let id=setInterval(()=>{
      let pressed=document.querySelector(`.mp-private-book [data-listen-player] [aria-pressed="true"]`);
      mpBook.setAmbientDuck(!!pressed);
    },300);
    return()=>clearInterval(id);
  },[book&&book.id,book&&book.chunkIndex]);
  let sampleCount=mpBook.sampleReadingCount(typeof mpPackA<`u`?mpPackA:null,typeof mpPackB<`u`?mpPackB:null);
  if(!book){
    return(0,A.jsxs)(`section`,{className:`mp-lane mp-private-book`,"aria-label":`Your books`,children:[
      (0,A.jsx)(`p`,{className:`eyebrow`,children:`BOOK`}),
      (0,A.jsx)(`h1`,{children:`Your books`}),
      (0,A.jsx)(`p`,{className:`lede`,children:`Upload a private PDF from this phone or computer. It stays on the device — nothing is sent to a server — and it is still here after a refresh.`}),
      (0,A.jsxs)(`div`,{className:`button-row`,children:[
        (0,A.jsx)(`button`,{type:`button`,className:`primary`,onClick:()=>fileRef.current&&fileRef.current.click(),children:`Choose a PDF`}),
        (0,A.jsx)(`input`,{ref:fileRef,id:`mp-book-file`,className:`mp-book-file`,type:`file`,accept:`application/pdf,.pdf`,onChange:onFile}),
        (0,A.jsx)(`button`,{type:`button`,className:`secondary`,onClick:openSample,children:`Open the sample readings`})
      ]}),
      status?(0,A.jsx)(`p`,{role:`status`,"aria-live":`polite`,children:status}):null,
      (0,A.jsxs)(`article`,{className:`simple-panel mp-book-shelf-card`,children:[
        (0,A.jsx)(`p`,{className:`eyebrow`,children:`BUILT IN`}),
        (0,A.jsx)(`h2`,{children:`MindPal readings`}),
        (0,A.jsx)(`p`,{children:`${sampleCount} short readings from Pack A and Pack B, opened as a sample book. Original MindPal wording.`}),
        (0,A.jsx)(`button`,{type:`button`,className:`secondary`,onClick:openSample,children:`Open the sample readings`})
      ]}),
      library.length?(0,A.jsxs)(`section`,{"aria-label":`Saved on this device`,children:[
        (0,A.jsx)(`h2`,{children:`Saved on this device`}),
        (0,A.jsx)(`ul`,{className:`mp-book-library`,children:library.map(row=>(0,A.jsxs)(`li`,{children:[
          (0,A.jsxs)(`button`,{type:`button`,className:`mp-book-open`,onClick:()=>openStored(row),children:[
            (0,A.jsx)(`strong`,{children:row.name}),
            (0,A.jsx)(`span`,{children:`Open`})
          ]}),
          (0,A.jsx)(`button`,{type:`button`,className:`text-button`,onClick:()=>removeBook(row),children:`Remove`})
        ]},row.id))})
      ]}):null,
      (0,A.jsx)(`p`,{className:`muted mp-book-privacy`,children:`Private uploads only. PDF bytes stay in IndexedDB on this device. Design, place, notes and ambient choice stay in local storage. Listen uses the shared MindPal player. Ambient beds are generated here — not recorded music.`})
    ]});
  }
  let index=book.chunkIndex||0;
  let chunk=book.chunks[index]||book.chunks[0];
  let total=book.chunks.length;
  let pct=mpBook.chapterProgressPct(book.chunks,index);
  let chapters=mpBook.filterChapters(book.chapters,query);
  let vars=mpBook.designCssVars(design);
  let themeList=Object.keys(mpBook.DESIGN_THEMES).map(id=>mpBook.DESIGN_THEMES[id]);
  function onPointerDown(ev){
    if(ev.target.closest(`button,a,input,textarea,label`))return;
    let rect=ev.currentTarget.getBoundingClientRect();
    startRef.current={x:ev.clientX,y:ev.clientY,w:rect.width};
  }
  function onPointerUp(ev){
    let start=startRef.current;
    startRef.current=null;
    if(!start||!bookRef.current)return;
    let rect=ev.currentTarget.getBoundingClientRect();
    let delta=mpBook.pageTurnDelta({dx:ev.clientX-start.x,dy:ev.clientY-start.y,width:start.w,x:ev.clientX-rect.left});
    if(delta)go(indexRef.current+delta);
  }
  function jump(chapter){
    go(mpBook.chunkIndexForChapter(book.chunks,chapter));
    if(typeof window<`u`&&window.innerWidth<800)setRail(false);
  }
  return(0,A.jsxs)(`section`,{className:`mp-lane mp-private-book is-reading`,style:vars,"aria-label":book.name,onPointerDown:()=>mpBook.resumeAmbientIfNeeded(),children:[
    (0,A.jsxs)(`header`,{className:`mp-book-top`,children:[
      (0,A.jsx)(`button`,{type:`button`,className:`text-button`,onClick:backToShelf,children:`‹ Your books`}),
      (0,A.jsxs)(`div`,{className:`mp-book-title-block`,children:[
        (0,A.jsx)(`h1`,{children:chunk?chunk.chapterTitle:book.name}),
        (0,A.jsx)(`p`,{className:`mp-book-progress`,children:`${pct}% in chapter · ${index+1} / ${total}`})
      ]}),
      (0,A.jsx)(`button`,{type:`button`,className:`text-button${bookmark===index?` is-on`:``}`,onClick:()=>{
        let next=bookmark===index?null:index;
        mpBook.writeBookmark(storage,book.id,next);
        setBookmark(next);
      },children:bookmark===index?`Bookmarked`:`Bookmark`})
    ]}),
    bookmark!=null&&bookmark!==index?(0,A.jsx)(`button`,{type:`button`,className:`text-button mp-book-goto`,onClick:()=>go(bookmark),children:`Go to bookmark`}):null,
    (0,A.jsx)(`input`,{type:`range`,className:`mp-book-scrub`,min:0,max:Math.max(0,total-1),value:index,"aria-label":`Reading position`,onChange:ev=>go(Number(ev.target.value))}),
    (0,A.jsxs)(`div`,{className:`mp-book-shell${rail?` rail-open`:``}`,children:[
      (0,A.jsxs)(`aside`,{className:`mp-book-rail`,"aria-label":`Chapters`,hidden:!rail,children:[
        (0,A.jsx)(`input`,{type:`search`,className:`mp-book-chapter-search`,"aria-label":`Search chapters`,placeholder:`Search chapters`,value:query,onChange:ev=>setQuery(ev.target.value)}),
        (0,A.jsx)(`ul`,{children:chapters.map(chapter=>{
          let on=chunk&&chunk.chapterTitle===chapter.title&&chunk.chapterPage===chapter.pageIndex;
          return(0,A.jsx)(`li`,{children:(0,A.jsx)(`button`,{type:`button`,className:`${chapter.depth?`sub `:``}${on?`active`:``}`,onClick:()=>jump(chapter),children:chapter.title})},`${chapter.title}@${chapter.pageIndex}`);
        })})
      ]}),
      (0,A.jsxs)(`div`,{className:`mp-book-page`,onPointerDown:onPointerDown,onPointerUp:onPointerUp,onPointerCancel:()=>{startRef.current=null},children:[
        (0,A.jsx)(`button`,{type:`button`,className:`mp-book-turn prev`,"aria-label":`Previous page`,disabled:index<=0,onClick:()=>go(index-1),children:`‹`}),
        (0,A.jsx)(`button`,{type:`button`,className:`mp-book-turn next`,"aria-label":`Next page`,disabled:index>=total-1,onClick:()=>go(index+1),children:`›`}),
        (0,A.jsx)(`p`,{className:`mp-book-chapter`,children:chunk?chunk.chapterTitle:``}),
        (0,A.jsx)(`div`,{className:`mp-book-prose`,children:chunk?chunk.text:``})
      ]})
    ]}),
    (0,A.jsx)(`p`,{className:`muted mp-book-hint`,children:`Tap the sides or swipe to turn. ${book.pageCount||total} pages · chapters via ${String(book.detectMethod||`headings`).replace(/-/g,` `)}.`}),
    sheet===`design`?(0,A.jsxs)(`section`,{className:`mp-book-sheet`,id:`mp-book-design`,"aria-label":`Design`,children:[
      (0,A.jsx)(`h2`,{children:`Design`}),
      (0,A.jsx)(`p`,{className:`mp-book-group-label`,children:`Font`}),
      (0,A.jsx)(`div`,{className:`mp-book-picks`,children:mpBook.BOOK_FONTS.map(font=>(0,A.jsx)(`button`,{type:`button`,className:design.font===font.id?`active`:` `,onClick:()=>patchDesign({font:font.id}),children:font.label},font.id))}),
      (0,A.jsx)(`p`,{className:`mp-book-group-label`,children:`Text size`}),
      (0,A.jsx)(`div`,{className:`mp-book-picks`,children:mpBook.TEXT_SIZES.map(size=>(0,A.jsx)(`button`,{type:`button`,className:design.textSize===size.id?`active`:` `,"aria-pressed":design.textSize===size.id,onClick:()=>patchDesign({textSize:size.id}),children:size.label},size.id))}),
      (0,A.jsx)(`p`,{className:`mp-book-group-label`,children:`Themes`}),
      (0,A.jsx)(`div`,{className:`mp-book-picks mp-book-themes`,children:themeList.map(theme=>(0,A.jsxs)(`button`,{type:`button`,className:design.theme===theme.id?`active`:` `,"aria-pressed":design.theme===theme.id,onClick:()=>pickTheme(theme.id),children:[
        (0,A.jsx)(`span`,{className:`mp-book-swatch`,style:{background:theme.bg}}),
        theme.label
      ]},theme.id))}),
      (0,A.jsx)(`p`,{className:`mp-book-group-label`,children:`Colours`}),
      (0,A.jsxs)(`div`,{className:`mp-book-colors`,children:[
        (0,A.jsxs)(`label`,{children:[`Text`,(0,A.jsx)(`input`,{type:`color`,"aria-label":`Text colour`,value:design.textColor,onChange:ev=>patchDesign({textColor:ev.target.value})})]}),
        (0,A.jsxs)(`label`,{children:[`Background`,(0,A.jsx)(`input`,{type:`color`,"aria-label":`Page colour`,value:design.bgColor,onChange:ev=>patchDesign({bgColor:ev.target.value})})]})
      ]})
    ]}):null,
    sheet===`ambient`?(0,A.jsxs)(`section`,{className:`mp-book-sheet`,id:`mp-book-ambient`,"aria-label":`Ambient`,children:[
      (0,A.jsx)(`h2`,{children:`Ambient`}),
      (0,A.jsx)(`p`,{className:`mp-book-group-label`,children:`Background`}),
      (0,A.jsx)(`div`,{className:`mp-book-picks`,children:mpBook.AMBIENT_MODES.map(mode=>(0,A.jsx)(`button`,{type:`button`,className:ambient.mode===mode.id?`active`:` `,"aria-pressed":ambient.mode===mode.id,onClick:()=>pickAmbient(mode.id),children:mode.label},mode.id))}),
      (0,A.jsx)(`p`,{className:`mp-book-group-label`,children:`Volume`}),
      (0,A.jsxs)(`div`,{className:`mp-book-volume`,children:[
        (0,A.jsx)(`input`,{type:`range`,min:0,max:100,value:ambient.volume,"aria-label":`Ambient volume`,onChange:ev=>pickVolume(ev.target.value)}),
        (0,A.jsx)(`span`,{children:String(ambient.volume)})
      ]}),
      (0,A.jsx)(`p`,{className:`muted`,children:`Supportive wellness soundscape — generated on this device, not a medical device or clinical treatment. It keeps playing while you read and while Listen is speaking.`})
    ]}):null,
    sheet===`notes`?(0,A.jsxs)(`section`,{className:`mp-book-sheet`,"aria-label":`Notes`,children:[
      (0,A.jsx)(`h2`,{children:`Notes`}),
      (0,A.jsx)(`textarea`,{className:`mp-book-notes`,"aria-label":`Private notes for this book`,value:note,placeholder:`Private notes for this book (saved on this device)…`,onChange:ev=>{
        setNote(ev.target.value);
        mpBook.writeNote(storage,book.id,book.name,ev.target.value);
      }})
    ]}):null,
    (0,A.jsxs)(`div`,{className:`mp-book-audio`,children:[
      (0,A.jsx)(mpListenPlayer,{id:`${book.id}#${index}`,text:chunk?chunk.text:``,label:`Book`}),
      (0,A.jsxs)(`div`,{className:`mp-book-ambient-row`,"aria-label":`Ambient bed`,children:[
        (0,A.jsx)(`span`,{className:`mp-book-group-label`,children:`Ambient`}),
        mpBook.AMBIENT_MODES.map(mode=>(0,A.jsx)(`button`,{type:`button`,className:ambient.mode===mode.id?`active`:` `,"aria-pressed":ambient.mode===mode.id,onClick:()=>pickAmbient(mode.id),children:mode.label},mode.id)),
        (0,A.jsx)(`input`,{type:`range`,min:0,max:100,value:ambient.volume,"aria-label":`Ambient volume`,onChange:ev=>pickVolume(ev.target.value)})
      ]})
    ]}),
    (0,A.jsxs)(`nav`,{className:`mp-book-tools`,"aria-label":`Reader tools`,children:[
      (0,A.jsx)(`button`,{type:`button`,className:rail?`active`:` `,"aria-pressed":rail,onClick:()=>setRail(open=>!open),children:`Chapters`}),
      (0,A.jsx)(`button`,{type:`button`,className:sheet===`design`?`active`:` `,"aria-pressed":sheet===`design`,onClick:()=>toggleSheet(`design`),children:`Design`}),
      (0,A.jsx)(`button`,{type:`button`,className:sheet===`ambient`||ambient.mode!==`off`?`active`:` `,"aria-pressed":sheet===`ambient`,onClick:()=>toggleSheet(`ambient`),children:`Ambient`}),
      (0,A.jsx)(`button`,{type:`button`,className:sheet===`notes`?`active`:` `,"aria-pressed":sheet===`notes`,onClick:()=>toggleSheet(`notes`),children:`Notes`})
    ]})
  ]});
}
