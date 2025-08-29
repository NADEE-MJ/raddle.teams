import os
import sys

import pytest
import typer

"""
! TO RUN THIS SCRIPT:
! python sst/scripts/pytest_cli.py put
!     or
! npm run test:python -- put
?
? This is a helper class for running pytest from the command line
? adds all the necessary paths to the sys.path to run pytest
? use the --help flag to see the available commands and options
"""


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
    sys.path.insert(0, f"{cwd}/tests/fixtures")
    sys.path.insert(0, f"{cwd}/tests/utilities")

    command_line_args = []

    if v:
        command_line_args.append("-v")
    if vv:
        command_line_args.append("-vv")
    if vvv:
        command_line_args.append("-vvv")
    if filter:
        command_line_args.append(f"-k {filter}")

    if coverage:
        command_line_args.append("--cov=packages")
        command_line_args.append("--cov-config=.coveragerc")
        command_line_args.append("--cov-report=xml")

    # use this to run tests in parallel, but it is not recommended, as it can cause issues with moto
    # command_line_args.append("-n")
    # command_line_args.append("4")

    sys.exit(pytest.main(command_line_args))


if __name__ == "__main__":
    app()
