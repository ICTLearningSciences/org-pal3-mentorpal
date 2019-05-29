
export const SET_MENTOR = 'SET_MENTOR'
export const SET_MENTORS = 'SET_MENTORS'
export const SET_IDLE = 'SET_IDLE'

export const setMentor = mentor => ({
  type: SET_MENTOR,
  mentor
})

export const setMentors = mentors => ({
  type: SET_MENTORS,
  mentors
})

export const setIdle = () => ({
  type: SET_IDLE,
})