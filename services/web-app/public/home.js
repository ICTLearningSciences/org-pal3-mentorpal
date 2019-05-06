
//run everytime the window is resized to keep it responsive
const resizeFix = () => {
	//check if we're on mobile

	if (screen.width < 768) {
		document.getElementById("mainSize").className = "container-fluid";
		document.getElementById("navSize").style.display = "none"
	}
	//if desktop render this
	else {
		document.getElementById("mainSize").className = "container";
	}
}

function saveUserID(URL) {
  username = document.getElementById("input-username").value;
  if(username) {
    window.location.href = URL;
    localStorage.setItem("username",username);
	}
	else {
    if (confirm("You forgot to create a Username, are you sure you want to continue?")){
      localStorage.setItem("username","No Username");
      window.location.href = URL;
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

$('#video0').on('ended',function() {
	document.getElementById("video0").currentTime = 0.1;
	$('#carousel').carousel("next");
})
$('#video1').on('ended',function() {
	$('#carousel').carousel("next");
})
$('#video2').on('ended',function() {
	$('#carousel').carousel("next");
})
$('#video3').on('ended',function() {
	$('#carousel').carousel("next");
})

resizeFix()