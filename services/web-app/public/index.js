const username = localStorage.getItem("username")
const mentorID = window.location.pathname.split("/")[1]
const isUnity = location.href.includes('unity=true')
const num_blacklisted_repeats = 5

const getVideoPlayer = () => document.getElementById('videoPlayer')
const socket = io()
const blacklist = []
const topicDict = {}

var videoTargetType = "web"
let navIsOpen = false

document.getElementById("user-display").textContent = username

const MENTOR_API_URL = '/mentor-api'
const MENTOR_VIDEO_HOST = 'https://localhost:8080' // TODO: pass from server/env variable
const createMentor = (mId, data) => {
	const videoURLFor = id => `${MENTOR_VIDEO_HOST}/videos/mentors/${mId}/${videoTargetType}/${id}.mp4`
	return Object.assign(
		{},
		data,
		{
			topicsURL: `${MENTOR_API_URL}/mentors/${mId}/data/topics.csv`,
			questions: `${MENTOR_API_URL}/mentors/${mId}/data/questions_paraphrases_answers.csv`,
			classifier: `${MENTOR_API_URL}/mentors/${mId}/data/classifier_data.csv`,
			idleURL: () => videoURLFor('idle'),
			trackUrlFor: (id) => `${MENTOR_API_URL}/mentors/${mId}/tracks/${id}.vtt`,
			videoURLFor: videoURLFor
		}
	)
}

const mentorDataById = {
	carlos: {
		name: "Carlos Rios",
		shortName: "Carlos",
		intro: "So my name is Carlos Rios. I'm a logistics lead supporting marine corps projects. I'm originally from Connecticut or New Haven, Connecticut. My mother and father are from Puerto Rico they migrated over to Connecticut and then from there after about six well I was about seven years old and moved over to a Philadelphia where I spent most of my most of my youth. About age 18-19 years old graduated high school and joined the marine corps. Twenty three years later, retired. During that time of course I got married. I have been married for twenty seven years. I have two great kids, one currently attending USC and one in the near future want to attend Clemson, South Carolina where I currently reside after my retirement from the marine corps. I spent two years as a contractor supporting the marine corps and I personally think I did such a good job that the government decided to bring it over to that side and support as a government employee and I've been doing that for about seven years high manage everything from my computer, servers, laptops to drones.",
		introVideoId: "carlos_A1_1_1",
		title: "Carlos Rios: Marine Logistician"
	},
	clint: {
		name: "Clint Anderson",
		shortName: "Clint", //for the transcript
		intro: "My name is EMC Clint Anderson, that's Electrician's Mate Clinton Anderson. I was born in Los Angeles, California. I was raised there most of my life and I graduated from high school there. A couple of years after graduating from high school, then I joined the United States Navy. I was an Electrician's Mate for eight years. I served on an aircraft carrier. We went on many deployments. A deployment is when you go to war, you fight. We fought in the Iraq war. I went on three deployments and it was a really great time in my life. I had a lot of fun. At the end of the eight years, I decided that the Navy wasn't quite a career for me. So, I got out of the Navy. I started using the education benefits that we received and I started going to the University of California at Berkeley. I was majoring in computer science and afterwards, I started getting my master's degree from the University of Southern California. I also had a job at the Institute for Creative Technologies. It's been a lot of fun, this whole time. Thanks to the Navy.",
		introVideoId: "clintanderson_A1_1_1",
		title: "Clinton Anderson: Nuclear Electrician's Mate" //for the title
	},
	dan: {
		name: "Dan Davis",
		shortName: "Dan",
		intro: "Hello I'm Dan Davis I've worked for universities to last thirty years doing basic research in high performance computing of work for Cal Tech, University of Southern California and the University of Hawaii",
		introVideoId: "dandavis_A1_1_1",
		title: "Dan Davis: High Performance Computing Researcher"
	},
	julianne: {
		name: "Julianne Nordhagen",
		shortName: "Julianne",
		intro: "Hi my name's Julie Nordhagen, I'm in the United States Navy and I'm currently a student naval aviator so that means that I have commissioned into the Navy and I am starting to learn how to fly planes and will then become a full trained pilot for the Navy.",
		introVideoId: "julianne_U1_1_1",
		title: "Julianne Nordhagen: Student Naval Aviator"
	}
}

const mentor = createMentor(mentorID, mentorDataById[mentorID] || mentorDataById['clint'])

//run everytime the window is resized to keep it responsive
const resizeFix = () => {
	renderButtons()
	// if mobile, render this:
	if (screen.width < 768 || isUnity) {
		videoTargetType = "mobile"
		document.getElementById("main-holder").className = "container-fluid"	// make video and button area fill screen
		document.getElementById("videoPlayer").textTracks[0].mode = "showing"	// show subtitles
		document.getElementById("myOverlay").innerHTML = ''
		document.getElementById("myOverlay").innerHTML += "<h2>Welcome to MentorPal!</h2>"
		document.getElementById("myOverlay").innerHTML += "<h3>Click on the topic buttons to get suggested questions.</h3>"
		document.getElementById("navSize").style.display = "none"
		toChoices()
	}
	// if desktop, render this
	else {
		videoTargetType = "web"
		document.getElementById("main-holder").className = "container"
		document.getElementById("videoWrapper").className = 'embed-responsive embed-responsive-16by9'
		document.getElementById("videoPlayer").textTracks[0].mode = "hidden"	// hide on-video captions
	}
	// if inside unity (PAL3 app), render this:
	if (isUnity) {
		document.getElementById("mic-button").style.display = 'none'	// hide mic button
		document.getElementById("stop-button").style.display = 'none'
	}
}

if (window.location.pathname.split("/")[2] == "embed") {
	document.getElementById("navSize").style.display = "none"
}

/**
 * When the html5 video player is created (or recreated)
 * we need to wire it so that on the end of playing any video
 * it plays the active mentor's idle
 */
const videoPlayerInit = () => {
	const video = getVideoPlayer()
	video.onended = () => {		//when the video playing finishes, play the idle video
		playVideo(mentor.idleURL(), null, true, true)
	}
}

/**
 * There are common scenarios that cause safari 
 * to get into a state where it will no play videos.
 * The simplest is to repeat a question twice in a row.
 * So far, the simplest fix found is to just detect video.play errors (promise rejection),
 * and recreate the video player.
 */
const recreateVideoPlayer = () => {
	console.warn('attempting to recreate video player...')
	const wrapper = document.getElementById('videoWrapper')
	wrapper.innerHTML = wrapper.innerHTML
	videoPlayerInit()
}

/**
 * Play a video given the url. Also plays the associated subtitles if they exist.
 * @param {string} [videoSrc] - url for the video. By default calls play again on the current video (if any)
 * @param {string} [trackSrc] - url for the subtitles, typically vtt 
 * @param {boolean} [controlsHidden] - set true to hide play controls. Default is false (displays controls)
 * @param {boolean} [loop] - loop the video, usually only for idles. Default is false
 */
const playVideo = (videoSrc, trackSrc, controlsHidden, loop) => {
	_playVideo(videoSrc, trackSrc, controlsHidden, loop)
}

/**
 * Internal/called only by `playVideo`
 * Includes an additional param `noRecreatePlayer`,
 * If a video fails to play with error, that sometimes
 * leads to a bug in safari where the player will refuse to play 
 * any videos thereafter.
 * As a workaround, we catch video-play errors and recreate the 
 * videoPlayer object to try to recover. 
 * But we only want to do that at most once per `playVideo` call
 * (not infinite loop of fail/recreate) 
 */
const _playVideo = (videoSrc, trackSrc, controlsHidden, loop, noRecreatePlayer) => {
	const video = document.getElementById("videoPlayer")
	if (videoSrc === null || typeof (videoSrc) === 'undefined') {
		videoSrc = video.src
		if (videoSrc === null || typeof (videoSrc) === 'undefined') {
			return
		}
	}
	video.src = videoSrc
	video.play().then(() => {
		video.controls = controlsHidden !== true
		video.loop = loop === true
		if (navIsOpen) {
			video.pause()
		}
		try {
			const track = document.getElementById('track')
			track.src = trackSrc
		}
		catch (trackErr) {
			console.error(`error loading track for ${trackSrc}`, trackSrc)
		}
	}).catch((err) => {
		console.error('playVideo failed for ' + videoSrc, err)
		if (!noRecreatePlayer) {
			recreateVideoPlayer()
			_playVideo(videoSrc, trackSrc, controlsHidden, loop, true)
		}
	})
}

/**
 * Play the video for a videoID, usually pulled from a classifier-api response,
 * and also append the transcript for the video to the transcript box.
 * @param {string} videoID 
 * @param {string} transcript 
 */
const playVideoId = (videoID, transcript) => {
	const videoSrc = mentor.videoURLFor(videoID)
	const trackSrc = mentor.trackUrlFor(videoID)
	playVideo(videoSrc, trackSrc)
	transcript = sanitize(transcript)
	if (transcript.length > 0) {
		document.getElementById("caption-box").scrollTop = document.getElementById("caption-box").scrollHeight
		appendTranscript(`<b>${mentor.shortName}: </b>\xa0\xa0${transcript.split(/\\'/g).join("'").split("%HESITATION").join("")}<br>`)
	}
	document.getElementById("question-Box").value = ''
	addToBlacklist(videoID)
}

/**
 * Append text to the transcript area, e.g.
 * `User: what is your name?`
 * or
 * `Mentor: my name is Sue`
 * @param {string} text 
 */
const appendTranscript = (text) => document.getElementById("caption-box").innerHTML += text

const renderButtons = () => {
	document.getElementById("topic-box").innerHTML = ''
	for (var topicName in topicDict) {
		const btn = document.createElement("BUTTON")
		btn.className = "btn button-settings col-xl-2 col-lg-2 col-md-4 col-sm-4 col-6"
		btn.appendChild(document.createTextNode(topicName))
		btn.value = topicName
		btn.onclick = () => findquestion(btn) //on click find a question
		document.getElementById("topic-box").appendChild(btn)	//append button to row
	}
}

const clickCountsByQuestionButton = {}	//hold the amount of times button has already been clicked
const findquestion = (thisButton) => {	//find the question that needs to be filled into the send box
	Papa.parse(mentor.questions, {	//parse the csv
		download: true,
		complete: (results) => {
			const topics = topicDict[thisButton.value]
			const topic = topics[Math.floor(Math.random() * topics.length)]
			const questions = {}
			let topicQuestionSize = 0

			// get all the questions for the chosen topic
			for (let i = 0; i < results.data.length; i++) {
				if (results.data[i][0].toLowerCase().includes(topic.toLowerCase())) {
					questions[topicQuestionSize++] = results.data[i][3]
				}
			}
			//Keep track of which question in the topic list we're on
			if (clickCountsByQuestionButton[topic]) {
				clickCountsByQuestionButton[topic] = (clickCountsByQuestionButton[topic] + 1) % topicQuestionSize
			} else {
				clickCountsByQuestionButton[topic] = 1
			}
			document.getElementById("question-Box").value = questions[clickCountsByQuestionButton[topic]]
		}
	})
}

//switch view of box
const toCaption = () => {
	document.getElementById("topic-box").style.display = "none"
	document.getElementById("caption-box").style.display = "block"
	document.getElementById("button-caption").disabled = true
	document.getElementById("button-choice").disabled = false
}

//switch view of box
const toChoices = () => {
	document.getElementById("topic-box").style.display = "block"
	document.getElementById("caption-box").style.display = "none"
	document.getElementById("button-caption").disabled = false
	document.getElementById("button-choice").disabled = true
}

//send the question on enter or send key
const send = () => {
	const questionText = document.getElementById("question-Box").value.trim().replace('\n', '\r')
	if (questionText) {
		appendTranscript('<b>User:</b>\xa0\xa0' + questionText + '<br>')
		stopWatson()
		const cannonicalQ = cannonical(questionText)
		Papa.parse(mentor.classifier, {
			download: true,
			complete: (results) => {
				// first check if the question has a direct match
				for (let i = 0; i < results.data.length; i++) {
					try {
						const questions = results.data[i][3].replace('\n', '\r').split('\r')
						// if direct match, use direct answer and don't bother with python tensorflow
						for (let j = 0; j < questions.length; j++) {
							const q = cannonical(questions[j])
							if (q === cannonicalQ) {
								const videoID = results.data[i][0]
								const responseText = results.data[i][2]
								playVideoId(videoID, responseText)
								console.log('skip send question for exact match')
								return
							}
						}
					}
					catch (error) { }
				}
				socket.emit("sendQuestion", { "Question": (questionText), "Mentor": (mentorID), "UserID": (username), "Blacklist": (blacklist) })
				document.getElementById("question-Box").value = ''
			}
		})
	}
}

/**
 * Some incoming data has weird characters, like
 * \uFFFD (question mark w black-diamond bkg)
 * This is a patch to just strip them out
 */
const sanitize = (str_input) => {
	if (str_input === null || typeof (str_input) === 'undefined') {
		return ''
	}
	return str_input.toString().trim().replace(/[\uFFFD\u00E5\u00CA]/g, '')
}

const cannonical = (str_input) => {
	if (str_input === null || typeof (str_input) === 'undefined') {
		return ''
	}
	return str_input.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]/g, '_')
		.replace(/[_]+/g, '_')
}

const addToBlacklist = (response) => {
	if (blacklist.length == num_blacklisted_repeats) {
		blacklist.shift()
	}
	blacklist.push(response)
}

var stream
const watson = () => {
	// don't use mic in PAL3 unity mobile app
	if (!isUnity) {
		document.getElementById("mic-button").style.display = 'none'
		document.getElementById("stop-button").style.display = 'block'
		stream = WatsonSpeech.SpeechToText.recognizeMicrophone({
			token: token,
			outputElement: '#question-Box' // CSS selector or DOM Element
		})
		stream.on('error', (err) => {
			console.error('watson error', err)
		})
	}
}


const stopWatson = () => {
	// don't use mic in PAL3 unity mobile app
	if (!isUnity) {
		document.getElementById("mic-button").style.display = 'block'
		document.getElementById("stop-button").style.display = 'none'
		if (stream) {
			stream.stop()
		}
	}
}


window.onload = () => {
	if (!sessionStorage.loaded) {
		openNav()
	}
	sessionStorage.loaded = true
}

const openNav = () => {
	navIsOpen = true
	document.getElementById("myNav").style.height = "100%"
	getVideoPlayer().pause()
}

const closeNav = () => {
	navIsOpen = false
	document.getElementById("myNav").style.height = "0%"
	playVideo()
}

const clearInputContents = (element) => element.value = ''

socket.on("receiveAnswer", (data) => {		//got the answer
	console.log(`receiveAnswer`, data)
	playVideoId(data.videoID, data.transcript)
})


let token
socket.on("token", data => token = data.token)


videoPlayerInit()

//setup the csv for buttons on desktop
Papa.parse(mentor.topicsURL, {
	download: true,
	complete: (results) => {
		// loop through all topics (excluding Negative, Positive, Navy)
		for (var i = 0; i < results.data.length - 3; i++) {
			const topicName = results.data[i][0]
			const topicLabel = results.data[i][1]

			if (topicLabel in topicDict) {
				topicDict[topicLabel].push(topicName)
			} else {
				topicDict[topicLabel] = [topicName]
			}
		}

		resizeFix()	//run this after we get the button names
		playVideoId(mentor.introVideoId)
	}
})

appendTranscript(`<b>${mentor.shortName}: </b>\xa0\xa0${mentor.intro}<br>`)

document.getElementById("mentor-title").textContent = mentor.title
$('#question-Box').keydown((e) => {
	if (e.keyCode === 13) {
		$(this).val('').focus()
		return false
	}
})
