# @author: yangjun14(yangjun14@baidu.com)
# Use npm scripts instead

export PATH := $(shell npm bin):$(PATH)
export PORT = 9878
export TEST = karma --port $(PORT)
.PHONY: test doc test-reports

test:
	$(TEST) start --reporters mocha

test-watch:
	$(TEST) start --reporters mocha --auto-watch --no-single-run

test-reports:
	$(TEST) start --reporters mocha,html,coverage

test-reports-ci:
	$(TEST) start --reporters mocha,html,coverage,coveralls
