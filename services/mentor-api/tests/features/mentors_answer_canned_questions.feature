Feature: Mentors answer canned questions

  Scenario Outline: query to a mentor receives ideal response
    Given a request url http://localhost:5000/mentor-api/questions
        And request parameters
          | param                          | value         |
          | query                          | <query>       |
          | mentor                         | <mentor>      |
          | canned_question_match_disabled | <canned_question_match_disabled> |
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
        And the response json at $.classifier is equal to "lstm_v1/2019-06-13-1900"
  
  Examples: Queries
    | mentor    | query                                                   | canned_question_match_disabled | answer_id                     | answer_text_start                                                                                                   |
    | clint     | were you ever bullied in high school? what did you do?  | false                          | clintanderson_A109_2_2         | When I was a kid, I used to wear these glasses, I used to be a lot                                                  |
    
    # | clint     | how is job security in the navy?                    | clintanderson_A49_1_2         | So, job security is                                         |
