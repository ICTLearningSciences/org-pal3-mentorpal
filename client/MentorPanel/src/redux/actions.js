import { topicsUrl, questionsUrl, queryMentor } from '../api/api'
import { STATUS_READY } from './store'

export const MENTOR_LOADED = 'MENTOR_LOADED'          // mentor info was loaded
export const MENTOR_SELECTED = 'MENTOR_SELECTED'      // mentor video was selected
export const MENTOR_FAVED = 'MENTOR_FAVED'            // mentor was favorited
export const MENTOR_NEXT = 'MENTOR_NEXT'              // set next mentor to play after current
export const QUESTION_SENT = 'QUESTION_SENT'          // question input was sent
export const QUESTION_ANSWERED = 'QUESTION_ANSWERED'  // question was answered by mentor
export const QUESTION_ERROR = 'QUESTION_ERROR'        // question could not be answered by mentor
export const ANSWER_FINISHED = 'ANSWER_FINISHED'      // mentor video has finished playing

export const MENTOR_TOPIC_QUESTIONS_LOADED = 'MENTOR_TOPIC_QUESTIONS_LOADED'
export const TOPIC_SELECTED = 'TOPIC_SELECTED'

export const loadMentor = mentor => (dispatch) => {
  dispatch({
    type: MENTOR_LOADED,
    mentor: mentor,
  })
  dispatch(loadQuestions(mentor.id))
}

export const loadQuestions = mentor_id => (dispatch) => {
  const Papa = require('papaparse/papaparse.min.js')
  const questions_url = questionsUrl(mentor_id)
  const questions = {}

  Papa.parse(questions_url, {
    download: true,
    complete: (results) => {
      for (let i = 1; i < results.data.length; i++) {
        const topics = results.data[i][0].split(', ')
        const question = results.data[i][3]
        if (!question) { continue }

        topics.forEach(topic => {
          if (!topic) { return }
          
          if (!questions[topic]) {
            questions[topic] = []
          }
          if (!questions[topic].includes(question)) {
            questions[topic].push(question)
          }
        });
      }
      dispatch(loadTopics(mentor_id, questions))
    }
  })
}

const loadTopics = (mentor_id, questions) => (dispatch) => {
  const Papa = require('papaparse/papaparse.min.js')
  const topics_url = topicsUrl(mentor_id)
  const topic_questions = {}

  Papa.parse(topics_url, {
    download: true,
    complete: (results) => {
      for (var i = 0; i < results.data.length - 3; i++) {
        const topicName = results.data[i][0]
        const topicGroup = results.data[i][1]
        const topicQuestions = questions[topicName] ? questions[topicName] : []

        if (!topic_questions[topicGroup]) {
          topic_questions[topicGroup] = []
        }
        topicQuestions.forEach(question => {
          if (!topic_questions[topicGroup].includes(question)) {
            topic_questions[topicGroup].push(question)
          }
        });
      }

      dispatch({
        type: MENTOR_TOPIC_QUESTIONS_LOADED,
        id: mentor_id,
        topic_questions: topic_questions
      })
    }
  })
}

export const selectMentor = mentor_id => (dispatch) => {
  dispatch(onInput())
  dispatch({
    type: MENTOR_SELECTED,
    id: mentor_id,
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

export const sendQuestion = question => async (dispatch, getState) => {
  dispatch(onInput())
  dispatch(onQuestionSent(question))

  const state = getState()
  const mentor_ids = Object.keys(state.mentors_by_id)
  const responses = []

  // Get responses from the panel of mentors	
  for (let i = 0; i < mentor_ids.length; i++) {
    const id = mentor_ids[i]
    try {
      const response = await queryMentor(id, question)
      responses.push(response)
      dispatch(onQuestionAnswered(response))
      console.log(response)
    }
    catch (err) {
      dispatch(onQuestionError(id, question))
      console.error(err)
    }
  }

  if (responses.length === 0) {
    return
  }

  // Play favored mentor if an answer exists
  if (state.faved_mentor) {
    const fave_response = responses.find(response => { return response.id === state.faved_mentor })
    if (!fave_response.is_off_topic) {
      dispatch(selectMentor(state.faved_mentor))
      return
    }
  }

  // Otherwise play mentor with highest confidence answer
  responses.sort((a, b) => (a.confidence > b.confidence) ? -1 : 1)
  if (responses[0].is_off_topic) {
    dispatch(selectMentor(state.faved_mentor ? state.faved_mentor : state.current_mentor))
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
  });
  responses.sort((a, b) => (a.confidence > b.confidence) ? -1 : 1)

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

export const onInput = () => (dispatch) => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  dispatch(nextMentor(''))
}

const onQuestionSent = question => ({
  type: QUESTION_SENT,
  question: question
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

const nextMentor = (id) => ({
  type: MENTOR_NEXT,
  mentor: id,
})