import json
from pathlib import Path

import pytest

SNAP_ROOT = Path(__file__).resolve().parents[1] / "data" / "snapshots"


def latest_snapshot() -> Path:
    dirs = sorted(p for p in SNAP_ROOT.iterdir() if p.is_dir())
    assert dirs, "no snapshots committed"
    return dirs[-1]


@pytest.fixture(scope="session")
def snap_dir() -> Path:
    return latest_snapshot()


@pytest.fixture(scope="session")
def manifest(snap_dir):
    return json.loads((snap_dir / "manifest.json").read_text())


def load(snap_dir: Path, name: str):
    return json.loads((snap_dir / name).read_text())
