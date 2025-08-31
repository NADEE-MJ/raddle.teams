import os
import sys

import pytest
import typer

app = typer.Typer()


@app.command()
def test(
    v: bool = typer.Option(False, "--verbose", "-v"),
    vv: bool = typer.Option(False, "--very-verbose", "-vv"),
    vvv: bool = typer.Option(False, "--very-very-verbose", "-vvv"),
    filter: str = typer.Option(None, "--filter", "-f"),
    coverage: bool = typer.Option(False, "--coverage", "-c"),
):
    # get the current working directory
    cwd = os.getcwd()

    # add the current working directory to the sys.path
    sys.path.insert(0, cwd)

    # add the test directory to the sys.path from the current working directory
    sys.path.insert(0, f"{cwd}/tests")
    sys.path.insert(0, f"{cwd}/tests/e2e")
    sys.path.insert(0, f"{cwd}/tests/e2e/fixtures")
    sys.path.insert(0, f"{cwd}/tests/e2e/utilities")

    records_dirs = [
        f"{cwd}/tests/e2e/recordings/screenshots",
        f"{cwd}/tests/e2e/recordings/videos",
        f"{cwd}/tests/e2e/recordings/traces",
    ]
    for records_dir in records_dirs:
        if os.path.exists(records_dir):
            for root, dirs, files in os.walk(records_dir, topdown=False):
                for name in files:
                    os.remove(os.path.join(root, name))
                for name in dirs:
                    os.rmdir(os.path.join(root, name))

    command_line_args = []

    if v:
        command_line_args.append("-v")
    if vv:
        command_line_args.append("-vv")
    if vvv:
        command_line_args.append("-vvv")
    if filter:
        command_line_args.append(f"-k {filter}")

    # if coverage:
    #     command_line_args.append("--cov=packages")
    #     command_line_args.append("--cov-config=.coveragerc")
    #     command_line_args.append("--cov-report=xml")

    # use this to run tests in parallel, but it is not recommended, as it can cause issues with moto
    # command_line_args.append("-n")
    # command_line_args.append("4")

    try:
        os.environ["RADDLE_ENV"] = "testing"
        sys.exit(pytest.main(command_line_args))
    finally:
        del os.environ["RADDLE_ENV"]


if __name__ == "__main__":
    app()
