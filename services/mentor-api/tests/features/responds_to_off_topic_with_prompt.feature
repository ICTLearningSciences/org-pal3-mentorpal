Feature: Mentors responds to off-topic question with a prompt

  Scenario Outline: mentors responds to off-topic question with a prompt
    Given a request url http://localhost:5000/mentor-api/questions
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
                  "query": {"type": "string"},
                  "classifier": {"type": "string"}
              },
              "required": ["answer_id", "query", "mentor", "classifier"]
            }
            """
        And the response json at $.mentor is equal to "<mentor>"
        And the response json at $.query is equal to "<query>"
        And the response json at $.answer_id matches "<answer_id_regex>"
        And the response json at $.classifier matches "^[a-zA-Z0-9\-_/]+$"
        
  # for now listing all the PROMPT answers in the regex'es below. Could alternatively test that the answer just isn't garbage, e.g clintanderson_u*
  Examples: Queries
    | mentor    | query                                   | answer_id_regex |
    | clint     | do you like cookies                     | (clintanderson_U4[6-9]_5_1\|clintanderson_U5[01]_5_1\|clintanderson_U7[678]_6_1\|clintanderson_U82_7_1) |
