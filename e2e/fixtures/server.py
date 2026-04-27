import os
import signal
import subprocess
import time
from typing import Optional

import httpx


class ServerManager:
    def __init__(self, host: str = "localhost", port: int = 8000):
        self.host = host
        self.port = port
        self.url = f"http://{host}:{port}"
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> None:
        if self.is_running():
            return

        # Kill any existing process on the port
        self._kill_port_process()

        # Start new server process
        # Use shell=False and full path to rt script
        import pathlib

        project_root = pathlib.Path(__file__).parent.parent.parent
        rt_path = project_root / "rt"

        self.process = subprocess.Popen(
            [str(rt_path), "server"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd=str(project_root),
        )

        # Wait for server to be ready
        self._wait_for_server()

    def stop(self) -> None:
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.process = None

    def is_running(self) -> bool:
        try:
            response = httpx.get(f"{self.url}/api", timeout=1.0)
            return response.status_code == 200
        except Exception:
            return False

    def _kill_port_process(self) -> None:
        try:
            # Use lsof to find and kill process on port
            result = subprocess.run(["lsof", "-ti", f":{self.port}"], capture_output=True, text=True)
            if result.stdout:
                pid = int(result.stdout.strip())
                os.kill(pid, signal.SIGTERM)
                time.sleep(0.5)
        except Exception:
            pass

    def _wait_for_server(self, timeout: int = 10) -> None:
        start = time.time()
        while time.time() - start < timeout:
            if self.is_running():
                return
            time.sleep(0.1)

        raise RuntimeError(f"Server failed to start within {timeout} seconds")
