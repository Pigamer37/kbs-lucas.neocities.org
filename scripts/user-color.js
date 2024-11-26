const colorPicks=document.getElementsByClassName("color-pickerr");
const resBut=document.getElementById("res");
const r=document.querySelector(':root');
const t_c=document.querySelector('meta[name="theme-color"]');
const def_col="#ff9933";

function hexColorDiff(c1, c2){
  let hexStr=(parseInt(c1.slice(1), 16)-parseInt(c2.slice(1), 16)).toString(16);
  while(hexStr.length < 6){hexStr='0'+hexStr;}return "#"+hexStr;
}
function hexColorSum(c1, c2){
  let hexStr=(parseInt(c1.slice(1), 16)+parseInt(c2.slice(1), 16)).toString(16);
  while(hexStr.length < 6){hexStr='0'+hexStr;}return "#"+hexStr;
}
function handlePickedEvent(event){handlePickedColor(event.target.value);}
function handlePickedColor(acolor){
  if((acolor===null)||(acolor===undefined)){return;}
  r.style.setProperty('--accent-orange',acolor);
  r.style.setProperty('--visited-orange',hexColorDiff(acolor,'004033'));
  r.style.setProperty('--dark-grad-orage',hexColorDiff(acolor,'001A33'));
  r.style.setProperty('--light-grad-orage',hexColorDiff(acolor,'01EDDB'));
  r.style.setProperty('--hover-button-orange:#ffb870',hexColorSum(acolor,'001F3D'));
  t_c?.setAttribute("content",acolor);
}
if(resBut){
resBut.addEventListener("click", (event)=>{
  colorPicks[0].value=def_col;
  handlePickedColor(def_col);
  localStorage.removeItem('acc-color');
});
}
if(typeof window.localStorage!='undefined'){let a_color=localStorage.getItem('acc-color');handlePickedColor(a_color);if(colorPicks.length>0){a_color!==null?colorPicks[0].value=a_color:colorPicks[0].value=def_col;}}
if(colorPicks.length>0){
for(const colP of colorPicks){colP.addEventListener("input", handlePickedEvent);
if(typeof window.localStorage!='undefined'){colP.addEventListener("change", (event)=>{
  handlePickedEvent(event);
  localStorage.setItem('acc-color', event.target.value);
});}else{colP.addEventListener("change", handlePickedEvent);}colP.select();}
}