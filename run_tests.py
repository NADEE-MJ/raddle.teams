import os
import socket
import sys
import time

import docker
import pytest
import typer

app = typer.Typer()


def start_playwright_container() -> None:
    name = "playwright-server"

    try:
        client = docker.from_env()
    except Exception as exc:
        print(
            f"could not connect to docker daemon, skipping Playwright container check: {exc}"
        )
        return

    try:
        existing = client.containers.list(all=True, filters={"name": name})
        if existing:
            c = existing[0]
            if c.status == "running":
                print(
                    f"Playwright container '{name}' already running (id={c.short_id})"
                )
                return
            else:
                try:
                    print(
                        f"Removing existing container '{name}' (id={c.short_id}) to recreate it"
                    )
                    c.remove(force=True)
                except Exception:
                    pass

        print(f"Creating and starting Playwright container '{name}'")
        cmd = '/bin/sh -c "npx -y playwright@1.55.0 run-server --port 3000 --host 0.0.0.0"'
        container = client.containers.run(
            "mcr.microsoft.com/playwright:v1.55.0-noble",
            command=cmd,
            name=name,
            detach=True,
            remove=True,
            network_mode="host",
            init=True,
            working_dir="/home/pwuser",
            user="pwuser",
            tty=True,
            stdin_open=False,
            restart_policy={"Name": "no"},
        )
        print(f"Started Playwright container '{name}' (id={container.short_id})")
    except Exception as exc:
        print(f"error starting Playwright container '{name}': {exc}")
        return


def wait_for_playwright_server(
    host: str = "127.0.0.1",
    port: int = 3000,
    timeout: float = 20.0,
    interval: float = 0.5,
) -> bool:
    deadline = time.time() + float(timeout)
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=interval):
                print(f"Playwright server is accepting connections on {host}:{port}")
                return True
        except Exception:
            time.sleep(float(interval))
    return False


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

    # TODO only start Playwright server if this is arch, potentially want to use preinstalled setup on non arch systems
    try:
        start_playwright_container()
    except Exception as exc:  # pragma: no cover - defensive
        print(f"warning: failed to start Playwright container: {exc}")

    if not wait_for_playwright_server():
        print("Playwright server is not accepting connections. Exiting.")
        sys.exit(1)

    try:
        os.environ["RADDLE_ENV"] = "testing"
        sys.exit(pytest.main(command_line_args))
    finally:
        del os.environ["RADDLE_ENV"]


if __name__ == "__main__":
    app()
