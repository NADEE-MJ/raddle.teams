import logging
from logging.handlers import RotatingFileHandler


def create_file_logger() -> logging.Logger:
    logger = logging.getLogger("raddle_teams_logger")
    level = logging.DEBUG
    logger.setLevel(level)
    logger.propagate = False

    if logger.hasHandlers():
        logger.handlers.clear()

    file_handler = RotatingFileHandler(
        "raddle_teams.log", maxBytes=10 * 1024 * 1024, backupCount=5
    )
    file_handler.setLevel(level)

    formatter = logging.Formatter("[%(asctime)s] (%(levelname)s) - %(message)s")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


file_logger = create_file_logger()
