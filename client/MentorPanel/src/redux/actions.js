
export const SET_CURRENT_MENTOR = 'SET_CURRENT_MENTOR'
export const SET_MENTOR_RESPONSE = 'SET_MENTOR_RESPONSE'
export const SET_IDLE = 'SET_IDLE'

export const setCurrentMentor = mentor => ({
  type: SET_CURRENT_MENTOR,
  mentor
})

export const setMentorResponse = mentor => ({
  type: SET_MENTOR_RESPONSE,
  mentor
})

export const setIdle = () => ({
  type: SET_IDLE,
})