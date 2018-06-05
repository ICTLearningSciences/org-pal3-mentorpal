var globalResults;
function resizeFix(){
	if (screen.width<800){	//check if we're on mobile
		document.getElementById("mainSize").className = "container-fluid";
		document.getElementById("topic-box").className = "topic-box-mobile";
		renderButtons(globalResults);
	} else {
		document.getElementById("mainSize").className = "container";
		document.getElementById("topic-box").className = "topic-box";
		renderButtons(globalResults);
	}
}


Papa.parse("https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/clint/data/topics.csv", {	//setup the csv for buttons on desktop
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
		///////////////This is the desktop version	
			if (i%(results.data.length/4)==0){	//create rows for the buttons
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
	Papa.parse("https://raw.githubusercontent.com/benjamid/MentorPAL/master/mentors/dan/data/Questions_Paraphrases_Answers.csv", {	//parse the csv
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
						document.getElementById("questionBox").value = question;
						break;
					}											
				}
			}
		}
	});								
}
function toCaption(){	//switch views
	document.getElementById("topic-box").style.display = "none";
	document.getElementById("caption-box").style.display = "block";
	document.getElementById("button-caption").disabled = true;
	document.getElementById("button-choice").disabled = false;
	console.log("siwtch to caption");
}
function toChoices(){ //switch views
	document.getElementById("topic-box").style.display = "block";
	document.getElementById("caption-box").style.display = "none";
	document.getElementById("button-caption").disabled = false;
	document.getElementById("button-choice").disabled = true;
}		
