/* eslint-disable */
import { actions as cmi5Actions } from "redux-cmi5";
import { ActionCreator, AnyAction, Dispatch } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";

import { fetchMentorData, MentorApiData, queryMentor } from "@/api/api";

import {
  MentorDataResult,
  MentorQuestionStatus,
  MentorSelection,
  QuestionResult,
  ResultStatus,
  MentorData,
  State,
} from "./types";

const RESPONSE_CUTOFF = -100;

export const ANSWER_FINISHED = "ANSWER_FINISHED"; // mentor video has finished playing
export const MENTOR_DATA_REQUESTED = "MENTOR_DATA_REQUESTED";
export const MENTOR_DATA_RESULT = "MENTOR_DATA_RESULT";
export const MENTOR_FAVED = "MENTOR_FAVED"; // mentor was favorited
export const MENTOR_NEXT = "MENTOR_NEXT"; // set next mentor to play after current
export const MENTOR_LOADED = "MENTOR_LOADED"; // mentor info was loaded
export const MENTOR_SELECTED = "MENTOR_SELECTED"; // mentor video was selected
export const MENTOR_TOPIC_QUESTIONS_LOADED = "MENTOR_TOPIC_QUESTIONS_LOADED";
export const QUESTION_ANSWERED = "QUESTION_ANSWERED"; // question was answered by mentor
export const QUESTION_ERROR = "QUESTION_ERROR"; // question could not be answered by mentor
export const QUESTION_RESULT = "QUESTION_RESULT";
export const QUESTION_SENT = "QUESTION_SENT"; // question input was sent
export const TOPIC_SELECTED = "TOPIC_SELECTED";

export interface MentorDataRequestedAction {
  type: typeof MENTOR_DATA_REQUESTED;
  payload: string[];
}

export interface MentorDataResultAction {
  type: typeof MENTOR_DATA_RESULT;
  payload: MentorDataResult;
}

export interface MentorSelectedAction {
  type: typeof MENTOR_SELECTED;
  payload: MentorSelection;
}

export interface QuestionResultAction {
  type: typeof QUESTION_RESULT;
  payload: QuestionResult;
}

export interface QuestionSentAction {
  type: typeof QUESTION_SENT;
  question: string;
}

export interface NextMentorAction {
  type: typeof MENTOR_NEXT;
  mentor: string;
}

export const MENTOR_SELECTION_TRIGGER_AUTO = "auto";
export const MENTOR_SELECTION_TRIGGER_USER = "user";

function findIntro(mentorData: MentorApiData): string {
  try {
    return mentorData.utterances_by_type._INTRO_[0][0];
  } catch (err) {
    console.error("no _INTRO_ in mentor data: ", mentorData);
  }
  const allIds = Object.getOwnPropertyNames(mentorData.questions_by_id);
  if (allIds.length > 0) {
    return allIds[0];
  }
  return "intro";
}

export const loadMentor: ActionCreator<
  ThunkAction<
    Promise<MentorDataResultAction>, // The type of the last action to be dispatched - will always be promise<T> for async actions
    MentorDataResult, // The type for the data within the last action
    string, // The type of the parameter for the nested function
    MentorDataResultAction // The type of the last action to be dispatched
  >
> = (
  mentorId: string,
  {
    recommendedQuestionsCsv = undefined,
  }: {
    recommendedQuestionsCsv?: string | undefined;
  } = {}
) => async (dispatch: Dispatch) => {
  try {
    // const mentorList:string[] = typeof(mentors) === 'string'? mentors.split(',').map(m => m.trim()): mentors as string[]
    dispatch<MentorDataRequestedAction>({
      type: MENTOR_DATA_REQUESTED,
      payload: [mentorId]
    })
    const result = await fetchMentorData(mentorId);
    if (result.status == 200) {
      const apiData = result.data;
      const mentorData: MentorData = {
        ...apiData,
        answer_id: findIntro(apiData),
        status: MentorQuestionStatus.ANSWERED, // move this out of mentor data
        topic_questions: Object.getOwnPropertyNames(
          apiData.topics_by_id
        ).reduce<{ [typeName: string]: string[] }>((topicQs, topicId) => {
          const topicData = apiData.topics_by_id[topicId];
          topicQs[topicData.name] = topicData.questions.map(
            t => apiData.questions_by_id[t].question_text
          );
          return topicQs;
        }, {}),
      };
      return dispatch<MentorDataResultAction>({
        type: MENTOR_DATA_RESULT,
        payload: {
          data: mentorData,
          status: ResultStatus.SUCCEEDED,
        },
      });
    }
    return dispatch<MentorDataResultAction>({
      type: MENTOR_DATA_RESULT,
      payload: {
        data: undefined,
        status: ResultStatus.FAILED,
      },
    });
  } catch (err) {
    console.error(`Failed to load mentor data for id ${mentorId}`, err);
    return dispatch<MentorDataResultAction>({
      type: MENTOR_DATA_RESULT,
      payload: {
        data: undefined,
        status: ResultStatus.FAILED,
      },
    });
  }
};

const { sendStatement: sendXapiStatement } = cmi5Actions;

// export const mentorAnswerPlaybackStarted = answer => (
//   dispatch: ThunkDispatch<State, void, AnyAction>,
//   getState: () => State
// ) => {
//   dispatch(
//     sendXapiStatement({
//       verb: "https://mentorpal.org/xapi/verb/answer-playback-started",
//       result: {
//         extensions: {
//           "https://mentorpal.org/xapi/activity/extensions/mentor-response": {
//             ...answer,
//             // question: answer.question,
//             question_index: currentQuestionIndex(getState()),
//             mentor: answer.id,
//           },
//         },
//       },
//       contextExtensions: sessionStateExt(getState()),
//     })
//   );
// };

export const selectMentor = (mentor: string) => (
  dispatch: ThunkDispatch<State, void, AnyAction>
) => {
  dispatch(onInput());
  dispatch({
    payload: {
      id: mentor,
    },
    type: MENTOR_SELECTED,
  });
};

export const selectTopic = (topic: any) => ({
  topic,
  type: TOPIC_SELECTED,
});

export const faveMentor = (mentor_id: any) => ({
  id: mentor_id,
  type: MENTOR_FAVED,
});

const currentQuestionIndex = (state: { questions_asked: { length: any } }) =>
  Array.isArray(state.questions_asked) ? state.questions_asked.length : -1;

const xapiSessionState = (state: {
  current_mentor: any;
  faved_mentor: any;
  mentors_by_id: string;
  next_mentor: any;
  current_question: any;
  questions_asked: any;
  current_topic: any;
}) => {
  return {
    mentor_current: state.current_mentor,
    mentor_faved: state.faved_mentor,
    mentor_list:
      state.mentors_by_id && typeof (state.mentors_by_id === "object")
        ? Object.getOwnPropertyNames(state.mentors_by_id).sort()
        : [],
    mentor_next: state.next_mentor,
    question_current: state.current_question,
    question_index: currentQuestionIndex(state),
    questions_asked: state.questions_asked,
    topic_current: state.current_topic,
  };
};

const sessionStateExt = (state: any, ext: any = undefined) => {
  return {
    ...(ext || {}),
    "https://mentorpal.org/xapi/context/extensions/session-state": xapiSessionState(
      state
    ),
  };
};

interface QuestionResponse {
  answer_id: string;
  answer_text: string;
  classifier: string;
  confidence: number;
  id: string;
  is_off_topic: boolean;
  question: string;
  status: MentorQuestionStatus;
}

// export const sendQuestion2: ActionCreator<
//   ThunkAction<
//     Promise<QuestionResultAction>, // The type of the last action to be dispatched - will always be promise<T> for async actions
//     State, // The type for the data within the last action
//     string, // The type of the parameter for the nested function
//     QuestionResultAction // The type of the last action to be dispatched
//   >
// > = (question: string) => async (
//   dispatch: ThunkDispatch<State, void, AnyAction>,
//   getState: () => State
// ) => {
//   try {
//     dispatch(onInput());
//     dispatch(onQuestionSent(question));
//     return dispatch<QuestionResultAction>({
//       type: QUESTION_RESULT,
//       payload: {
//         status: ResultStatus.SUCCEEDED,
//       },
//     });
//   } catch (err) {
//     console.error(`Failed to get response for question ${question}`, err);
//     return dispatch<QuestionResultAction>({
//       type: QUESTION_RESULT,
//       payload: {
//         status: ResultStatus.FAILED,
//       },
//     });
//   }
// };

export const sendQuestion = (question: any) => async (
  dispatch: ThunkDispatch<State, void, AnyAction>,
  getState: () => State
) => {
  dispatch(
    sendXapiStatement({
      contextExtensions: sessionStateExt(getState()),
      result: {
        extensions: {
          "https://mentorpal.org/xapi/activity/extensions/actor-question": {
            question_index: currentQuestionIndex(getState()) + 1,
            text: question,
          },
        },
      },
      verb: "https://mentorpal.org/xapi/verb/asked",
    })
  );
  dispatch(onInput());
  dispatch(onQuestionSent(question));

  const state = getState();
  const mentorIds = Object.keys(state.mentors_by_id);
  const tick = Date.now();
  // query all the mentors without waiting for the answers one by one
  const promises = mentorIds.map(mentor => {
    return new Promise<QuestionResponse>((resolve, reject) => {
      queryMentor(mentor, question)
        .then(r => {
          const { data } = r;
          const response = {
            id: mentor,
            question: question,
            answer_id: data.answer_id,
            answer_text: data.answer_text,
            confidence: data.confidence,
            is_off_topic: data.confidence <= RESPONSE_CUTOFF,
            classifier: data.classifier,
            status: MentorQuestionStatus.ANSWERED,
          };
          dispatch(
            sendXapiStatement({
              contextExtensions: sessionStateExt(getState()),
              result: {
                extensions: {
                  "https://mentorpal.org/xapi/activity/extensions/mentor-response": {
                    ...response,
                    question,
                    question_index: currentQuestionIndex(getState()),
                    mentor,
                    response_time: Date.now() - tick,
                  },
                },
              },
              verb: "https://mentorpal.org/xapi/verb/answered",
            })
          );
          dispatch(onQuestionAnswered(response));
          resolve(response);
        })
        .catch((err: any) => {
          dispatch(onQuestionError(mentor, question));
          reject(err);
        });
    });
  });

  // ...but still don't move forward till we have all the answers,
  // because we will prefer the user's fav and then highest confidence
  const responses = (await Promise.all(
    promises.map(p => p.catch(e => e))
  )).filter(r => !(r instanceof Error));

  if (responses.length === 0) {
    return;
  }

  // Play favored mentor if an answer exists
  if (state.faved_mentor) {
    const fave_response = responses.find(response => {
      return response.id === state.faved_mentor;
    });
    if (!fave_response.is_off_topic) {
      dispatch(selectMentor(state.faved_mentor));
      return;
    }
  }

  // Otherwise play mentor with highest confidence answer
  responses.sort((a, b) => (a.confidence > b.confidence ? -1 : 1));
  if (responses[0].is_off_topic) {
    dispatch(
      selectMentor(
        state.faved_mentor ? state.faved_mentor : state.current_mentor
      )
    );
    return;
  }
  dispatch(selectMentor(responses[0].id));
};

const NEXT_MENTOR_DELAY = 3000;
let timer: NodeJS.Timer | null;
export const answerFinished = () => (
  dispatch: ThunkDispatch<State, void, AnyAction>,
  getState: () => State
) => {
  dispatch(onIdle());

  // order mentors by highest answer confidence
  const state = getState();
  const mentors = state.mentors_by_id;
  const responses: {
    confidence: number;
    id: string;
    is_off_topic: boolean;
    status: MentorQuestionStatus;
  }[] = [];
  Object.keys(mentors).forEach(id => {
    responses.push({
      confidence: mentors[id].confidence || -1.0,
      id: mentors[id].id,
      is_off_topic: mentors[id].is_off_topic || false,
      status: mentors[id].status,
    });
  });
  responses.sort((a, b) => (a.confidence > b.confidence ? -1 : 1));

  // get the most confident answer that has not been given
  const next_mentor = responses.find(response => {
    return (
      response.status === MentorQuestionStatus.READY && !response.is_off_topic
    );
  });

  // set the next mentor to start playing, if there is one
  if (!next_mentor) {
    return;
  }
  dispatch(nextMentor(next_mentor.id));

  // play the next mentor after the timeout
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  timer = setTimeout(() => {
    dispatch(selectMentor(next_mentor.id));
  }, NEXT_MENTOR_DELAY);
};

export const onInput: ActionCreator<
  ThunkAction<AnyAction, State, void, NextMentorAction>
> = () => (dispatch: Dispatch) => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return dispatch(nextMentor(""));
};

const onQuestionSent = (question: string): QuestionSentAction => ({
  question,
  type: QUESTION_SENT,
});

const onQuestionAnswered = (response: any) => ({
  mentor: response,
  type: QUESTION_ANSWERED,
});

const onQuestionError = (id: string, question: string) => ({
  mentor: id,
  question,
  type: QUESTION_ERROR,
});

const onIdle = () => ({
  type: ANSWER_FINISHED,
});

const nextMentor = (id: string): NextMentorAction => ({
  mentor: id,
  type: MENTOR_NEXT,
});
