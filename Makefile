PY ?= python

.PHONY: install lint test snapshot check

install:
	$(PY) -m pip install -e ".[dev]"

lint:
	$(PY) -m ruff check src tests
	$(PY) -m ruff format --check src tests

test:
	$(PY) -m pytest -q

snapshot:
	$(PY) -m dcf.data.snapshot

check: lint test
