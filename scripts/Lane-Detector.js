/*let timeout = false,
    delay = 250;*/
/*window.addEventListener('resize', function() {
  clearTimeout(timeout);
  timeout = setTimeout(resizeVideo, delay);
});*/
function bindVidFile(reshand){
  let inElement=document.getElementById('fileInput');
  inElement.addEventListener('change', (e) => {
    const file=e.target.files[0];
    if(file.type.startsWith("video/")){
    if("srcObject" in reshand.vid){
      try{reshand.vid.srcObject=file; console.log("used srcObject");
      }catch(err){
        if(err.name!=="TypeError"){throw err;}
        const size=file.size ? file.size : 'NOT SUPPORTED';
        //reshand.vid.src=file;console.log("used src raw path, size: "+size);
        reshand.vid.src=URL.createObjectURL(file);console.log("used src objectURL, size: "+size);
      }
    }else{reshand.vid.src=URL.createObjectURL(file);console.log("used src objectURL");}
    reshand.vidBinded();
    if(reshand?.vid===undefined){console.log("this.vid is undefined");}
    let capt=reshand.vid.parentNode.getElementsByTagName("figcaption")[0];
    capt.textContent="Using video file";console.log("Using video file")
    capt.style.color="unset";
    reshand.setResolveVid();
    }else{alert("The selected file is not valid");}
    console.log("PuñetabindVidFile");
  }, false);
}

function hexToRgb(hex){let shorthandRegex= /^#?([a-f\d])([a-f\d])([a-f\d])$/i;hex=hex.replace(shorthandRegex, function(m, r, g, b){return r+r+g+g+b+b;});let result= /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);return result ? {r:parseInt(result[1], 16),g:parseInt(result[2], 16),b:parseInt(result[3], 16)}:null;}

function rgbTohsv(rgb){
  if(!(rgb instanceof cv.Scalar)){throw new Error("Arg is not a Scalar/color");}
  let hsvM=new cv.Mat();cv.cvtColor(new cv.Mat(2, 2, cv.CV_8UC3, rgb), hsvM, cv.COLOR_RGB2HSV,3);
  let px=hsvM.ucharPtr(0, 0);
  return px ? {h:px[0],s:px[1],v:px[2]}:null;
}

const FPS=30;
const prog_bar=document.getElementsByTagName('progress')[0];

function updateProgBar(val=0, vidEl=undefined, outEl=undefined){
  if((val===null)||(val===undefined)){
    prog_bar.removeAttribute('aria-valuetext');
    prog_bar.removeAttribute('value');
    return;
  }
  prog_bar.value=val;
  prog_bar.setAttribute('aria-valuetext', prog_bar.value+"%");
  prog_bar.textContent=prog_bar.value+"%";
  
  if((vidEl!==undefined)&&(outEl!==undefined)){
    vidEl.setAttribute('aria-busy', val<100);
    outEl.setAttribute('aria-busy', val<100);
  }
  
  if(prog_bar.value===100){
    const progLabel=prog_bar.parentNode;
    for(const ch of progLabel.childNodes){
      if(ch.tagName==="SPAN"){ch.innerHTML="Completed Loading&nbsp;"; break;}
    }
    setTimeout(function(){progLabel.parentNode.removeChild(progLabel);}, 5000);
  }
}
function errorProgBar(vidEl, outEl){
  const progLabel=prog_bar.parentNode;
  progLabel.parentNode.removeChild(progLabel);
  vidEl.setAttribute('aria-busy', false);
  outEl.setAttribute('aria-busy', false);
}

updateProgBar(0);

class ResourceHandler{
  vid;
  pauseVid(boolVal){boolVal?this.vid.play():this.vid.pause();}
  out;
  capture;
  static readyCV;
  openCVready(){
    ResourceHandler.readyCV=true;
    this.out.parentNode.getElementsByTagName("figcaption")[0].textContent="Loaded OpenCV, waiting for video...";
    updateProgBar(prog_bar.value+40, this.vid, this.out);
  }
  #resolveVid=false;
  setResolveVid(){this.#resolveVid=true;}
  #gotVid=false;
  vidBinded(){
    this.#gotVid=true;
    updateProgBar(prog_bar.value+25);
    this.vid.parentNode.getElementsByTagName("figcaption")[0].textContent="Camera Input";
    let resoH= (event) => {
      console.log("The size of the video element has changed!");
      this.resizeVideo();
      if(this.#gotVid){
        this.vid.removeEventListener('resize', resoH);
        updateProgBar(prog_bar.value+25, this.vid, this.out);
        console.trace("PuñetaTrace");
        console.log("PuñetaTimeoutBefore");
        setTimeout(this.waitCV.bind(this), 0);
        console.log("PuñetaTimeout");
      }
    };
    this.vid.addEventListener("resize", resoH);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata=new MediaMetadata({
        title:'Edge detection video',
    		artist:'User'
      });
      const actionHandlers=[
        ['play', () => {document.querySelector('video').pause();playing=false;document.getElementById("startStop").textContent="Start";}],
        ['pause', () => {document.querySelector('video').play();playing=false;document.getElementById("startStop").textContent="Stop";}],
      ];
      //not working, don't know why
      for (const [action, handler] of actionHandlers) {
        try {navigator.mediaSession.setActionHandler(action, handler);console.log(`Added media session action "${action}"`)}catch (error){console.log(`The media session action "${action}" is not supported yet.`)}
      }
      function updateMediaSes(){const video=document.querySelector('video');navigator.mediaSession.setPositionState({duration:video.duration,playbackRate:video.playbackRate,position:video.currentTime})}
      const evs=["durationchange","ratechange","timechange"];
      for (const ev of evs){this.vid.addEventListener(ev,updateMediaSes)}
      this.vid.addEventListener('play', ()=>{navigator.mediaSession.playbackState='playing'});
      this.vid.addEventListener('pause', ()=>{navigator.mediaSession.playbackState='paused'});
    }
  }
  frame; frameCpy; morphOut; imgHSV; imgCanny;
  closeKern;
  maskVerts;
  laneL;
  show_borders=true;
  static filterValues=new Map([
    ["iLowH", document.getElementById("HLow")],["iHighH", document.getElementById("HHigh")],
    ["iLowS", document.getElementById("SLow")],["iHighS", document.getElementById("SHigh")],
    ["iLowV", document.getElementById("VLow")],["iHighV", document.getElementById("VHigh")]
  ]);
  constructor(videoTagName, outputTagName){
    if(typeof videoTagName!=="string"){throw new Error('Invalid video input element id');}
    if(typeof outputTagName!=="string"){throw new Error('Invalid output canvas element id');}
    this.out=document.getElementById(outputTagName);
    this.vid=document.getElementById(videoTagName);
    this.vid.setAttribute('aria-busy', true);
    this.out.setAttribute('aria-busy', true);
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}, audio:false})
      .then( (stream)=>{
        this.vid.srcObject=stream;
        this.vidBinded();//this.#gotVid=true;
        //this.vid.play();
      })
      .catch( (err)=>{
        if(this?.vid!==void 0){
          let capt=this.vid.parentNode.getElementsByTagName("figcaption")[0];
          if(err.name==="NotAllowedError"){capt.textContent="Could not get camera permissions"; alert("Please grant this tab camera permissions if you want to use it for processing");}
          else{capt.textContent="Error getting camera"; alert("An unknown error occurred when getting the camera feed");errorProgBar(this.vid, this.out);throw(err);}
          capt.style.color="red";
        }
        console.log("An error occurred on camera! "+err);
      })
      .finally( () => this.#resolveVid=true);
  }
  waitCV(){
    console.log("PuñetaCV");
    if(!ResourceHandler.readyCV){setTimeout(this.waitCV.bind(this), 1000);}
    else{
      this.initialize();
      this.out.parentNode.getElementsByTagName("figcaption")[0].textContent="Output";
      updateProgBar(prog_bar.value+10, this.vid, this.out);
      setTimeout(this.processVideo.bind(this), 0);
    }
  }
  resizeVideo(){
    if((this.vid===void 0)||(!this.#gotVid)){throw new Error('Trying to resize a non existent video');}
    if(this.vid.videoWidth===0){throw new Error('Trying to resize a non existent video');}
    else{
      console.log("Got Dimensions");
      this.vid.width=window.innerWidth*0.45;
      console.log(`this.vid.videoX dimesions: w=${this.vid.videoWidth}, h=${this.vid.videoHeight}`);
      this.vid.height=this.vid.width*(this.vid.videoHeight/this.vid.videoWidth);
      console.log(`this.vid dimesions: w=${this.vid.width}, h=${this.vid.height}`);
      this.out.width=this.vid.width;this.out.height=this.vid.height;
    }
  }
  initialize(kernSize=5){
    if(!ResourceHandler.readyCV){
      console.log("OpenCV is not ready yet");
      return;
    }
    else if(!this.#gotVid){
      console.log("Input is not ready yet");
      return;
    }
    if(kernSize===void 0){kernSize=5;}
    this.capture=new cv.VideoCapture(this.vid);
    this.frame=new cv.Mat(this.vid.height, this.vid.width, cv.CV_8UC4);
    this.frameCpy=new cv.Mat(this.vid.height, this.vid.width, cv.CV_8UC3);
    this.imgHSV=new cv.Mat(this.vid.height, this.vid.width, cv.CV_8UC3);
    this.imgThresh=new cv.Mat();
    this.morphOut=new cv.Mat();
    this.imgCanny=new cv.Mat();
  	this.closeKern=cv.Mat.ones(kernSize,kernSize,cv.CV_8U);
  	this.laneL=new LaneLogic();
  	this.laneL.setInitPoint(Math.trunc(this.vid.width/2));
  	this.maskVerts=[new cv.Point(0, this.vid.height), new cv.Point(Math.trunc(this.vid.width/9), Math.trunc(this.vid.height/3)),
  	  new cv.Point(Math.trunc(this.vid.width/9*8), Math.trunc(this.vid.height/3)), new cv.Point(this.vid.width, this.vid.height)
  	];
  	this.out.addEventListener("click", () =>{
  	  this.show_borders=!this.show_borders;
  	  this.show_borders?console.log("Activated algorithm"):console.log("Deactivated algorithm");
  	});
  }
  processVideo() {
    if((!ResourceHandler.readyCV)||(!this.#gotVid)){throw new Error('OpenCV or vid not initialized!');}
    let begin = Date.now();
    this.capture.read(this.frame);
    cv.cvtColor(this.frame, this.frameCpy, cv.COLOR_RGBA2RGB);
    //this.frameCpy = this.frame.clone();
    if(this.show_borders){
      cv.cvtColor(this.frameCpy, this.imgHSV, cv.COLOR_RGB2HSV);
      //TODO:rotation
      //Making the Mat inside inRange caused lag for some reason so we delete each time
      let low = new cv.Mat(this.imgHSV.rows, this.imgHSV.cols, this.imgHSV.type(), [parseFloat(ResourceHandler.filterValues.get("iLowH").value), parseFloat(ResourceHandler.filterValues.get("iLowS").value), parseFloat(ResourceHandler.filterValues.get("iLowV").value), 0]);
      let high = new cv.Mat(this.imgHSV.rows, this.imgHSV.cols, this.imgHSV.type(), [parseFloat(ResourceHandler.filterValues.get("iHighH").value), parseFloat(ResourceHandler.filterValues.get("iHighS").value), parseFloat(ResourceHandler.filterValues.get("iHighV").value), 255]);
      cv.inRange(this.imgHSV, low, high, this.morphOut);
      low.delete(); high.delete();
      Apply_Draw_ROI(this.frameCpy, this.morphOut, this.maskVerts);
      cv.morphologyEx(this.morphOut, this.morphOut, cv.MORPH_CLOSE, this.closeKern);
      //cv.imshow(this.out, this.morphOut);
      Draw_Contour_Points(this.frameCpy, this.laneL.SmartGetHistLanePoints(this.morphOut, this.morphOut.rows, this.maskVerts[1].y, 20, true)); 
			Draw_Contour_Points(this.frameCpy, this.laneL.SmartGetHistLanePoints(this.morphOut, this.morphOut.rows, this.maskVerts[1].y, 20, false));
			Draw_Contour_Points(this.frameCpy, this.laneL.CalculateMidLane(), new cv.Scalar(150, 50, 0));
			this.laneL.CalculateMidLane();
    }
    cv.imshow(this.out, this.frameCpy);
    // schedule the next one.
    let delay=1000/FPS - (Date.now() - begin);
    setTimeout(this.processVideo.bind(this), delay);
    //console.log("Error: "+err);
  }
}
let resHandler=new ResourceHandler("videoInput","processedWebcam");

bindVidFile(resHandler);

let playing=false;
document.getElementById("startStop").addEventListener("click", function (event){
  playing=!playing;
  playing?this.textContent="Stop":this.textContent="Start";
  resHandler.pauseVid(playing);
});

const colorPickers=document.getElementsByClassName("color-picker");for(const colP of colorPickers){colP.addEventListener("input", (event)=>{
  let rgb=hexToRgb(event.target.value);
  let hsv=rgbTohsv(new cv.Scalar(rgb.r,rgb.g,rgb.b));
  ResourceHandler.filterValues.get("iLowH").value=hsv.h;ResourceHandler.filterValues.get("iLowS").value=hsv.s;ResourceHandler.filterValues.get("iLowV").value=hsv.v;
});colP.addEventListener("change", (event)=>{
  let rgb=hexToRgb(event.target.value);
  let hsv=rgbTohsv(new cv.Scalar(rgb.r,rgb.g,rgb.b));
  ResourceHandler.filterValues.get("iLowH").value=hsv.h;ResourceHandler.filterValues.get("iLowS").value=hsv.s;ResourceHandler.filterValues.get("iLowV").value=hsv.v;
});colP.select();}

function onOpenCvReady() {
  resHandler.openCVready();
}

function Draw_Contour_Points(inp, contour, color=new cv.Scalar(0, 255, 0)){
  if(!(inp instanceof cv.Mat)){throw new Error("First arg is not an image");}
  if(typeof contour[Symbol.iterator]!=='function'){throw new Error("Second arg is not iterable");}
  if(!(color instanceof cv.Scalar)){throw new Error("Third arg is not a Scalar/color");}
  for(const point of contour){
    if(point===new cv.Point(-1, -1)){continue;}
    cv.circle(inp, point, 10, color, -1);
  }
}
function Draw_Contour(inp, contour, color=new cv.Scalar(155, 0, 155), roi_x=0, roi_y=0){
	if(!(inp instanceof cv.Mat)){throw new Error("First arg is not an image");}
	if(typeof contour[Symbol.iterator]!=='function'){throw new Error("Second arg is not iterable");}
	if(!(color instanceof cv.Scalar)){throw new Error("Third arg is not a Scalar/color");}
	let shifted_cont=[...contour];
	shifted_cont[0].x=contour[0].x+roi_x;
	shifted_cont[0].y=contour[0].y+roi_y;
	for(let i=0; i<contour.length-1; i++){
		shifted_cont[i+1].x=contour[i+1].x+roi_x;
		shifted_cont[i+1].y=contour[i+1].y+roi_y;
		cv.line(inp, shifted_cont[i], shifted_cont[i+1], color, 5);
	}
}
function ApplyROI(img_input, maskVerts){
  if(!(img_input instanceof cv.Mat)){throw new Error("First arg is not an image");}
  if(typeof maskVerts[Symbol.iterator]!=='function'){throw new Error("Second arg is not iterable");}
	//holy fck fillPoly is difficult to use compared to C++
	let mask=new cv.Mat.zeros(img_input.rows, img_input.cols, cv.CV_8UC1);
	let npts=maskVerts.length;
	let maskPoints=new Uint16Array([
            maskVerts[0].x, maskVerts[0].y,
            maskVerts[1].x, maskVerts[1].y,
            maskVerts[2].x, maskVerts[2].y,
            maskVerts[3].x, maskVerts[3].y]);
  let maskVerts_Array=cv.matFromArray(npts, 1, cv.CV_32SC2, maskPoints);//maskVerts
  let pts=new cv.MatVector();
  pts.push_back(maskVerts_Array);
  let color=new cv.Scalar(255);
  cv.fillPoly(mask, pts, color);
  cv.bitwise_and(img_input, mask, img_input);
	mask.delete(); maskVerts_Array.delete(); pts.delete();
}
function Apply_Draw_ROI(img_draw, img_bin, maskVerts){
  if(!(img_draw instanceof cv.Mat)){throw new Error("First arg is not an image");}
  if(!(img_bin instanceof cv.Mat)){throw new Error("Second arg is not an image");}
  if(img_bin.channels()!==1){throw new Error("Second arg is not a binary image");}
  if(typeof maskVerts[Symbol.iterator]!=='function'){throw new Error("Third arg is not iterable");}
	Draw_Contour(img_draw, maskVerts, new cv.Scalar(155, 155, 0));
	ApplyROI(img_bin, maskVerts);
}

class LaneLogic{
  static GetHist(binImg, bottomY, topY, thresh){
    if(!(binImg instanceof cv.Mat)){throw new Error("First arg is not an image");}
    if(binImg.channels()!==1){throw new Error("First arg is not a binary image");}
    if(bottomY<topY){ //si nos lo dan al revés le damos la vuelta 
			let temp=bottomY;
			bottomY=topY;
			topY=temp;
		}
		const height=(bottomY-topY);
		const mask=new cv.Rect(0, topY, (binImg.cols), height);
		let subImg=binImg.roi(mask);
		let hist=[];
		let value=0;
		
		for(let j=0; j<(binImg.cols); j++){
			value=0;
			for(let i=0; i<height; i++){
				if((subImg.ucharPtr(i, j)[0]) != 0){value++;}//CHECK
			}
			if(value>=thresh){hist.push(value);}
			else hist.push(0);
		}
		subImg.delete();return hist;
  }
	static GetHistMaxVal(hist){//should check if iterable
	  let max=0;
		for(const val of hist){if(val>max){max=val;}}
		return max;
	}
	static GetLocalMaxes(hist){
	  let local_max=0;
	  let up=true;
	  let local_max_index_first=0;
	  let local_max_indexes=[];
	  
	  for(let i=0; i<hist.length; i++){
	    if(hist[i]>local_max){
				up=true;
				local_max=hist[i];
				local_max_index_first=i;
			}else if(hist[i]<local_max){
				if(up){
					up=false;
					local_max_indexes.push((i+local_max_index_first)/2); //si se mantiene un valor en varias columnas seguidas, calcula la media
				}
				local_max=hist[i];
			}
	  }
	  return local_max_indexes;
	}
	static GetHistLocalMaxes(binImg, bottomY, topY){
	  if(!(binImg instanceof cv.Mat)){throw new Error("First arg is not an image");}
    if(binImg.channels()!==1){throw new Error("First arg is not a binary image");}
    
	  let midY=(bottomY+topY)/2;
		let hist=LaneLogic.GetHist(binImg, bottomY, topY, 5);
		
		let local_max_indexes=LaneLogic.GetLocalMaxes(hist);
		let local_max_points=[];
		for(const local_max_index of local_max_indexes){
		  local_max_points.push(new cv.Point(local_max_index, midY));//CHECK
		}
		return local_max_points;
	}
	static GetDrawHistLocalMaxes(drawImg, binImg, bottomY, topY){
	  if(!(drawImg instanceof cv.Mat)){throw new Error("First arg is not an image");}
	  if(!(binImg instanceof cv.Mat)){throw new Error("Second arg is not an image");}
    if(binImg.channels()!==1){throw new Error("Second arg is not a binary image");}
    Draw_Contour_Points(drawImg, LaneLogic.GetHistLocalMaxes(binImg, bottomY, topY));
	}
	static GetDrawHistLocalMaxes_Periodically(drawImg, binImg, bottomY, topY, window_size){
	  if(!(drawImg instanceof cv.Mat)){throw new Error("Second arg is not an image");}
	  if(!(binImg instanceof cv.Mat)){throw new Error("Second arg is not an image");}
    if(binImg.channels()!==1){throw new Error("Second arg is not a binary image");}
	  if(bottomY<topY){
			let temp=bottomY;
			bottomY=topY;
			topY=temp;
		}
		
		const height=bottomY-topY;
		const n_of_windows=Math.trunc(height / window_size);//CHECK eq to (int)?
		let current_bottomY=bottomY;
		
		for(let i=0; i<n_of_windows; i++){
		  LaneLogic.GetDrawHistLocalMaxes(drawImg, binImg, current_bottomY, (current_bottomY-window_size));
		  current_bottomY-=window_size;
		}
	}
	static GetHistFirstLanePoints(binImg, bottomY, topY, laneX=0){
	  if(!(binImg instanceof cv.Mat)){throw new Error("Second arg is not an image");}
    if(binImg.channels()!==1){throw new Error("Second arg is not a binary image");}
    if(bottomY<topY){
			let temp=bottomY;
			bottomY=topY;
			topY=temp;
		}
		let searchPoint=(laneX<=0)?binImg.cols/2:laneX;
		
		let points=LaneLogic.GetHistLocalMaxes(binImg, bottomY, topY);
		let lanePoints=[];
		
		if(points.length===0){
			lanePoints.push(new cv.Point(-1,-1));
			lanePoints.push(new cv.Point(-1,-1));
			return lanePoints;
		}
		let leftLaneIdx=0, rightLaneIdx=0;
		let currentLeftMinDist= -searchPoint;
		let currentRightMinDist=searchPoint;
		for(let i=0; i<points.length; i++){
		  let pointDist=points[i].x-searchPoint;
		  
		  if(pointDist>0){
		    if(pointDist<currentRightMinDist){
					currentRightMinDist=pointDist;
					rightLaneIdx=i;
				}
		  }else{
		    if(pointDist>currentLeftMinDist){
		      currentLeftMinDist=pointDist;
		      leftLaneIdx=i;
		    }
		  }
		}
		if((leftLaneIdx===rightLaneIdx)&&(points.length>1)){rightLaneIdx++;}
		lanePoints.push(points[leftLaneIdx]);
		lanePoints.push(points[rightLaneIdx]);
		
		return lanePoints;
	}
	static GetHistNextLinePoint(binImg, bottomY, topY, prevPointX, thresh){
	  if(!(binImg instanceof cv.Mat)){throw new Error("Second arg is not an image");}
    if(binImg.channels()!==1){throw new Error("Second arg is not a binary image");}
	  if(bottomY<topY){
			let temp=bottomY;
			bottomY=topY;
			topY=temp;
		}
		let points=LaneLogic.GetHistLocalMaxes(binImg, bottomY, topY);
		let lanePoint;
		if(points.length===0){
			lanePoint=new cv.Point(-1,-1);
			return lanePoint;
		}
		
		let laneIdx=0;
		thresh=Math.abs(thresh);
		let currentMinDist=thresh;
		for(let i=0; i<points.length; i++){
		  let pointDist=Math.abs(points[i].x-prevPointX);
		  if(pointDist<currentMinDist){
				currentMinDist=pointDist;
				laneIdx=i;
			}
		}
		if(currentMinDist==thresh){ //no ha registrado una distancia menor
			lanePoint=new cv.Point(-1,-1);
			return lanePoint;
		}
		
		lanePoint=points[laneIdx];
		return lanePoint;
	}
	static GetHistLanePoints(binImg, bottomY, topY, window_size, leftLane, thresh=0, laneX=0){
	  if(!(binImg instanceof cv.Mat)){throw new Error("Second arg is not an image");}
    if(binImg.channels()!==1){throw new Error("Second arg is not a binary image");}
	  if(bottomY<topY){
			let temp=bottomY;
			bottomY=topY;
			topY=temp;
		}
		const height=bottomY-topY;
		let n_of_windows=Math.trunc(height/window_size);//CHECK
		
		let current_bottomY=bottomY-window_size;
		let laneSeeds=LaneLogic.GetHistFirstLanePoints(binImg, bottomY, current_bottomY, laneX);
		let seedPoint, nextPoint;
		let lane=[];
		if((laneSeeds[0]===cv.Point(-1, -1))||(laneSeeds===undefined)){
      lane.push(new cv.Point(-1,-1));
			return lane;
		}
		
		if(leftLane){seedPoint=laneSeeds[0];}
		else if(laneSeeds.length>=2){seedPoint=laneSeeds[1];}
		else {
			lane.push(new cv.Point(-1,-1));
			return lane;
		}
		if(seedPoint?.x===undefined){
		  console.log(`seedPoint was undefined, laneSeeds[0]: ${laneSeeds[0]}, laneSeeds[1]: ${laneSeeds[1]}`);
			lane.push(new cv.Point(-1,-1));
			return lane;
		}
		lane.push(seedPoint);
		
		if(thresh<=0) thresh=window_size*2;
		
		for(let i=1; i<n_of_windows; i++){
			nextPoint=LaneLogic.GetHistNextLinePoint(binImg, current_bottomY, (current_bottomY-window_size), seedPoint.x, thresh);
			if(nextPoint!==cv.Point(-1, -1)){ //point is valid, add and update
				lane.push(nextPoint);
				seedPoint=nextPoint;
			}
			else {
			  if(lane===undefined){lane.push(new cv.Point(-1,-1));}
			  return lane;
			} //discard and stop
			//if we didn't get a valid point, use seedpoint again
			current_bottomY-=window_size; //go to the next window
		}
		if(lane===undefined){lane.push(new cv.Point(-1,-1));}
		return lane;
	}
	static CalculateMidLane(leftLane, rightLane){
	  if(typeof leftLane[Symbol.iterator]!=='function'){throw new Error("First arg is not iterable");}
	  if(typeof rightLane[Symbol.iterator]!=='function'){throw new Error("Second arg is not iterable");}
	  let limit=(leftLane.length<=rightLane.length)?leftLane.length:rightLane.length;
		let midLane=[];
		let mid_x;
		for(let i=0; i<limit; i++){
			mid_x=Math.trunc((leftLane[i].x+rightLane[i].x)/2);
			midLane.push(new cv.Point(mid_x, leftLane[i].y));
		}
		return midLane;
	}
	#prevRightX;
	#prevLeftX;
	#prevMid;
	leftLane=[];
	rightLane=[];
	midLane=[];
	constructor(init_leftx=0, init_rightx=0){
	 this.#prevRightX=init_rightx; this.#prevLeftX=init_leftx;
	}
	setInitPoints(init_leftx, init_rightx){
	  this.#prevRightX=init_rightx; this.#prevLeftX=init_leftx;
	}
	setInitPoint(init_x){
		this.#prevMid=init_x;
		this.#prevRightX=init_x+100;
		this.#prevLeftX=init_x-100;
	}
	SmartGetHistLanePoints(binImg, bottomY, topY, window_size, leftLane, thresh=0){
	  if(!(binImg instanceof cv.Mat)){throw new Error("First arg is not an image");}
    if(binImg.channels()!==1){throw new Error("First arg is not a binary image");}
    if(leftLane){
      let res=LaneLogic.GetHistLanePoints(binImg, bottomY, topY, window_size, true, thresh, this.#prevMid);
      this.#prevLeftX=res[0].x;
      this.leftLane=res;
      return res;
    }else{
      let res=LaneLogic.GetHistLanePoints(binImg, bottomY, topY, window_size, false, thresh, this.#prevMid);
      this.#prevRightX=res[0].x;
      this.rightLane=res;
      return res;
    }
	}
	CalculateMidLane(){
		let res=LaneLogic.CalculateMidLane(this.leftLane, this.rightLane);
		this.#prevMid=res[0].x;
		this.midLane=res;
		return res;
	}
}