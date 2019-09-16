export interface MentorSelection {
  id: string;
}

export enum MentorQuestionStatus {
  NONE = "NONE",
  ANSWERED = "ANSWERED",
  ERROR = "ERROR",
  READY = "READY",
}

export enum ResultStatus {
  NONE = "NONE",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

// TODO: transient properties--answer_id, and status should NOT be part of MentorData
export interface MentorData {
  answer_id?: string; // move elsewhere, e.g. history of QuestionStatus objects
  answer_text?: string;// move elsewhere, e.g. history of QuestionStatus objects
  confidence?: number;// move elsewhere, e.g. history of QuestionStatus objects
  id: string;
  is_off_topic?: boolean; // move elsewhere, e.g. history of QuestionStatus objects
  name: string;
  questions_by_id: {
    [question_id: string]: {
      question_text: string;
    };
  };
  short_name: string;
  status: MentorQuestionStatus; // move elsewhere, e.g. history of QuestionStatus objects
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

export interface QuestionResult {
  status: ResultStatus;
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
