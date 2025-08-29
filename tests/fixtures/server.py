"""
Server management utilities for testing.
"""

import subprocess
import time
from typing import Optional

import httpx
import psutil
import pytest


class ServerManager:
    """Manages the FastAPI server for testing."""

    def __init__(self, host: str = "localhost", port: int = 8000):
        self.host = host
        self.port = port
        self.url = f"http://{host}:{port}"
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> None:
        """Start the FastAPI server or use existing one."""
        # Check if server is already running
        if self.is_running():
            print(f"Server already running at {self.url}")
            return

        # Kill any existing server on this port
        self.stop_existing_server()

        # Start new server process
        self.process = subprocess.Popen(
            ["poetry", "run", "python", "run.py"],
            cwd="/home/nadeem/Documents/raddle.teams",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # Wait for server to be ready
        self.wait_for_server()

    def stop(self) -> None:
        """Stop the FastAPI server if we started it."""
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
            self.process = None
        # Don't kill external servers - let them keep running

    def stop_existing_server(self) -> None:
        """Kill any existing server running on the port."""
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                # Get connections for this process
                connections = proc.connections()
                for conn in connections:
                    if conn.laddr.port == self.port:
                        print(
                            f"Killing existing process {proc.info['pid']} on port {self.port}"
                        )
                        proc.kill()
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

    def wait_for_server(self, timeout: int = 5) -> None:
        """Wait for the server to be ready."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = httpx.get(f"{self.url}/api", timeout=1.0)
                if response.status_code == 200:
                    print(f"Server ready at {self.url}")
                    return
            except (httpx.RequestError, httpx.TimeoutException):
                pass
            time.sleep(0.5)

        raise RuntimeError(f"Server failed to start within {timeout} seconds")

    def is_running(self) -> bool:
        """Check if the server is running."""
        try:
            response = httpx.get(f"{self.url}/api", timeout=1.0)
            return response.status_code == 200
        except (httpx.RequestError, httpx.TimeoutException):
            return False


@pytest.fixture(scope="session")
def server():
    """Pytest fixture to manage the test server."""
    manager = ServerManager()
    manager.start()
    yield manager
    manager.stop()


@pytest.fixture(scope="session")
def server_url(server):
    """Pytest fixture that provides the server URL."""
    return server.url
