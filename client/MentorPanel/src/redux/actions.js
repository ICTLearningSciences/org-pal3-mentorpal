import { queryMentor } from '../api/api'

export const MENTOR_SELECTED = 'MENTOR_SELECTED'
export const MENTOR_LOADED = 'MENTOR_LOADED'
export const QUESTION_SENT = 'QUESTION_SENT'
export const QUESTION_ANSWERED = 'QUESTION_ANSWERED'
export const QUESTION_ERROR = 'QUESTION_ERROR'
export const IDLE = 'IDLE'

export const onMentorLoaded = mentor => ({
  type: MENTOR_LOADED,
  mentor: mentor,
})

export const selectMentor = mentor_id => ({
  type: MENTOR_SELECTED,
  id: mentor_id,
})

export const sendQuestion = question => (dispatch, getState) => {
  const state = getState()
  dispatch(onQuestionSent(question))
  Object.keys(state.mentors_by_id).forEach(mentor_id => {
    queryMentor(mentor_id, question)
      .then(function (response) {
        console.log(response)
        dispatch(onQuestionAnswered(response))
      })
      .catch(err => {
        console.error(err)
        dispatch(onQuestionError(mentor_id, question))
      })
  })
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