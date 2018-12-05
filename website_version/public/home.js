
//This way, content can be hosted elsewhere explicit
var isMobile="";
function resizeFix(){	//run everytime the window is resized to keep it responsive
	if (screen.width<700){	//check if we're on mobile
		toChoices();
		document.getElementById("mainSize").className = "container-fluid";
		document.getElementById("topic-box").className = "topic-box-mobile";
		renderButtons(globalResults);
		document.getElementById("button-row").style.display = 'none';
		document.getElementById("main-box").className = 'col';

		document.getElementById("videoWrapper").className = 'video-wrapper';
		document.getElementById("videoPlayer").width = screen.width;
		document.getElementById("videoPlayer").height = screen.height;

		document.getElementById("mic-send-row").className = 'col-2';
		document.getElementById("input-box").className = 'col-10';
		document.getElementById("question-Box").style = 'padding-right: 95px; height: 170px; font-size: 35px';
		document.getElementById("mic-button").style = 'height: 85px; width: 85px;  font-size: 30px';
		document.getElementById("stop-button").style = 'display: none; height: 85px; width: 85px;  font-size: 30px';
		document.getElementById("send-button").style = 'height: 170px; width: 140px;  font-size: 40px';
		document.getElementById("mentor-title").style = "display: none";
		isMobile = "_M";
		document.getElementById("videoPlayer").textTracks[0].mode = "showing";
	} else {	//if desktop render this
		document.getElementById("mainSize").className = "container";
		document.getElementById("topic-box").className = "topic-box";
		renderButtons(globalResults);
		document.getElementById("button-row").style.display = 'block';
		document.getElementById("main-box").style.fontSize = '20px';

		document.getElementById("videoWrapper").className = 'embed-responsive embed-responsive-16by9';
		document.getElementById("videoPlayer").className = 'col';
		document.getElementById("videoPlayer").width = 1920;
		document.getElementById("videoPlayer").height = 1080;
		document.getElementById("mic-send-row").className = 'col-1'
		document.getElementById("input-box").className = 'col-11';
		document.getElementById("question-Box").style = 'height: 120px; font-size: 20px';
		document.getElementById("mic-button").style = "display: block";
		document.getElementById("stop-button").style = "display: none";
		document.getElementById("send-button").style = "display: block; height: 120px";
		document.getElementById("videoPlayer").textTracks[0].mode = "hidden";
		document.getElementById("mentor-title").style = "bottom: 0; margin-bottom: 18px;	position: absolute; left: 50%; transform: translateX(-50%); font-size: 25px;";
		isMobile="";
	}
}

function saveUserID(URL) {
  username = document.getElementById("input-username").value;
  if(username) {
    window.location.href = URL;
    localStorage.setItem("username",username);
  } else {
    if(confirm("You forgot to create a Username, are you sure you want to continue?")){
      localStorage.setItem("username","No Username");
      window.location.href = URL;
    } else {

    }
  }
}

if (localStorage.getItem("username")!="No Username") {
  document.getElementById("input-username").value = localStorage.getItem("username");
}

function openNav() {
    document.getElementById("myNav").style.height = "100%";
}
window.onload = function() {
		openNav();
		sessionStorage.loaded = true;
}
function closeNav() {
    document.getElementById("myNav").style.height = "0%";
		document.getElementById("video0").play();
}
$('#carousel').on('slide.bs.carousel', function (data) {
		document.getElementById("video"+data.from).pause();
})
$('#carousel').on('slid.bs.carousel', function (data) {
	  document.getElementById("video"+data.to).play();
})
$('#video0').on('ended',function(){
	document.getElementById("video0").currentTime = 0.1;
	$('#carousel').carousel("next");
})
$('#video1').on('ended',function(){
	$('#carousel').carousel("next");
})
$('#video2').on('ended',function(){
	$('#carousel').carousel("next");
})
