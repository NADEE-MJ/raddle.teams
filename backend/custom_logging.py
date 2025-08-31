import logging
from logging.handlers import RotatingFileHandler

from backend.settings import settings


def create_logger(name: str, level, include_console: bool = False) -> logging.Logger:
    logger = logging.getLogger(f"raddle_{name}")
    logger.setLevel(level)
    logger.propagate = False

    if logger.hasHandlers():
        logger.handlers.clear()

    if settings.TESTING:
        file_handler = RotatingFileHandler(
            f"logs/testing_{name}.log", maxBytes=10 * 1024 * 1024, backupCount=5
        )
    else:
        file_handler = RotatingFileHandler(
            f"logs/{name}.log", maxBytes=10 * 1024 * 1024, backupCount=5
        )
    file_handler.setLevel(level)

    formatter = logging.Formatter("[%(asctime)s] (%(levelname)s) - %(message)s")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    if include_console or settings.TESTING:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger


server_logger = create_logger("server", logging.INFO, include_console=True)
api_logger = create_logger("api", logging.INFO)
database_logger = create_logger("database", logging.INFO)
websocket_logger = create_logger("websocket", logging.INFO)
