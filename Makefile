PY ?= python

.PHONY: install lint test snapshot check valuations

install:
	$(PY) -m pip install -e ".[dev]"

lint:
	$(PY) -m ruff check src tests scripts
	$(PY) -m ruff format --check src tests scripts

test:
	$(PY) -m pytest -q

snapshot:
	$(PY) -m dcf.data.snapshot

check: lint test

valuations:
	$(PY) scripts/run_valuations.py
