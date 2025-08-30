import os

from pydantic_settings import BaseSettings, SettingsConfigDict

raddle_env = os.environ.get("RADDLE_ENV")

if raddle_env == "testing":
    env_file = ".env.testing"
else:
    env_file = ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=env_file, env_file_encoding="utf-8")

    ADMIN_PASSWORD: str
    DATABASE_URL: str


settings = Settings()
