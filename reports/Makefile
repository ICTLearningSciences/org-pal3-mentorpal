VIRTUAL_ENV=.venv

$(VIRTUAL_ENV):
	$(MAKE) venv-create

.PHONY: dev-env-create
venv-create:
	[ -d $(VIRTUAL_ENV) ] || virtualenv -p python2 $(VIRTUAL_ENV)
	$(VIRTUAL_ENV)/bin/pip install --upgrade pip
	$(VIRTUAL_ENV)/bin/pip install -r requirements.txt

.PHONY: clean
clean:
	rm -rf .venv