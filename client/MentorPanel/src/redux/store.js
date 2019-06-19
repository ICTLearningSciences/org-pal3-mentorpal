import {
  MENTOR_LOADED,
  MENTOR_SELECTED,
  MENTOR_FAVED,
  MENTOR_NEXT,
  MENTOR_TOPIC_QUESTIONS_LOADED,
  TOPIC_SELECTED,
  QUESTION_SENT,
  QUESTION_ANSWERED,
  QUESTION_ERROR,
  ANSWER_FINISHED,
} from 'src/redux/actions'
import { normalizeString } from 'src/funcs/funcs'

export const STATUS_READY = 'READY'
export const STATUS_ANSWERED = 'ANSWERED'
export const STATUS_ERROR = 'ERROR'

/**
 * mentor: {
 *  id
 *  name
 *  short_name
 *  title
 *  topic_questions

 *  question
 *  answer_id
 *  answer_text
 *  confidence
 *  is_off_topic
 *  status: READY | ANSWERED | ERROR
 * }
 */

const initialState = {
  current_mentor: '',       // id of selected mentor
  current_question: '',     // question that was last asked
  current_topic: '',        // topic to show questions for
  faved_mentor: '',         // id of the preferred mentor
  next_mentor: '',          // id of the next mentor to speak after the current finishes
  mentors_by_id: {},
  questions_asked: [],
  isIdle: false,
};

const store = (state = initialState, action) => {
  switch (action.type) {

    case MENTOR_LOADED:
      return {
        ...state,
        mentors_by_id: {
          ...state.mentors_by_id,
          [action.mentor.id]: {
            ...action.mentor,
            status: STATUS_READY,
          }
        },
        isIdle: false,
      }

    case MENTOR_SELECTED:
      return {
        ...state,
        current_mentor: action.id,
        mentors_by_id: {
          ...state.mentors_by_id,
          [action.id]: {
            ...state.mentors_by_id[action.id],
            status: STATUS_ANSWERED,
          }
        },
        isIdle: false,
      }

    case MENTOR_FAVED:
      return {
        ...state,
        faved_mentor: state.faved_mentor === action.id ? '' : action.id
      }

    case MENTOR_NEXT:
      return {
        ...state,
        next_mentor: action.mentor,
      }

    case MENTOR_TOPIC_QUESTIONS_LOADED:
      return {
        ...state,
        mentors_by_id: {
          ...state.mentors_by_id,
          [action.id]: {
            ...state.mentors_by_id[action.id],
            topic_questions: action.topic_questions
          }
        }
      }

    case QUESTION_SENT:
      return {
        ...state,
        current_question: action.question,
        questions_asked: [
          ...state.questions_asked,
          normalizeString(action.question)
        ]
      }

    case QUESTION_ANSWERED:
      const response = action.mentor
      return {
        ...state,
        mentors_by_id: {
          ...state.mentors_by_id,
          [response.id]: {
            ...state.mentors_by_id[response.id],
            question: response.question,
            answer_id: response.answer_id,
            answer_text: response.answer_text,
            confidence: response.confidence,
            is_off_topic: response.is_off_topic,
            status: STATUS_READY
          }
        },
        isIdle: false,
      }

    case QUESTION_ERROR:
      return {
        ...state,
        mentors_by_id: {
          ...state.mentors_by_id,
          [action.mentor]: {
            ...state.mentors_by_id[action.mentor],
            question: action.question,
            status: STATUS_ERROR,
          }
        }
      }

    case ANSWER_FINISHED:
      return {
        ...state,
        isIdle: true,
      }

    case TOPIC_SELECTED:
      return {
        ...state,
        current_topic: action.topic,
      }

    default:
      return state
  }
};

export default (state = initialState, action) => {
  return store(state, action)
}