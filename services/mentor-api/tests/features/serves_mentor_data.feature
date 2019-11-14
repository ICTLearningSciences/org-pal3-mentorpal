Feature: Serves mentor data

  Scenario Outline: request data file for a mentor
    Given a request url http://localhost:5000/mentor-api/mentors/<mentor>/data/<data_file>
      When the request sends GET
      Then the response status is OK
  
  Examples: Queries
    | mentor    | data_file                           |
    | clint     | topics.csv                          |
    | clint     | classifier_data.csv                 |