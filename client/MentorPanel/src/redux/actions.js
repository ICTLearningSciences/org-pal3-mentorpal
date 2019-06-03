import { RESPONSE_CUTOFF } from '../api/api'

export const SET_CURRENT_MENTOR = 'SET_CURRENT_MENTOR'
export const SET_MENTOR_RESPONSE = 'SET_MENTOR_RESPONSE'
export const SET_IDLE = 'SET_IDLE'
export const SET_LOADING = 'SET_LOADING'

export const setCurrentMentor = mentor => ({
  type: SET_CURRENT_MENTOR,
  mentor
})

export const setMentorResponse = mentor => ({
  type: SET_MENTOR_RESPONSE,
  mentor
})

export const setMentorResponses = mentors => (dispatch) => {
  mentors.forEach(mentor => {
    dispatch(setMentorResponse(mentor))
  });

  const best = mentors[0]
  if (best.confidence > RESPONSE_CUTOFF) {
    dispatch(setCurrentMentor(best.id))
  }
}

export const setIdle = () => ({
  type: SET_IDLE,
})

export const setLoading = loading => ({
  type: SET_LOADING,
  isLoading: loading
})