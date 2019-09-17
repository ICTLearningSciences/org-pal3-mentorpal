import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { createStore, applyMiddleware, Store, AnyAction } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";

import { loadMentor } from "@/store/actions";
import reducer, { initialState } from "@/store/reducer";
import { State, MentorData, MentorQuestionStatus } from "@/store/types";
import { ExpectIntermediateStates, ExpectedState } from "@/test_helpers";
import { MentorApiData } from "@/api/api";

// This sets the mock adapter on the default instance
const mockAxios = new MockAdapter(axios);

describe("load mentor data", () => {
  /** the redux Store used everywhere in this test suite */
  let store: Store<State, AnyAction>;
  /** the redux-thunk Dispatch used everywhere in this test suite */
  let dispatch: ThunkDispatch<{}, {}, any>;

  /**
   * dictionary of expected mentor-api responses (by mentor id)
   * for each of the mentors used in this suite of tests
   */
  const expectedApiDataByMentorId: { [mentorId: string]: MentorApiData } = {
    mentor_123: {
      id: "mentor_123",
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
    },
  };

  const expectedMentorDataByMentorId: { [mentorId: string]: MentorData } = {
    mentor_123: {
      ...expectedApiDataByMentorId["mentor_123"],
      answer_id: "intro_1234",
      status: MentorQuestionStatus.READY,
      topic_questions: {
        "About Me": ["Who are you and what do you do?"],
      },
    },
  };

  /**
   * Creates an expect (redux-store) state for a set of mentors
   * that have been requested to load.
   * As soon as mentors are requested to load,
   * placeholder entries for each mentor should be added
   * to the store.
   * @param mentors array of mentor ids
   */
  function expectedPlaceholderStateForLoadingMentors(
    mentors: string[]
  ): ExpectedState {
    return {
      testExpectations: () => {
        const expectedState = mentors.reduce<{ [id: string]: any }>(
          (acc, curId) => {
            acc[curId] = {
              id: curId,
              status: MentorQuestionStatus.NONE,
            };
            return acc;
          },
          {}
        );
        expect(store.getState().mentors_by_id).toMatchObject(expectedState);
      },
      unmetMessage:
        "action sets up a placeholder record for all mentors immediately on request load mentors",
    };
  }

  beforeEach(() => {
    // create a clean instance of the redux store and dispatch for every test
    store = createStore(reducer, initialState, applyMiddleware(thunk));
    dispatch = store.dispatch;
  });

  afterEach(() => {
    mockAxios.reset();
  });

  it("loads all data for a mentor with a single action and api request", async () => {
    const mentorId = "mentor_123"; // id of the single mentor we're testing here
    const expectedApiResponse = expectedApiDataByMentorId[mentorId];
    const expectedMentorData = expectedMentorDataByMentorId[mentorId];
    mockAxios
      .onGet(`/mentor-api/mentors/${mentorId}/data`)
      .replyOnce(200, expectedApiResponse);
    const intermediateStates = new ExpectIntermediateStates<State>(store, [
      expectedPlaceholderStateForLoadingMentors([mentorId]),
    ]);
    intermediateStates.subscribe();
    await dispatch(loadMentor(mentorId));
    intermediateStates.testExpectations();
    const state = store.getState();
    expect(state.mentors_by_id).toEqual({
      [mentorId]: expectedMentorData,
    });
  });

  it("integrates recommended questions passed as args into mentor data", async () => {
    const mentorId = "mentor_123"; // id of the single mentor we're testing here
    const expectedApiResponse = expectedApiDataByMentorId[mentorId];
    const expectedMentorDataWithoutRecommendedQs =
      expectedMentorDataByMentorId[mentorId];
    const recommendedQuestions = ["What is your name?", "How old are you?"];
    const expectedMentorData = {
      ...expectedMentorDataWithoutRecommendedQs,
      topic_questions: {
        ...expectedMentorDataWithoutRecommendedQs.topic_questions,
        Recommended: recommendedQuestions,
      },
    };
    mockAxios
      .onGet(`/mentor-api/mentors/${mentorId}/data`)
      .replyOnce(200, expectedApiResponse);
    const intermediateStates = new ExpectIntermediateStates<State>(store, [
      expectedPlaceholderStateForLoadingMentors([mentorId]),
    ]);
    intermediateStates.subscribe();
    await dispatch(loadMentor(mentorId, { recommendedQuestions }));
    intermediateStates.testExpectations();
    const state = store.getState();
    expect(state.mentors_by_id).toEqual({
      [mentorId]: expectedMentorData,
    });
  });
});
