var globalResults;
var socket = io();
var video = document.getElementById("videoPlayer");

var mentorID = window.location.pathname.slice(1,window.location.pathname.length-1);
var mentorID = window.location.pathname.split("/")[1];
var mentor = {};
//Each mentor needs its own set of links
//This way, content can be hosted elsewhere explicit
if (mentorID == 'clint'){
	mentor = {
		name: "Clinton Anderson",
		videoURL: "https://pal3.ict.usc.edu/resources/mentor/clint/",
		idleURL: "https://pal3.ict.usc.edu/resources/mentor/clint/idle",
		topicsURL: "/clint/topics.csv",
		questions: "/clint/Questions_Paraphrases_Answers.csv",
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy.",
		introURL: "clintanderson_A1_1_1",
		title: "Clinton Anderson: Nuclear Electrician's Mate"
	};
} else if (mentorID == 'dan'){
	mentor = {
		name: "Dan Davis",
		videoURL: "https://pal3.ict.usc.edu/resources/mentor/dan/",
		idleURL: "https://pal3.ict.usc.edu/resources/mentor/dan/idle",
		topicsURL: "/dan/topics.csv",
		questions: "/dan/Questions_Paraphrases_Answers.csv",
		intro: "Hello I'm Dan Davis I've worked for universities to last thirty years doing basic research in high performance computing of work for Cal Tech, University of Southern California and the University of Hawaii",
		introURL: "dandavis_A1_1_1",
		title: "Dan Davis: High Performance Computing Researcher"
	};
} else if (mentorID == 'julianne') {	//if it's none of these default to clint.  You could redirect to a homepage too that's why this is here
	mentorID = 'julianne';
	mentor = {
		name: "Julianne Nordhagen",
		videoURL: "https://pal3.ict.usc.edu/resources/mentor/julianne/",
		idleURL: "https://pal3.ict.usc.edu/resources/mentor/clint/idle",
		topicsURL: "/julianne/topics.csv",
		questions: "/julianne/Questions_Paraphrases_Answers.csv",
		intro: "Hi my name's Julie in Oregon I'm %HESITATION in and sit in the United States Navy and I'm currently a student naval aviator so that means that I have commissioned into the navy and I am starting to learn how to fly planes and %HESITATION will then become a full trained pilot for the navy",
		introURL: "julianne_U1_1_1",
		title: "Julianne Nordhagen: Student Naval Aviator"
	};
} else {
	mentor = {
		name: "Clinton Anderson",
		videoURL: "https://pal3.ict.usc.edu/resources/mentor/clint/",
		idleURL: "https://pal3.ict.usc.edu/resources/mentor/clint/idle",
		topicsURL: "/clint/topics.csv",
		questions: "/clint/Questions_Paraphrases_Answers.csv",
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy.",
		introURL: "clintanderson_A1_1_1",
		title: "Clinton Anderson: Nuclear Electrician's Mate"
	};
}
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
		document.getElementById("videoPlayer").width = 920;
		document.getElementById("videoPlayer").height = 820;

		document.getElementById("mic-send-row").className = 'col-2';
		document.getElementById("input-box").className = 'col-10';
		document.getElementById("question-Box").style = 'padding-right: 95px; height: 170px; font-size: 35px';
		document.getElementById("mic-button").style = 'height: 85px; width: 85px;  font-size: 30px';
		document.getElementById("stop-button").style = 'display: none; height: 85px; width: 85px;  font-size: 30px';
		document.getElementById("send-button").style = 'height: 170px; width: 140px;  font-size: 40px';
		document.getElementById("mentor-title").style = "visibility: hidden";
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

if (window.location.pathname.split("/")[2]=="embed"){
		document.getElementById("navSize").style.display = "none";
}

Papa.parse(mentor.topicsURL, {	//setup the csv for buttons on desktop
	download: true,
	complete: function(results) {
		globalResults = results;
		resizeFix();	//run this after we get the button names
		video.src = mentor.videoURL+mentor.introURL + isMobile + ".mp4";
		document.getElementById("track").src = "/"+mentorID+"/tracks/"+mentor.introURL+".vtt";
	}
});

function renderButtons(results){
	document.getElementById("topic-box").innerHTML = '';
	if (screen.width>=700){	//we shouldn't check this each loop so goes on the outside
		for (var i = 0; i<results.data.length-3; i++){
		///////////////This is the desktop version
			if (i%5==0){	//create rows for the buttons
				var buttonrow = document.createElement("div");
				buttonrow.class="row";
				buttonrow.style.paddingBottom="0.5%";
				buttonrow.style.paddingTop="0.25%";
				document.getElementById("topic-box").appendChild(buttonrow);
			}
			btn = document.createElement("BUTTON");        // Create buttons
			btn.className = "btn button-settings";
			var name = results.data[i][0];
			btn.appendChild(document.createTextNode(name));
			btn.value = name;
			btn.onclick = function() {findquestion(this)};	//on click find a question
			buttonrow.appendChild(btn);	//append button to row
		}
	} else{
	//////////////////////This is the mobile version
		for (var i = 0; i<results.data.length-3; i++){
			if (i%((results.data.length-3)/2)<1){	//create rows for the buttons results.data.length/2
				var buttonrow = document.createElement("div");
				buttonrow.class="row";
				buttonrow.style.paddingBottom="0.5%";
				buttonrow.style.paddingTop="0.25%";
				document.getElementById("topic-box").appendChild(buttonrow);
			}
			btn = document.createElement("BUTTON");        // Create buttons
			btn.className = "btn button-settings-mobile";
			var name = results.data[i][0];
			btn.appendChild(document.createTextNode(name));
			btn.value = name;
			btn.onclick = function() {findquestion(this)};	//on click find a question
			buttonrow.appendChild(btn);	//append button to row
		}
	}
}

var x = {};	//hold the amount of times button has already been clicked
function findquestion(thisButton) {	//find the question that needs to be filled into the send box
	//console.log(thisButton.value);
	if (x[thisButton.value]){		//Keep track of which question in the topic list we're on
		x[thisButton.value] = x[thisButton.value] + 1;
	} else {
		x[thisButton.value] = 1;
	}
	Papa.parse(mentor.questions, {	//parse the csv
		download: true,
		complete: function(results) {
			var questionNumber = 0;
			var question;
			for (var i = 0; i<results.data.length; i++){
				if (results.data[i][0].includes(thisButton.value)){	//if the question has our topic
					questionNumber++;
					if (questionNumber == x[thisButton.value]){	//if its the right question on the list
						question = results.data[i][3];
						//console.log(question);
						document.getElementById("question-Box").value = question;
						break;
					}
				}
			}
		}
	});
}
function toCaption(){	//switch view of box
	document.getElementById("topic-box").style.display = "none";
	document.getElementById("caption-box").style.display = "block";
	document.getElementById("button-caption").disabled = true;
	document.getElementById("button-choice").disabled = false;
}
function toChoices(){ //switch view of box
	document.getElementById("topic-box").style.display = "block";
	document.getElementById("caption-box").style.display = "none";
	document.getElementById("button-caption").disabled = false;
	document.getElementById("button-choice").disabled = true;
}
function send(){	//send the question on enter or send key
	if (document.getElementById("question-Box").value&& document.getElementById("question-Box").value!="\n"){
		stopWatson();
		socket.emit("sendQuestion", {"Question":(document.getElementById("question-Box").value),"Mentor":(mentorID)});
		document.getElementById("caption-box").innerHTML = document.getElementById("caption-box").innerHTML + '<b>User:</b>\xa0\xa0' + document.getElementById("question-Box").value + '<br>';
		document.getElementById("question-Box").value = '';
	}
}
var stream;
function watson(){
	document.getElementById("mic-button").style.display = 'none';
	document.getElementById("stop-button").style.display = 'block';
	stream = WatsonSpeech.SpeechToText.recognizeMicrophone({
	   token: token,
	   outputElement: '#question-Box' // CSS selector or DOM Element
    });
   stream.on('error', function(err) {
	   console.log(err);
   });
}
function stopWatson(){
	document.getElementById("stop-button").style.display = 'none';
	document.getElementById("mic-button").style.display = 'block';
	if(stream){
		stream.stop();
	}
}
function videoSwitch(){
	var videoPlayer = document.getElementById("videoPlayer")
	if (videoPlayer.paused){
		videoPlayer.play();
	} else {
		videoPlayer.pause();
	}
}


socket.on("receiveAnswer", function(data) {		//got the answer
	//console.log(data);
	video.src = mentor.videoURL+data.videoID + isMobile + '.mp4';
	document.getElementById("track").src = "/"+mentorID+"/tracks/"+data.videoID+".vtt";
	video.play();
	video.controls = true;
	document.getElementById("caption-box").scrollTop = document.getElementById("caption-box").scrollHeight;
	document.getElementById("caption-box").innerHTML = document.getElementById("caption-box").innerHTML + '<b>Mentor: </b>\xa0\xa0' + data.transcript.split(/\\'/g).join("'").split("%HESITATION").join("") + '<br>';
});
var token;
socket.on("token", function(data){
	token = data.token;
});
video.onended = function(){		//when the video playing finishes, play the idle video
	video.src = mentor.idleURL + isMobile + ".mp4";
	document.getElementById("track").src = "";
	video.play();
	video.controls = false;
}
document.getElementById("caption-box").innerHTML = '' + '<b> Mentor: </b>' + '\xa0\xa0'  +  mentor.intro +'<br>';
document.getElementById("mentor-title").textContent = mentor.title;
$('#question-Box').keydown(function(e) {
    if (e.keyCode === 13) {
        $(this).val('').focus();
        return false;
    }
})
