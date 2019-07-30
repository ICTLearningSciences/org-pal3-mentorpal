.PHONY: clean
clean:
	rm -rf node_modules .cache public

.env.development:
	@echo "MENTOR_API_URL=https://dev.mentorpal.org/mentor-api" > .env.development
	@echo "Set up  a default .env.development file"
	@echo "that configures MENTOR_API_URL=https://dev.mentorpal.org/mentor-api."
	@echo "This file should not be committed. "
	@echo "Feel free to change to point to a local server if you're running one."

node_modules/gatsby-cli:
	npm install

.PHONY: develop
develop: .env.development node_modules/gatsby-cli
	npx gatsby develop