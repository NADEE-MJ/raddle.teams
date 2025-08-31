import argparse
import os
import sys

import uvicorn

sys.path.insert(0, os.getcwd())

from backend.custom_logging import server_logger


def run_server(environment: str):
    host = "localhost"
    port = 8000

    if environment == "development":
        # whether to enable auto-reload on code changes
        reload = True
    else:
        reload = False

    # options: "critical", "error", "warning", "info", "debug", "trace"
    log_level = "info"

    server_logger.info("Initializing FastAPI server startup")

    server_logger.info(f"Server will be available at: http://{host}:{port}")
    server_logger.info(f"📖 API docs will be available at: http://{host}:{port}/docs")
    server_logger.info(f"📚 ReDoc will be available at: http://{host}:{port}/redoc")

    server_logger.info(
        f"Server configuration - Host: {host}, Port: {port}, Reload: {reload}, Log Level: {log_level}"
    )

    cwd = os.getcwd()
    server_logger.debug(f"Current working directory: {cwd}")

    # add the current working directory to the sys.path
    sys.path.insert(0, cwd)

    # add the packages/functions/test directory to the sys.path from the current working directory
    sys.path.insert(0, f"{cwd}/backend")
    sys.path.insert(0, f"{cwd}/")

    server_logger.debug(f"Python path updated: {sys.path[:3]}")

    try:
        server_logger.info("Starting uvicorn server")
        uvicorn.run(
            "backend.main:app",
            host=host,
            port=port,
            log_level=log_level,
            reload=reload,
        )
    except KeyboardInterrupt:
        server_logger.info("Server stopped by user (KeyboardInterrupt)")
        print("🛑 Server stopped by user")
    except Exception as e:
        server_logger.error(f"Error starting server: {e}")
        print(f"❌ Error starting server: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    server_logger.info("Starting application via run.py")

    parser = argparse.ArgumentParser(description="Run the Raddle Teams server.")
    parser.add_argument(
        "environment",
        choices=["development", "testing"],
        help="The environment to run the server in.",
    )
    args = parser.parse_args()

    run_server(args.environment)
