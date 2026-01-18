import os

from pydantic_settings import BaseSettings, SettingsConfigDict

testing = os.environ.get("SUPERLATIVES_ENV") == "testing"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.testing" if testing else ".env", env_file_encoding="utf-8", extra="ignore"
    )

    ADMIN_PASSWORD: str
    DATABASE_URL: str = f"sqlite:///databases/superlatives_{'testing_' if testing else ''}database.db"
    TESTING: bool = testing


settings = Settings()  # type: ignore[missing-argument]
