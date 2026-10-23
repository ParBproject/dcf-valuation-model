"""Regenerate the README results table and docs/img/*.svg from results/valuations.json."""

from dcf.analysis.readme import IMG, README, assets, load, render_readme


def main() -> None:
    d = load()
    README.write_text(render_readme(README.read_text(), d))
    IMG.mkdir(parents=True, exist_ok=True)
    for name, svg in assets(d).items():
        (IMG / name).write_text(svg)
        print("wrote", IMG / name)


if __name__ == "__main__":
    main()
