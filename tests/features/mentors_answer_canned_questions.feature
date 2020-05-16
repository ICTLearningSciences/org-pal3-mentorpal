Feature: Mentors answer canned questions

  Scenario Outline: query to a mentor receives ideal response
    Given a request url http://localhost:8080/mentor-api/questions/
        And request parameters
          | param                          | value         |
          | query                          | <query>       |
          | mentor                         | <mentor>      |
          | canned_question_match_disabled | false         |
      When the request sends GET
      Then the response status is OK
        And the response json matches
            """
            {
              "title": "MentorQueryResponse",
              "type": "object",
              "properties": {
                  "answer_id": {"type": "string"},
                  "answer_text": {"type": "string"},
                  "mentor": {"type":"string"},
                  "query": {"type": "string"},
                  "classifier": {"type": "string"}
              },
              "required": ["answer_id", "query", "mentor", "classifier"]
            }
            """
        And the response json at $.mentor is equal to "<mentor>"
        And the response json at $.query is equal to "<query>"
        And the response json at $.answer_id is equal to "<answer_id>"
        And the response json at $.answer_text starts with "<answer_text_start>"
        And the response json at $.classifier matches "^[a-zA-Z0-9\-_/]+$"
  
  Examples: Queries
    | mentor            | query                                                   | answer_id                     | answer_text_start                                                                                                   |
    | lcdr-barnhl       | how do you keep stress from boiling over?               | s001p003s00245460e00253800    | stress on the job as a naval officer                                                                                        |
    | dan-burns         | what are the most important first steps?                | s001p006s00161040e00191100    | So what is critical to review                                                                                       |
    | dan-burns         | how do you set the tone?                                | s001p008s00024743e00060433    | my time is a junior. Also, how I lead by example                                                                    |
    | dan-burns         | what are the most common mistakes?                      | s001p014s00082013e00101227    | So I would like to say that way are in                                                                              |
    | dan-burns         | what problems can be rooted out early?                  | s001p015s00270267e00304387    | There's so, so common crimes                                                                                        |
    | clint             | were you ever bullied in high school? what did you do?  | clintanderson_A109_2_2        | When I was a kid, I used to wear these glasses, I used to be a lot                                                  |
    