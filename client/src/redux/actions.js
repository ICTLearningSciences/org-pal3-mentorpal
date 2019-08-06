import Papa from "papaparse"
import { actions as cmi5Actions } from "redux-cmi5"

import { topicsUrl, questionsUrl, queryMentor } from "src/api/api"
import { STATUS_READY } from "src/redux/store"

export const MENTOR_LOADED = "MENTOR_LOADED" // mentor info was loaded
export const MENTOR_SELECTED = "MENTOR_SELECTED" // mentor video was selected
export const MENTOR_FAVED = "MENTOR_FAVED" // mentor was favorited
export const MENTOR_NEXT = "MENTOR_NEXT" // set next mentor to play after current
export const MENTOR_TOPIC_QUESTIONS_LOADED = "MENTOR_TOPIC_QUESTIONS_LOADED"
export const TOPIC_SELECTED = "TOPIC_SELECTED"

export const QUESTION_SENT = "QUESTION_SENT" // question input was sent
export const QUESTION_ANSWERED = "QUESTION_ANSWERED" // question was answered by mentor
export const QUESTION_ERROR = "QUESTION_ERROR" // question could not be answered by mentor
export const ANSWER_FINISHED = "ANSWER_FINISHED" // mentor video has finished playing

export const MENTOR_SELECTION_TRIGGER_AUTO = "auto"
export const MENTOR_SELECTION_TRIGGER_USER = "user"

export const loadMentor = mentor => dispatch => {
  dispatch({
    type: MENTOR_LOADED,
    mentor: mentor,
  })
}

const { sendStatement: sendXapiStatement } = cmi5Actions

export const loadQuestions = (mentor_id, recommended) => async dispatch => {
  const questions_url = questionsUrl(mentor_id)

  try {
    const results = await papaParseAsync(questions_url)
    const questions = results.data.reduce((questions, data) => {
      const topics = data[0].split(", ")
      const question = data[3]

      topics.forEach(topic => {
        questions[topic] = questions[topic] || []
        if (!questions[topic].includes(question)) {
          questions[topic].push(question)
        }
      })
      return questions
    }, {})

    dispatch(loadTopics(mentor_id, questions, recommended))
  } catch (err) {
    console.error(err)
  }
}

const loadTopics = (mentor_id, questions, recommended) => async dispatch => {
  const topics_url = topicsUrl(mentor_id)
  const init = recommended
    ? {
        Recommended: Array.isArray(recommended) ? recommended : [recommended],
        History: [],
      }
    : { History: [] }

  try {
    const results = await papaParseAsync(topics_url)
    var topic_questions = results.data.reduce((topic_questions, data) => {
      const topicName = data[0]
      const topicGroup = data[1]
      const topicQuestions = questions[topicName]

      if (!(topicName && topicGroup && topicQuestions)) {
        return topic_questions
      }
      topic_questions[topicGroup] = topic_questions[topicGroup] || []
      topic_questions[topicGroup] = topic_questions[topicGroup].concat(
        topicQuestions
      )
      topic_questions[topicGroup] = Array.from(
        new Set(topic_questions[topicGroup])
      )
      return topic_questions
    }, init)

    dispatch({
      type: MENTOR_TOPIC_QUESTIONS_LOADED,
      id: mentor_id,
      topic_questions: topic_questions,
    })
  } catch (err) {
    console.error(err)
  }
}

export const selectMentor = (
  mentor_id,
  { trigger = MENTOR_SELECTION_TRIGGER_AUTO } = {}
) => dispatch => {
  dispatch(onInput())
  dispatch({
    type: MENTOR_SELECTED,
    id: mentor_id,
    trigger: trigger,
  })
}

export const selectTopic = topic => ({
  type: TOPIC_SELECTED,
  topic: topic,
})

export const faveMentor = mentor_id => ({
  type: MENTOR_FAVED,
  id: mentor_id,
})

const currentQuestionIndex = state =>
  Array.isArray(state.questions_asked) ? state.questions_asked.length : -1

const xapiSessionState = state => {
  return {
    mentor_current: state.current_mentor,
    question_current: state.current_question,
    topic_current: state.current_topic,
    mentor_faved: state.faved_mentor,
    mentor_list:
      state.mentors_by_id && typeof (state.mentors_by_id === "object")
        ? Object.getOwnPropertyNames(state.mentors_by_id).sort()
        : [],
    mentor_next: state.next_mentor,
    questions_asked: state.questions_asked,
    question_index: currentQuestionIndex(state),
  }
}

const sessionStateExt = (state, ext) => {
  return {
    ...(ext || {}),
    "https://mentorpal.org/xapi/context/extensions/session-state": xapiSessionState(
      state
    ),
  }
}

export const sendQuestion = question => async (dispatch, getState) => {
  dispatch(
    sendXapiStatement({
      verb: "https://mentorpal.org/xapi/verb/asked",
      result: {
        extensions: {
          "https://mentorpal.org/xapi/activity/extensions/actor-question": {
            text: question,
            question_index: currentQuestionIndex(getState()) + 1,
          },
        },
      },
      contextExtensions: sessionStateExt(getState()),
    })
  )
  dispatch(onInput())
  dispatch(onQuestionSent(question))

  const state = getState()
  const mentor_ids = Object.keys(state.mentors_by_id)
  const tick = Date.now()
  // query all the mentors without waiting for the answers one by one
  const promises = mentor_ids.map(mentor => {
    return new Promise((resolve, reject) => {
      queryMentor(mentor, question)
        .then(response => {
          dispatch(
            sendXapiStatement({
              verb: "https://mentorpal.org/xapi/verb/answered",
              result: {
                extensions: {
                  "https://mentorpal.org/xapi/activity/extensions/mentor-response": {
                    ...response,
                    question: question,
                    question_index: currentQuestionIndex(getState()),
                    mentor: mentor,
                    response_time: Date.now() - tick,
                  },
                },
              },
              contextExtensions: sessionStateExt(getState()),
            })
          )
          dispatch(onQuestionAnswered(response))
          resolve(response)
        })
        .catch(err => {
          dispatch(onQuestionError(mentor, question))
          reject(err)
        })
    })
  })

  // ...but still don't move forward till we have all the answers,
  // because we will prefer the user's fav and then highest confidence
  const responses = (await Promise.all(
    promises.map(p => p.catch(e => e))
  )).filter(r => !(r instanceof Error))

  if (responses.length === 0) {
    return
  }

  // Play favored mentor if an answer exists
  if (state.faved_mentor) {
    const fave_response = responses.find(response => {
      return response.id === state.faved_mentor
    })
    if (!fave_response.is_off_topic) {
      dispatch(selectMentor(state.faved_mentor))
      return
    }
  }

  // Otherwise play mentor with highest confidence answer
  responses.sort((a, b) => (a.confidence > b.confidence ? -1 : 1))
  if (responses[0].is_off_topic) {
    dispatch(
      selectMentor(
        state.faved_mentor ? state.faved_mentor : state.current_mentor
      )
    )
    return
  }
  dispatch(selectMentor(responses[0].id))
}

const NEXT_MENTOR_DELAY = 3000
var timer = null
export const answerFinished = () => (dispatch, getState) => {
  dispatch(onIdle())

  // order mentors by highest answer confidence
  const state = getState()
  const mentors = state.mentors_by_id
  const responses = []
  Object.keys(mentors).forEach(id => {
    responses.push({
      id: mentors[id].id,
      confidence: mentors[id].confidence,
      is_off_topic: mentors[id].is_off_topic,
      status: mentors[id].status,
    })
  })
  responses.sort((a, b) => (a.confidence > b.confidence ? -1 : 1))

  // get the most confident answer that has not been given
  const next_mentor = responses.find(response => {
    return response.status === STATUS_READY && !response.is_off_topic
  })

  // set the next mentor to start playing, if there is one
  if (!next_mentor) {
    return
  }
  dispatch(nextMentor(next_mentor.id))

  // play the next mentor after the timeout
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  timer = setTimeout(() => {
    dispatch(selectMentor(next_mentor.id))
  }, NEXT_MENTOR_DELAY)
}

export const onInput = () => dispatch => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  dispatch(nextMentor(""))
}

const onQuestionSent = question => ({
  type: QUESTION_SENT,
  question: question,
})

const onQuestionAnswered = response => ({
  type: QUESTION_ANSWERED,
  mentor: response,
})

const onQuestionError = (id, question) => ({
  type: QUESTION_ERROR,
  mentor: id,
  question: question,
})

const onIdle = () => ({
  type: ANSWER_FINISHED,
})

const nextMentor = id => ({
  type: MENTOR_NEXT,
  mentor: id,
})

const papaParseAsync = url => {
  return new Promise(function(complete, error) {
    Papa.parse(url, { download: true, complete, error })
  })
}
