Feature: Root endpoint for a mentor serves profile data

  Scenario Outline: request data for a mentor
    Given a request url http://localhost:5000/mentor-api/mentors/<mentor>
        And request parameters
          | param     | value         |
          | mentor    | <mentor>      |
      When the request sends GET
      Then the response status is OK
        And the response json matches
            """
            {
              "type": "object",
              "properties": {
                  "name": {"type": "string"},
                  "short_name": {"type": "string"},
                  "title": {"type":"string"},
                  "intro_id": {"type": "string"},
                  "intro_text": {"type": "string"}
              },
              "required": ["name", "short_name", "title", "intro_id", "intro_text"]
            }
            """
        And the response json at $.name is equal to "<name>"
        And the response json at $.short_name is equal to "<short_name>"
        And the response json at $.title is equal to "<title>"
        And the response json at $.intro_id is equal to "<intro_id>"
        And the response json at $.intro_text starts with "<intro_text>"

  Examples: Queries
    | mentor    | name                  | short_name    | title                                     | intro_id              | intro_text                                                    |
    | clint     | Clinton Anderson      | Clint         | Nuclear Electrician's Mate                | clintanderson_U1_1_1  | My name is EMC Clint Anderson. I was bo                       |