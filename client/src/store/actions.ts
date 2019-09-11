/* eslint-disable */
import Papa from "papaparse";
import { actions as cmi5Actions } from "redux-cmi5";
import { ActionCreator, Dispatch } from "redux";
import { ThunkAction } from "redux-thunk";

import {
  fetchMentorData,
  fetchMentorData2,
  topicsUrl,
  questionsUrl,
  queryMentor,
} from "@/api/api";

import {
  MentorDataResult,
  MentorDataResultAction,
  MentorQuestionStatus,
  MENTOR_DATA_RESULT,
  ResultStatus,
} from "./types";

export const MENTOR_LOADED = "MENTOR_LOADED"; // mentor info was loaded
export const MENTOR_SELECTED = "MENTOR_SELECTED"; // mentor video was selected
export const MENTOR_FAVED = "MENTOR_FAVED"; // mentor was favorited
export const MENTOR_NEXT = "MENTOR_NEXT"; // set next mentor to play after current
export const MENTOR_TOPIC_QUESTIONS_LOADED = "MENTOR_TOPIC_QUESTIONS_LOADED";
export const TOPIC_SELECTED = "TOPIC_SELECTED";

export const QUESTION_SENT = "QUESTION_SENT"; // question input was sent
export const QUESTION_ANSWERED = "QUESTION_ANSWERED"; // question was answered by mentor
export const QUESTION_ERROR = "QUESTION_ERROR"; // question could not be answered by mentor
export const ANSWER_FINISHED = "ANSWER_FINISHED"; // mentor video has finished playing

export const MENTOR_SELECTION_TRIGGER_AUTO = "auto";
export const MENTOR_SELECTION_TRIGGER_USER = "user";

async function papaParseAsync(url: string) {
  return new Promise((complete, error) => {
    Papa.parse(url, { download: true, complete, error });
  });
}

export function loadMentor(
  mentorId: string,
  {
    recommendedQuestionsCsv = undefined,
  }: {
    recommendedQuestionsCsv: string | undefined;
  }
) {
  return async (dispatch: any) => {
    try {
      const mentorData = await fetchMentorData(mentorId);
      console.log(`loaded data for mentor ${mentorId}`, mentorData);
      dispatch({
        type: MENTOR_LOADED,
        mentor: mentorData,
      });
      dispatch(loadQuestions(mentorId, recommendedQuestionsCsv));
    } catch (err) {
      console.error(`Failed to load mentor data for id ${mentorId}`, err);
    }
  };
}

export const loadMentor2: ActionCreator<
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
    const result = await fetchMentorData2(mentorId);
    if (result.status == 200) {
      return dispatch<MentorDataResultAction>({
        type: MENTOR_DATA_RESULT,
        payload: {
          data: result.data,
          status: ResultStatus.SUCCEEDED
        },
      });
    }
    return dispatch<MentorDataResultAction>({
      type: MENTOR_DATA_RESULT,
      payload: {
        data: undefined,
        status: ResultStatus.FAILED
      },
    });
  } catch (err) {
    console.error(`Failed to load mentor data for id ${mentorId}`, err);
    return dispatch<MentorDataResultAction>({
      type: MENTOR_DATA_RESULT,
      payload: {
        data: undefined,
        status: ResultStatus.FAILED
      },
    });
  }
};

const { sendStatement: sendXapiStatement } = cmi5Actions;

export const mentorAnswerPlaybackStarted = answer => (dispatch, getState) => {
  dispatch(
    sendXapiStatement({
      verb: "https://mentorpal.org/xapi/verb/answer-playback-started",
      result: {
        extensions: {
          "https://mentorpal.org/xapi/activity/extensions/mentor-response": {
            ...answer,
            // question: answer.question,
            question_index: currentQuestionIndex(getState()),
            mentor: answer.id,
          },
        },
      },
      contextExtensions: sessionStateExt(getState()),
    })
  );
};

const loadQuestions = (mentorId: any, recommended: any) => async (
  dispatch: (arg0: (dispatch: any) => Promise<void>) => void
) => {
  const url = questionsUrl(mentorId);

  try {
    const results = (await papaParseAsync(url)) as { data: any[] };
    const questionsByTopic: string[] = results.data.reduce(
      (accQsByTopic: { [x: string]: string[] }, curTopicsAndQs: string[]) => {
        const topics = curTopicsAndQs[0].split(", ");
        const question = curTopicsAndQs[3];

        topics.forEach((topic: string | number) => {
          accQsByTopic[topic] = accQsByTopic[topic] || [];
          if (!accQsByTopic[topic].includes(question)) {
            accQsByTopic[topic].push(question);
          }
        });
        return accQsByTopic;
      },
      {}
    );

    dispatch(loadTopics(mentorId, questionsByTopic, recommended));
  } catch (err) {
    // tslint:disable-next-line: no-console
    console.error(err);
  }
};

const loadTopics = (
  mentorId: any,
  questions: { [x: string]: any },
  recommended: any
) => async (
  dispatch: (arg0: { id: any; topic_questions: any; type: string }) => void
) => {
  const topics_url = topicsUrl(mentorId);
  const init = recommended
    ? {
        Recommended: Array.isArray(recommended) ? recommended : [recommended],
        History: [],
      }
    : { History: [] };

  try {
    const results = await papaParseAsync(topics_url);
    const topic_questions = results.data.reduce(
      (
        topic_questions: { [x: string]: Iterable<unknown> | null | undefined },
        data: any[]
      ) => {
        const topicName = data[0];
        const topicGroup = data[1];
        const topicQuestions = questions[topicName];

        if (!(topicName && topicGroup && topicQuestions)) {
          return topic_questions;
        }
        topic_questions[topicGroup] = topic_questions[topicGroup] || [];
        topic_questions[topicGroup] = topic_questions[topicGroup].concat(
          topicQuestions
        );
        topic_questions[topicGroup] = Array.from(
          new Set(topic_questions[topicGroup])
        );
        return topic_questions;
      },
      init
    );

    dispatch({
      id: mentorId,
      topic_questions,
      type: MENTOR_TOPIC_QUESTIONS_LOADED,
    });
  } catch (err) {
    console.error(err);
  }
};

export const selectMentor = (mentor: string) => (dispatch: {
  (arg0: (dispatch: any) => void): void;
  (arg0: { payload: { id: string }; type: string }): void;
}) => {
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

export const sendQuestion = (question: any) => async (
  dispatch: {
    (arg0: any): void;
    (arg0: (dispatch: any) => void): void;
    (arg0: { question: any; type: string }): void;
    (arg0: any): void;
    (arg0: { mentor: any; type: string }): void;
    (arg0: { mentor: any; question: any; type: string }): void;
    (arg0: (dispatch: any) => void): void;
    (arg0: (dispatch: any) => void): void;
    (arg0: (dispatch: any) => void): void;
  },
  getState: { (): void; (): void; (): void; (): void; (): void }
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
    return new Promise((resolve, reject) => {
      queryMentor(mentor, question)
        .then((response: unknown) => {
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
let timer: NodeJS.Timer;
export const answerFinished = () => (
  dispatch: {
    (arg0: { type: string }): void;
    (arg0: { mentor: any; type: string }): void;
    (arg0: (dispatch: any) => void): void;
  },
  getState: () => void
) => {
  dispatch(onIdle());

  // order mentors by highest answer confidence
  const state = getState();
  const mentors = state.mentors_by_id;
  const responses:
    | never[]
    | { confidence: any; id: any; is_off_topic: any; status: any }[] = [];
  Object.keys(mentors).forEach(id => {
    responses.push({
      confidence: mentors[id].confidence,
      id: mentors[id].id,
      is_off_topic: mentors[id].is_off_topic,
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

export const onInput = () => (
  dispatch: (arg0: { mentor: any; type: string }) => void
) => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  dispatch(nextMentor(""));
};

const onQuestionSent = (question: any) => ({
  question,
  type: QUESTION_SENT,
});

const onQuestionAnswered = (response: any) => ({
  mentor: response,
  type: QUESTION_ANSWERED,
});

const onQuestionError = (id: string, question: any) => ({
  mentor: id,
  question,
  type: QUESTION_ERROR,
});

const onIdle = () => ({
  type: ANSWER_FINISHED,
});

const nextMentor = (id: string) => ({
  mentor: id,
  type: MENTOR_NEXT,
});
