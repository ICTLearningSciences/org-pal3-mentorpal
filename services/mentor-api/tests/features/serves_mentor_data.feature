Feature: Serves mentor data

  Scenario Outline: request data file for a mentor
    Given a request url http://localhost:5000/mentor-api/mentors/<mentor>/data/<data_file>
      When the request sends GET
      Then the response status is OK
  
  Examples: Queries
    | mentor    | data_file                           |
    | clint     | topics.csv                          |
    | clint     | Questions_Paraphrases_Answers.csv   |
    | clint     | classifier_data.csv                 |
    | dan       | topics.csv                          |
    | dan       | Questions_Paraphrases_Answers.csv   |
    | dan       | classifier_data.csv                 |
    | carlos    | topics.csv                          |
    | carlos    | Questions_Paraphrases_Answers.csv   |
    | carlos    | classifier_data.csv                 |
    | julianne  | topics.csv                          |
    | julianne  | Questions_Paraphrases_Answers.csv   |
    | julianne  | classifier_data.csv                 |
