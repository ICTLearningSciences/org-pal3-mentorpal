Feature: Serves configuration

  Scenario Outline: serves video-host
    Given a request url http://localhost:5000/config/video-host
      When the request sends GET
      Then the response status is OK
        And the response json matches
            """
            {
              "title": "VideoBHostConfigResponse",
              "type": "object",
              "properties": {
                  "url": {"type": "string"}
              },
              "required": ["url"]
            }
            """
        And the response json at $.url is equal to "https://video.mentorpal.org/2"