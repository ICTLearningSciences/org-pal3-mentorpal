import {
  SET_CURRENT_MENTOR,
  SET_MENTOR_RESPONSE,
  SET_IDLE,
  SET_LOADING,
} from './actions'

const initialState = {
  cur_mentor: 'clint',  // id of selected mentor
  mentors: {},

  isIdle: false,
  isLoading: false,
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
    case SET_LOADING:
      return {
        ...state,
        isLoading: action.isLoading
      }
    default:
      return state
  }
};

export default (state = initialState, action) => {
  return reducer(state, action)
}