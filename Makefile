PY ?= python

.PHONY: install lint test snapshot check valuations results readme

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

readme:
	$(PY) scripts/readme_assets.py

# Full pipeline from the committed snapshot: valuations -> TS parity fixtures -> README assets.
results: valuations
	$(PY) scripts/export_engine_fixtures.py
	$(PY) scripts/readme_assets.py
