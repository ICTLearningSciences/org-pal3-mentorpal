Feature: Mentors answer questions

  Scenario Outline: query to a mentor receives ideal response
    Given a request url http://localhost:5000/mentor-api/questions
        And request parameters
          | param                          | value         |
          | query                          | <query>       |
          | mentor                         | <mentor>      |
          | canned_question_match_disabled | true          |
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
    | mentor    | query                                               | answer_id                      | answer_text_start                                                                                                   |
    | clint     | why did you join the navy                           | clintanderson_A131_3_1         | For me particularly, I chose the Navy as a career because                                                           |
    | clint     | do you get to go out and have fun                   | clintanderson_A242_4_2         | I've had a lot of cool experiences in the Navy                                                                      |
    | clint     | is the food in the navy good                        | clintanderson_A141_3_1         | The food in the military                                                                                            |
    | clint     | is the navy safe                                    | clintanderson_A227_4_2         | In the Navy, you're exposed to some type of danger                                                                  |
    | clint     | how is dating scene                                 | clintanderson_A136_3_1         | Right now, I'm pretty single                                                                                        |
    | clint     | have you visited many countries                     | clintanderson_A40_1_2          | So, when you are on deployment, you can have these things called 'Port Calls', which is where you go to the country |
