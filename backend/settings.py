import os

from pydantic_settings import BaseSettings, SettingsConfigDict

testing = os.environ.get("RADDLE_ENV") == "testing"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.testing" if testing else ".env", env_file_encoding="utf-8")

    ADMIN_PASSWORD: str
    DATABASE_URL: str
    TESTING: bool = testing


settings = Settings()
