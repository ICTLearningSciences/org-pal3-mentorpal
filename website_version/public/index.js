var globalResults;
var socket = io();
var video = document.getElementById("videoPlayer");

var mentorID = window.location.pathname.slice(1);
var mentor ={};
//Each mentor needs its own set of links
//This way, content can be hosted elsewhere explicit
if (mentorID == 'clint'){
	mentor = {
		name: "Clinton Anderson",
		videoURL: "https://pal3-dev.ict.usc.edu/resources/mentor/clint/",
		idleURL: "https://pal3-dev.ict.usc.edu/resources/mentor/clint/clintanderson_I_7_1.ogv",
		topicsURL: "https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/clint/data/topics.csv",
		questions: "https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/clint/data/Questions_Paraphrases_Answers.csv",
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy."

	};
} else if (mentorID == 'dan'){
	mentor = {
		name: "Dan Davis",
		videoURL: "https://pal3-dev.ict.usc.edu/resources/mentor/clint/",
		idleURL: "https://pal3-dev.ict.usc.edu/resources/mentor/clint/clintanderson_I_7_1.ogv",
		topicsURL: "https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/clint/data/topics.csv",
		questions: "https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/dan/data/Questions_Paraphrases_Answers.csv",
		intro: "Hello I'm Dan Davis I've worked for universities to last thirty years doing basic research in high performance computing of work for Cal Tech, University of Southern California and the University of Hawaii"
	};
} else {	//if it's none of these default to clint.  You could redirect to a homepage too that's why this is here
	mentorID = 'clint';
	mentor = {
		name: "Clinton Anderson",
		videoURL: "https://pal3-dev.ict.usc.edu/resources/mentor/clint/",
		idleURL: "https://pal3-dev.ict.usc.edu/resources/mentor/clint/clintanderson_I_7_1.ogv",
		topicsURL: "https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/clint/data/topics.csv",
		questions: "https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/dan/data/Questions_Paraphrases_Answers.csv",
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy."

	};
}

function resizeFix(){	//run everytime the window is resized to keep it responsive
	if (screen.width<800){	//check if we're on mobile
		toChoices();
		document.getElementById("mainSize").className = "container-fluid";
		document.getElementById("topic-box").className = "topic-box-mobile";
		renderButtons(globalResults);
		document.getElementById("button-row").style.display = 'none';
		document.getElementById("main-box").className = 'col';

		document.getElementById("videoWrapper").className = 'video-wrapper';
		document.getElementById("videoPlayer").className = 'video';	
	} else {	//if not mobile render this
		document.getElementById("mainSize").className = "container";
		document.getElementById("topic-box").className = "topic-box";
		renderButtons(globalResults);
		document.getElementById("button-row").style.display = 'block';
		document.getElementById("main-box").className = 'col-11';

		document.getElementById("videoWrapper").className = 'embed-responsive embed-responsive-16by9';
		document.getElementById("videoPlayer").className = 'col';

	}
}

Papa.parse(mentor.topicsURL, {	//setup the csv for buttons on desktop
	download: true,
	complete: function(results) {
		globalResults = results;
		resizeFix();	//run this after we get the button names
	}
});

function renderButtons(results){
	document.getElementById("topic-box").innerHTML = '';
	if (screen.width>=800){	//we shouldn't check this each loop so goes on the outside
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
	if (document.getElementById("question-Box").value){
		socket.emit("sendQuestion", {"Question":(document.getElementById("question-Box").value),"Mentor":(mentorID)});
		document.getElementById("caption-box").value = document.getElementById("caption-box").value + 'User:\n\t' + document.getElementById("question-Box").value + '\n';
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
	stream.stop();
}

socket.on("receiveAnswer", function(data) {		//got the answer
	//console.log(data);
	video.src = mentor.videoURL+data.videoID;
	video.play();
	video.controls = true;
	document.getElementById("caption-box").scrollTop = document.getElementById("caption-box").scrollHeight;
	document.getElementById("caption-box").value = document.getElementById("caption-box").value + 'Mentor:\n\t' + data.transcript.replace(/\\'/g,"'") + '\n';
});
var token;
socket.on("token", function(data){
	token = data.token;
});
video.onended = function(){		//when the video playing finishes, play the idle video
	video.src = mentor.idleURL;
	video.play();
	video.controls = false;
}
video.play();
document.getElementById("caption-box").innerHTML = '';
