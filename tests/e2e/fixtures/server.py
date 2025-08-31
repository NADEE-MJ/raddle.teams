import os
import subprocess
import time
from typing import Optional

import httpx
import psutil


class ServerManager:
    def __init__(self, host: str = "localhost", port: int = 8000):
        self.host = host
        self.port = port
        self.url = f"http://{host}:{port}"
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> None:
        if self.is_running():
            print(f"Server already running at {self.url}")
            return

        self.stop_existing_server()

        self.process = subprocess.Popen(
            ["npm", "run", "testing-server"],
            cwd=os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        self.wait_for_server()

    def stop(self) -> None:
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
            self.process = None

    def stop_existing_server(self) -> None:
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                connections = proc.net_connections()
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
        try:
            response = httpx.get(f"{self.url}/api", timeout=1.0)
            return response.status_code == 200
        except (httpx.RequestError, httpx.TimeoutException):
            return False
