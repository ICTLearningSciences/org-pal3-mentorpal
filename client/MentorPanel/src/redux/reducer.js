import {
  SET_MENTOR,
  SET_MENTORS,
  SET_IDLE,
} from './actions'

const initialState = {
  mentor: 'clint',  // id of selected mentor
  mentors: [],
  isIdle: false,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_MENTORS:
      return {
        ...state,
        mentors: action.mentors,
      }
    case SET_MENTOR:
      return {
        ...state,
        mentor: action.mentor,
        isIdle: false,
      }
    case SET_IDLE:
      return {
        ...state,
        isIdle: true,
      }
    default:
      return state
  }
};

export default (state = initialState, action) => {
  return reducer(state, action)
}