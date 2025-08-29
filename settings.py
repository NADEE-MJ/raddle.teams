from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ADMIN_PASSWORD: str = "your_admin_password"

    class Config:
        env_file = ".env"


settings = Settings()
