function toggleWinFullScreen(clickedBtn){
  let window = clickedBtn.parentNode.parentNode.parentNode;
  if (!document.fullscreenElement){//make FS
    window.requestFullscreen({navigationUI: "show"}).catch((err) => {
      alert(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`, );
    });
    return;
  }else{document.exitFullscreen();}
}
function winHandleFullScreen(event){
  if(document.fullscreenElement){//goint FS
    let contents=document.fullscreenElement.getElementsByClassName("content");
    for(const cont of contents){
      if(cont.style.display==="none"){cont.style.display="block";}
    }
    let btnGroups=document.fullscreenElement.getElementsByClassName("title-bar")[0].getElementsByClassName("buttons");
    for(const btnGroup of btnGroups){
      for(const btn of btnGroup.children){
        if(btn.textContent==="⛶"){btn.textContent="❐";break;} 
      }
    }
    return;
  }else{//exiting FS
    let btnGroups=this.getElementsByClassName("title-bar")[0].getElementsByClassName("buttons");
    for(const btnGroup of btnGroups){
      for(const btn of btnGroup.children){
        if(btn.textContent==="❐"){btn.textContent="⛶";break;} 
      }
    }
  }
}

for (const a of document.querySelectorAll('button')) {
  switch(a.textContent){
    case "_"://minimize
      let window=a.parentNode.parentNode.parentNode;
      window.addEventListener("fullscreenchange", winHandleFullScreen);
      a.style.cursor="url(https://www.cursor.cc/cursor/533/209/cursor.png) 11 2, pointer";
      a.addEventListener("click", function (e){
        if(window===document.fullscreenElement){
          for (const btn of this.parentNode.children) {
            if(btn.textContent==="❐"){toggleWinFullScreen(btn);break;}
          }
        }
        for (const ch of window.children) {
          if(ch.classList.contains("content")){
            if(ch.style.display!=="none"){
              ch.style.display="none";
            }else{
              ch.style.display="block";
            }
          }
        }
      });
      a.tabIndex=0;
      a.setAttribute("aria-label", "Minimize section");
    break;
    case "⛶"||"❐"://fullscreen
      if (document.fullscreenEnabled){
        a.style.cursor="url(https://www.cursor.cc/cursor/533/209/cursor.png) 11 2, pointer";
        a.addEventListener("click", function (e){
          toggleWinFullScreen(this);
        });
        a.tabIndex=0;
        a.setAttribute("aria-label", "Fullscreen section");
      }
    break;
    case "✕"://close (display:none?)
      a.style.cursor="url(https://www.cursor.cc/cursor/533/209/cursor.png) 11 2, pointer";
      a.addEventListener("click", function (e){
        let window=this.parentNode.parentNode.parentNode;
        window.parentNode.removeChild(window);
      });
      a.tabIndex=0;
      a.setAttribute("aria-label", "Close or delete section");
    break;
  }
}