Feature: API handles errors gracefully

  Scenario: request for an unknown mentor receieves 404 response
    Given a request url http://localhost:5000/mentor-api/questions
        And request parameters
          | param     | value         |
          | query     | any query     |
          | mentor    | not_a_mentor  |
      When the request sends GET
      Then the response status is 404

  Scenario: request for a with no 'query' receieves 400 response
    Given a request url http://localhost:5000/mentor-api/questions
        And request parameters
          | param     | value         |
          | query     |               |
          | mentor    | clint         |
      When the request sends GET
      Then the response status is 400


  Scenario: request for a with no 'mentor' param receieves 400 response
    Given a request url http://localhost:5000/mentor-api/questions
        And request parameters
          | param     | value         |
          | query     | any query     |
          | mentor    |               |
      When the request sends GET
      Then the response status is 400
  
