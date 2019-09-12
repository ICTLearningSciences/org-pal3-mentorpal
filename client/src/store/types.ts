export const MENTOR_SELECTED = "MENTOR_SELECTED"; // mentor video was selected
export const MENTOR_DATA = "MENTOR_SELECTED"; // mentor video was selected

export interface MentorSelection {
  id: string;
}
export interface MentorSelectedAction {
  type: typeof MENTOR_SELECTED;
  payload: MentorSelection;
}

export enum MentorQuestionStatus {
  NONE = "NONE",
  ANSWERED = "ANSWERED",
  ERROR = "ERROR",
  READY = "READY",
}

export const MENTOR_DATA_REQUEST = "MENTOR_DATA_REQUEST";
export const MENTOR_DATA_REQUESTED = "MENTOR_DATA_REQUESTED";
export const MENTOR_DATA_RESULT = "MENTOR_DATA_RESULT";

export enum ResultStatus {
  NONE = "NONE",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

export interface MentorApiData {
  id: string;
  name: string;
  questions_by_id: {
    [question_id: string]: {
      question_text: string;
    };
  };
  short_name: string;
  title: string;
  topics_by_id: {
    [topic_id: string]: {
      name: string;
      questions: string[];
    };
  };
  utterances_by_type: {
    [utterance_type: string]: string[][];
  };
}

// TODO: transient properties--answer_id, and status should NOT be part of MentorData
export interface MentorData {
  answer_id?: string; // move elsewhere
  answer_text?: string;// move elsewhere
  confidence?: number;// move elsewhere
  id: string;
  name: string;
  questions_by_id: {
    [question_id: string]: {
      question_text: string;
    };
  };
  short_name: string;
  status: MentorQuestionStatus; // move elsewhere
  title: string;
  topics_by_id: {
    [topic_id: string]: {
      name: string;
      questions: string[];
    };
  };
  topic_questions: {
    [topic_id: string]: string[];
  };
  utterances_by_type: {
    [utterance_type: string]: string[][];
  };
}

export interface MentorDataResult {
  data: MentorData | undefined;
  status: ResultStatus;
}

export interface MentorDataRequestAction {
  type: typeof MENTOR_DATA_REQUEST;
  payload: string;
}

export interface MentorDataResultAction {
  type: typeof MENTOR_DATA_RESULT;
  payload: MentorDataResult;
}

export interface MentorDataRequestedAction {
  type: typeof MENTOR_DATA_REQUESTED;
}

export interface State {
  current_mentor: string; // id of selected mentor
  current_question: string; // question that was last asked
  current_topic: string; // topic to show questions for
  faved_mentor: string; // id of the preferred mentor
  isIdle: boolean;
  mentors_by_id: {
    [mentor_id: string]: MentorData;
  };
  next_mentor: string; // id of the next mentor to speak after the current finishes
  questions_asked: string[];
}
