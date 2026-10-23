"""The README results table and chart SVGs must match results/valuations.json."""

from dcf.analysis.readme import IMG, README, assets, load, render_readme


def test_readme_results_table_matches_results():
    text = README.read_text()
    assert render_readme(text, load()) == text, (
        "README table is stale: run python scripts/readme_assets.py"
    )


def test_readme_chart_svgs_match_results():
    for name, svg in assets(load()).items():
        assert (IMG / name).read_text() == svg, (
            f"docs/img/{name} is stale: run python scripts/readme_assets.py"
        )


def test_table_has_every_ticker():
    d = load()
    text = README.read_text()
    for t in d["tickers"]:
        assert f"| {t} |" in text
