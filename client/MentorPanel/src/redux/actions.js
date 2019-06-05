import { queryMentor } from '../api/api'

export const MENTOR_SELECTED = 'MENTOR_SELECTED'
export const MENTOR_LOADED = 'MENTOR_LOADED'
export const MENTOR_FAVED = 'MENTOR_FAVED'
export const QUESTION_SENT = 'QUESTION_SENT'
export const QUESTION_ANSWERED = 'QUESTION_ANSWERED'
export const QUESTION_ERROR = 'QUESTION_ERROR'
export const IDLE = 'IDLE'

export const loadMentor = mentor => ({
  type: MENTOR_LOADED,
  mentor: mentor,
})

export const selectMentor = mentor_id => ({
  type: MENTOR_SELECTED,
  id: mentor_id,
})

export const faveMentor = mentor_id => ({
  type: MENTOR_FAVED,
  id: mentor_id,
})

export const sendQuestion = question => async (dispatch, getState) => {
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
    console.error('Did not receive any answers to the question')
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

export const setIdle = () => ({
  type: IDLE,
})

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