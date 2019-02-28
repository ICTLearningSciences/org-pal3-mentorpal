Feature: Mentors answer questions

  Scenario Outline: query to a mentor receives ideal response
    Given a request url http://localhost:5000/questions
        And request parameters
          | param     | value         |
          | query     | <query>       |
          | mentor    | <mentor>      |
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
                  "query": {"type": "string"}
              },
              "required": ["answer_id", "query", "mentor"]
            }
            """
        And the response json at $.mentor is equal to "<mentor>"
        And the response json at $.query is equal to "<query>"
        And the response json at $.answer_id is equal to "<answer_id>"
        And the response json at $.answer_text starts with "<answer_text_start>"
  
  Examples: Queries
    | mentor    | query                                               | answer_id                     | answer_text_start                                           |
    | clint     | why did you join the navy?                          | clintanderson_A131_3_1        | For me particularly, I chose the Navy as a career because   |
    | clint     | how is job security in the navy?                    | clintanderson_A49_1_2         | So, job security is                                         |
            