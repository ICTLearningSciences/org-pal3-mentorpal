import Papa from 'papaparse'

import { topicsUrl, questionsUrl, queryMentor } from 'src/api/api'
import { STATUS_READY } from 'src/redux/store'

export const MENTOR_LOADED = 'MENTOR_LOADED'          // mentor info was loaded
export const MENTOR_SELECTED = 'MENTOR_SELECTED'      // mentor video was selected
export const MENTOR_FAVED = 'MENTOR_FAVED'            // mentor was favorited
export const MENTOR_NEXT = 'MENTOR_NEXT'              // set next mentor to play after current
export const MENTOR_TOPIC_QUESTIONS_LOADED = 'MENTOR_TOPIC_QUESTIONS_LOADED'
export const TOPIC_SELECTED = 'TOPIC_SELECTED'

export const QUESTION_SENT = 'QUESTION_SENT'          // question input was sent
export const QUESTION_ANSWERED = 'QUESTION_ANSWERED'  // question was answered by mentor
export const QUESTION_ERROR = 'QUESTION_ERROR'        // question could not be answered by mentor
export const ANSWER_FINISHED = 'ANSWER_FINISHED'      // mentor video has finished playing

export const loadMentor = mentor => (dispatch) => {
  dispatch({
    type: MENTOR_LOADED,
    mentor: mentor,
  })
}

export const loadQuestions = (mentor_id, recommended) => async (dispatch) => {
  const questions_url = questionsUrl(mentor_id)

  try {
    const results = await papaParseAsync(questions_url)
    const questions = results.data.reduce((questions, data) => {
      const topics = data[0].split(', ')
      const question = data[3]

      topics.forEach(topic => {
        questions[topic] = questions[topic] || []
        if (!questions[topic].includes(question)) {
          questions[topic].push(question)
        }
      });
      return questions
    }, {})

    dispatch(loadTopics(mentor_id, questions, recommended))
  }
  catch (err) {
    console.error(err)
  }
}

const loadTopics = (mentor_id, questions, recommended) => async (dispatch) => {
  const topics_url = topicsUrl(mentor_id)
  const init = recommended ? { 'Recommended': Array.isArray(recommended) ? recommended : [recommended], 'History': [] } : { 'History': [] }

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
      topic_questions[topicGroup] = topic_questions[topicGroup].concat(topicQuestions)
      topic_questions[topicGroup] = Array.from(new Set(topic_questions[topicGroup]))
      return topic_questions
    }, init)

    dispatch({
      type: MENTOR_TOPIC_QUESTIONS_LOADED,
      id: mentor_id,
      topic_questions: topic_questions
    })
  }
  catch (err) {
    console.error(err)
  }
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

const papaParseAsync = (url) => {
  return new Promise(function (complete, error) {
    Papa.parse(url, { download: true, complete, error });
  });
}