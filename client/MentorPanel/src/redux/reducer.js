import {
  SET_CURRENT_MENTOR,
  SET_MENTOR_RESPONSE,
  SET_IDLE,
} from './actions'

const initialState = {
  cur_mentor: 'clint',  // id of selected mentor
  mentors: {},
  isIdle: false,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CURRENT_MENTOR:
      return {
        ...state,
        cur_mentor: action.mentor,
        isIdle: false,
      }
    case SET_MENTOR_RESPONSE:
      return {
        ...state,
        mentors: {
          ...state.mentors,
          [action.mentor.id]: action.mentor
        },
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