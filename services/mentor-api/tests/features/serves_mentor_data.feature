Feature: Serves mentor data

  Scenario Outline: request data file for a mentor
    Given a request url http://localhost:5000/mentor-api/mentors/<mentor>/data/<data_file>
      When the request sends GET
      Then the response status is OK
  
  Examples: Queries
    | mentor    | data_file                           |
    | clint     | topics.csv                          |
    | clint     | questions_paraphrases_answers.csv   |
    | clint     | classifier_data.csv                 |
    | dan       | topics.csv                          |
    | dan       | questions_paraphrases_answers.csv   |
    | dan       | classifier_data.csv                 |
    | carlos    | topics.csv                          |
    | carlos    | questions_paraphrases_answers.csv   |
    | carlos    | classifier_data.csv                 |
    | julianne  | topics.csv                          |
    | julianne  | questions_paraphrases_answers.csv   |
    | julianne  | classifier_data.csv                 |
