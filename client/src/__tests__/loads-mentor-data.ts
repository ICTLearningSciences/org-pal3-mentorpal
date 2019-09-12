import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { createStore, applyMiddleware, Store, AnyAction } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";

import { loadMentor2 as loadMentor } from "@/store/actions";
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
      status: MentorQuestionStatus.ANSWERED, // this is how the app currently behaves...why???
      title: "First Example Mentor",
      topics_by_id: {
        about_me: { name: "About Me", questions: ["mentor_01_a1_1_1"] },
      },
      utterances_by_type: {
        _INTRO_: ["idle"],
        _OFF_TOPIC_: ["off_topic"],
        _PROMPT_: ["prompt"],
        _FEEDBACK_: ["feedback"],
        _REPEAT_: ["repeat"],
        _REPEAT_BUMP_: ["repeat_bump"],
        _PROFANITY_: ["profanity"],
      },
    }
    const expectedMentorData : MentorData = {
      ...expectedApiResponse,
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
