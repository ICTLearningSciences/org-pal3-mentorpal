var globalResults
var socket = io()
var video = document.getElementById("videoPlayer")
var isMobile=""
urlp=[];u=location.search.replace("?","").split("&").forEach(function(d){e=d.split("=");urlp[e[0]]=e[1];})
const isUnity=urlp["unity"]
const mentorID = window.location.pathname.split("/")[1]
const username = localStorage.getItem("username")
var mentor = {}
var blacklist = []
const num_blacklisted_repeats = 5
document.getElementById("user-display").textContent = username

//Each mentor needs its own set of links
//This way, content can be hosted elsewhere explicit
if (mentorID == 'clint') {
	mentor = {
		name: "Clint Anderson",
		shortName: "Clint", //for the transcript
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy.",
		introURL: "clintanderson_A1_1_1",
		title: "Clinton Anderson: Nuclear Electrician's Mate" //for the title
	};
} else if (mentorID == 'dan') {
	mentor = {
		name: "Dan Davis",
		shortName: "Dan",
		intro: "Hello I'm Dan Davis I've worked for universities to last thirty years doing basic research in high performance computing of work for Cal Tech, University of Southern California and the University of Hawaii",
		introURL: "dandavis_A1_1_1",
		title: "Dan Davis: High Performance Computing Researcher"
	};
} else if (mentorID == 'julianne') {	//if it's none of these default to clint.  You could redirect to a homepage too that's why this is here
	mentor = {
		name: "Julianne Nordhagen",
		shortName: "Julianne",
		intro: "Hi my name's Julie Nordhagen, I'm in the United States Navy and I'm currently a student naval aviator so that means that I have commissioned into the Navy and I am starting to learn how to fly planes and will then become a full trained pilot for the Navy.",
		introURL: "julianne_U1_1_1",
		title: "Julianne Nordhagen: Student Naval Aviator"
	};
} else if (mentorID == 'carlos') {	//if it's none of these default to clint.  You could redirect to a homepage too that's why this is here
	mentor = {
		name: "Carlos Rios",
		shortName: "Carlos",
		intro: "So my name is Carlos Rios. I'm a logistics lead supporting marine corps projects. I'm originally from Connecticut or New Haven, Connecticut. My mother and father are from Puerto Rico they migrated over to Connecticut and then from there after about six well I was about seven years old and moved over to a Philadelphia where I spent most of my most of my youth. About age 18-19 years old graduated high school and joined the marine corps. Twenty three years later, retired. During that time of course I got married. I have been married for twenty seven years. I have two great kids, one currently attending USC and one in the near future want to attend Clemson, South Carolina where I currently reside after my retirement from the marine corps. I spent two years as a contractor supporting the marine corps and I personally think I did such a good job that the government decided to bring it over to that side and support as a government employee and I've been doing that for about seven years high manage everything from my computer, servers, laptops to drones.",
		introURL: "carlos_A1_1_1",
		title: "Carlos Rios: Marine Logistician"
	};
} else {
	mentorID = 'clint';
	mentor = {
		name: "Clinton Anderson",
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy.",
		introURL: "clintanderson_A1_1_1",
		title: "Clinton Anderson: Nuclear Electrician's Mate"
	};
}

mentor.videoURL = "https://pal3.ict.usc.edu/resources/mentor/"+mentorID+"/"
mentor.idleURL = "https://pal3.ict.usc.edu/resources/mentor/"+mentorID+"/idle"
mentor.topicsURL = "/"+mentorID+"/topics.csv"
mentor.questions = "/"+mentorID+"/Questions_Paraphrases_Answers.csv"
mentor.classifier = "/"+mentorID+"/classifier_data.csv"

//run everytime the window is resized to keep it responsive
function resizeFix() {
	renderButtons(globalResults);

	// if mobile, render this:
	if (screen.width < 768 || isUnity == "true") {
		isMobile = "_M";
		document.getElementById("main-holder").className = "container-fluid";	// make video and button area fill screen
		document.getElementById("videoPlayer").textTracks[0].mode = "showing";	// show subtitles
		document.getElementById("myOverlay").innerHTML = ''
		document.getElementById("myOverlay").innerHTML += "<h2>Welcome to MentorPal!</h2>"
		document.getElementById("myOverlay").innerHTML += "<h3>Click on the topic buttons to get suggested questions.</h3>"
		toChoices();
	}
	// if desktop, render this
	else {
		isMobile="";
		document.getElementById("main-holder").className = "container";
		document.getElementById("videoWrapper").className = 'embed-responsive embed-responsive-16by9';
		document.getElementById("videoPlayer").textTracks[0].mode = "hidden";	// hide on-video captions
	}

	// if inside unity (PAL3 app), render this:
	if (isUnity == "true") {
		document.getElementById("mic-button").style.display = 'none'	// hide mic button
		document.getElementById("stop-button").style.display = 'none'
	}
}

if (window.location.pathname.split("/")[2]=="embed") {
		document.getElementById("navSize").style.display = "none";
}

//setup the csv for buttons on desktop
Papa.parse(mentor.topicsURL, {
	download: true,
	complete: function(results) {
		globalResults = results;
		resizeFix();	//run this after we get the button names
		video.src = mentor.videoURL + mentor.introURL + isMobile + ".mp4";
		document.getElementById("track").src = "/"+mentorID+"/tracks/"+mentor.introURL+".vtt";
	}
});

function renderButtons(topics) {
	document.getElementById("topic-box").innerHTML = '';
	//parse the csv
	Papa.parse(mentor.questions, {
		download: true,
		complete: function(results) {
			// loop through all topics (excluding Negative, Positive, Navy)
			for (var i = 0; i < topics.data.length-3; i++) {
				for (var j = 0; j < results.data.length; j++) {
					// if a question for the topic exists
					if (results.data[j][0].toLowerCase().includes(topics.data[i][0].toLowerCase())) {
						var topicName = topics.data[i][0];
						btn = document.createElement("BUTTON");
						btn.className = "btn button-settings col-xl-2 col-lg-2 col-md-4 col-sm-4 col-6";
						btn.appendChild(document.createTextNode(topicName));
						btn.value = topicName;
						btn.onclick = function() {findquestion(this)};	//on click find a question
						document.getElementById("topic-box").appendChild(btn);	//append button to row
						break;
					}
				}
			}
		}
	});
}

var x = {};	//hold the amount of times button has already been clicked
function findquestion(thisButton) {	//find the question that needs to be filled into the send box
	Papa.parse(mentor.questions, {	//parse the csv
		download: true,
		complete: function(results) {
			var questions={}
			var topicQuestionSize = 0
			// get all the questions for the chosen topic
			for (var i = 0; i < results.data.length; i++) {
				if (results.data[i][0].toLowerCase().includes(thisButton.value.toLowerCase())) {
					questions[topicQuestionSize++] = results.data[i][3]
				}
			}

			//Keep track of which question in the topic list we're on
			if (x[thisButton.value]) {
				x[thisButton.value] = (x[thisButton.value] + 1) % topicQuestionSize
			} else {
				x[thisButton.value] = 1
			}
			document.getElementById("question-Box").value = questions[x[thisButton.value]]
		}
	});
}

//switch view of box
function toCaption() {
	document.getElementById("topic-box").style.display = "none";
	document.getElementById("caption-box").style.display = "block";
	document.getElementById("button-caption").disabled = true;
	document.getElementById("button-choice").disabled = false;
}

//switch view of box
function toChoices() {
	document.getElementById("topic-box").style.display = "block";
	document.getElementById("caption-box").style.display = "none";
	document.getElementById("button-caption").disabled = false;
	document.getElementById("button-choice").disabled = true;
}

//send the question on enter or send key
function send() {
	const question = document.getElementById("question-Box").value

	if (question && question != "\n"){
		stopWatson();
		Papa.parse(mentor.classifier, {
			download: true,
			complete: function(results) {
				// first check if the question has a direct match
				for (var i = 0; i < results.data.length; i++) {
					var questions = results.data[i][3].split('\r')
					// if direct match, use direct answer and don't bother with python tensorflow
					for (var j = 0; j < questions.length; j++) {
						var q = questions[j].toLowerCase().replace(/\.|\?|\,| /g, '')
						if (q == question.toLowerCase().replace(/\.|\?|\,| /g, '')) {
							const videoID = results.data[i][0]
							const transcript = sanitize(results.data[i][2])
							video.src = mentor.videoURL + videoID + isMobile + '.mp4';
							document.getElementById("track").src = "/" + mentorID + "/tracks/" + videoID + ".vtt";
							video.play();
							video.controls = true;
							document.getElementById("caption-box").scrollTop = document.getElementById("caption-box").scrollHeight;
							document.getElementById("caption-box").innerHTML = document.getElementById("caption-box").innerHTML + '<b>' + mentor.shortName+': </b>\xa0\xa0' + transcript.split(/\\'/g).join("'").split("%HESITATION").join("") + '<br>';
							addToBlacklist(videoID)
							return;
						}
					}
				}
				socket.emit("sendQuestion", {"Question":(document.getElementById("question-Box").value),"Mentor":(mentorID),"UserID":(username),"Blacklist":(blacklist)});
				document.getElementById("caption-box").innerHTML = document.getElementById("caption-box").innerHTML + '<b>User:</b>\xa0\xa0' + question + '<br>';
				document.getElementById("question-Box").value = '';
			}
		});
	}
}

function sanitize(str_input) {
	return str_input.replace(/\uFFFD/g, ' ').replace(/\u00E5/g, ' ').replace(/\u00CA/g, '')
}

function addToBlacklist(response) {
	if (blacklist.length == num_blacklisted_repeats) {
		blacklist.shift()
	}
	blacklist.push(response)
}

var stream;
function watson(){
	// don't use mic in PAL3 unity mobile app
	if (isUnity != "true") {
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
}

function stopWatson(){
	// don't use mic in PAL3 unity mobile app
	if (isUnity != "true") {
		document.getElementById("mic-button").style.display = 'block';
		document.getElementById("stop-button").style.display = 'none';
		if(stream){
			stream.stop();
		}
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
	const transcript = sanitize(data.transcript)
	video.src = mentor.videoURL+data.videoID + isMobile + '.mp4';
	document.getElementById("track").src = "/"+mentorID+"/tracks/"+data.videoID+".vtt";
	video.play();
	video.controls = true;
	document.getElementById("caption-box").scrollTop = document.getElementById("caption-box").scrollHeight;
	document.getElementById("caption-box").innerHTML = document.getElementById("caption-box").innerHTML + '<b>'+mentor.shortName+': </b>\xa0\xa0' + transcript.split(/\\'/g).join("'").split("%HESITATION").join("") + '<br>';
	addToBlacklist(data.videoID)
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

document.getElementById("caption-box").innerHTML = '' + '<b>'+ mentor.shortName +': </b>' + '\xa0\xa0'  +  mentor.intro +'<br>';
document.getElementById("mentor-title").textContent = mentor.title;
$('#question-Box').keydown(function(e) {
    if (e.keyCode === 13) {
        $(this).val('').focus();
        return false;
    }
})

window.onload = function() {
	if (!sessionStorage.loaded){
		openNav();
	}
	sessionStorage.loaded = true;
}

function openNav() {
    document.getElementById("myNav").style.height = "100%";
		video.pause();
}

function closeNav() {
    document.getElementById("myNav").style.height = "0%";
		video.play();
}
