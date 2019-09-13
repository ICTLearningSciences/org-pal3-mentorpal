import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { createStore, applyMiddleware, Store, AnyAction } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";

import { sendQuestion } from "@/store/actions";
import reducer, { initialState } from "@/store/reducer";
import { State} from "@/store/types";

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

  it("answers user questions", async () => {
    const question = "what is your name?"
    // mockAxios.onGet(`/mentor-api/mentors/${mentorId}/data`).replyOnce(200, expectedApiResponse);
    await dispatch(sendQuestion(question));
    const state = store.getState();
    expect(state.current_question).toEqual(question);
    // expect(state.mentors_by_id).toEqual({
    //   [mentorId]: expectedMentorData
    // });
  });
});
