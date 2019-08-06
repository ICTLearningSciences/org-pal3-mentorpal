
TODAY=$(shell date +"%Y-%m-%dT00:00:00Z")

.PHONY: clean
clean:
	rm -rf report

.SECONDARY:
report/mentor-answered-watched/since-%/xapi-statements.json:
	mkdir -p report/mentor-answered-watched/since-$*
	npm run report:query-xapi -- \
		--since=$* \
		--output=report/mentor-answered-watched/since-$*/xapi-statements.json


.SECONDARY:
report/mentor-answered-watched/since-%/report.json: report/mentor-answered-watched/since-%/xapi-statements.json
	mkdir -p report/mentor-answered-watched/since-$*
	npm run report:xapi2json -- \
		--dir=report/mentor-answered-watched/since-$*


.SECONDARY:
report/mentor-answered-watched/since-%/report.csv: report/mentor-answered-watched/since-%/report.json
	mkdir -p report/mentor-answered-watched/since-$*
	npm run report:json2csv -- \
		--dir=report/mentor-answered-watched/since-$*
	

report/mentor-answered-watched/since-%: report/mentor-answered-watched/since-%/report.csv
	mkdir -p report/mentor-answered-watched/since-$*
		

report/mentor-answers-watched/today:
	$(MAKE) report/mentor-answered-watched/since-$(TODAY)