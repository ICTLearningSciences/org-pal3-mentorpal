import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { createStore, applyMiddleware, Store, AnyAction } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";

import { loadMentor } from "@/store/actions";
import reducer, { initialState } from "@/store/reducer";
import { State, MentorData, MentorQuestionStatus} from "@/store/types";

// This sets the mock adapter on the default instance
const mockAxios = new MockAdapter(axios);

describe("load mentor data", () => {
  let store: Store<State, AnyAction>;
  let dispatch: ThunkDispatch<{}, {}, any>;

  beforeEach(() => {
    store = createStore(reducer, initialState, applyMiddleware(thunk));
    dispatch = store.dispatch;
  });

  afterEach(() => {
    mockAxios.reset();
  });

  it("loads all data for a mentor in a single action and api request", async () => {
    const mentorId = "mentor_123"
    const expectedApiResponse = {
      id: mentorId,
      name: "Mentor Number 1",
      questions_by_id: {
        mentor_01_a1_1_1: {
          question_text: "Who are you and what do you do?",
        },
      },
      short_name: "M1",
      title: "First Example Mentor",
      topics_by_id: {
        about_me: { name: "About Me", questions: ["mentor_01_a1_1_1"] },
      },
      utterances_by_type: {
        _IDLE_: [["idle_456", ""]],
        _INTRO_: [["intro_1234", "hi there!"]],
        _OFF_TOPIC_: [["off_topic", "I don't know"]],
        _PROMPT_: [["prompt", "ask me about my job"]],
        _FEEDBACK_: [["feedback", "no"]],
        _REPEAT_: [["repeat", "you already asked that!"]],
        _REPEAT_BUMP_: [["repeat_bump", "you asked that, how about this?"]],
        _PROFANITY_: [["profanity", "watch your mouth!"]],
      },
    }
    const expectedMentorData : MentorData = {
      ...expectedApiResponse,
      answer_id: "intro_1234",
      status: MentorQuestionStatus.ANSWERED, // this is how the app currently behaves...why???
      topic_questions: {
        'About Me': ["Who are you and what do you do?"]
      },
    }
    mockAxios.onGet(`/mentor-api/mentors/${mentorId}/data`).replyOnce(200, expectedApiResponse);
    await dispatch(loadMentor(mentorId));
    const state = store.getState();
    expect(state.mentors_by_id).toEqual({
      [mentorId]: expectedMentorData
    });
  });
});
