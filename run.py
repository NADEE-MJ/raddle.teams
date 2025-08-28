import os
import sys

import uvicorn
from custom_logging import file_logger


def run_server():
    host = "localhost"
    port = 5000
    # whether to enable auto-reload on code changes
    reload = True
    # options: "critical", "error", "warning", "info", "debug", "trace"
    log_level = "info"

    file_logger.info("Initializing FastAPI server startup")

    print("🖨️ Starting Mock Print FastAPI Server...")
    print(f"🌐 Server will be available at: http://{host}:{port}")
    print(f"⚙️ Configuration UI will be available at: http://{host}:{port}")
    print(f"📖 API docs will be available at: http://{host}:{port}/docs")
    print(f"📚 ReDoc will be available at: http://{host}:{port}/redoc")

    file_logger.info(
        f"Server configuration - Host: {host}, Port: {port}, Reload: {reload}, Log Level: {log_level}"
    )

    cwd = os.getcwd()
    file_logger.debug(f"Current working directory: {cwd}")

    # add the current working directory to the sys.path
    sys.path.insert(0, cwd)

    # add the packages/functions/test directory to the sys.path from the current working directory
    sys.path.insert(0, f"{cwd}/api")
    sys.path.insert(0, f"{cwd}/")

    file_logger.debug(f"Python path updated: {sys.path[:3]}")

    try:
        file_logger.info("Starting uvicorn server")
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            log_level=log_level,
            reload=reload,
        )
    except KeyboardInterrupt:
        file_logger.info("Server stopped by user (KeyboardInterrupt)")
        print("🛑 Server stopped by user")
    except Exception as e:
        file_logger.error(f"Error starting server: {e}")
        print(f"❌ Error starting server: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    file_logger.info("Starting application via run.py")
    run_server()

    # from database import print_all_data

    # print_all_data()
