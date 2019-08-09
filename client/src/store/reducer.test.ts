import reducer from "./reducer";

describe("reducer", () => {
  it("should return the initial state", () => {
    expect(reducer(undefined, {})).toEqual({
      current_mentor: "", // id of selected mentor
      current_question: "", // question that was last asked
      current_topic: "", // topic to show questions for
      faved_mentor: "", // id of the preferred mentor
      isIdle: false,
      mentors_by_id: {},
      next_mentor: "", // id of the next mentor to speak after the current finishes
      questions_asked: [],
    });
  });
});
