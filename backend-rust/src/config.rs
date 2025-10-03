use anyhow::{Context, Result};
use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub admin_password: String,
    pub database_url: String,
    pub testing: bool,
    pub host: String,
    pub port: u16,
    pub log_level: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        // Determine if we're in testing mode
        let testing = env::var("RADDLE_ENV").unwrap_or_default() == "testing";

        // Load appropriate .env file
        let env_file = if testing { ".env.testing" } else { ".env" };

        // Load .env file if it exists (don't fail if it doesn't)
        if let Err(e) = dotenvy::from_filename(env_file) {
            tracing::warn!("Could not load {}: {}", env_file, e);
        }

        let admin_password = env::var("ADMIN_PASSWORD")
            .context("ADMIN_PASSWORD must be set")?;

        let database_url = env::var("DATABASE_URL")
            .context("DATABASE_URL must be set")?;

        let host = env::var("RADDLE_HOST")
            .unwrap_or_else(|_| "127.0.0.1".to_string());

        let port = env::var("RADDLE_PORT")
            .unwrap_or_else(|_| "9001".to_string())
            .parse::<u16>()
            .context("RADDLE_PORT must be a valid port number")?;

        let log_level = env::var("RUST_LOG")
            .unwrap_or_else(|_| "info".to_string());

        Ok(Config {
            admin_password,
            database_url,
            testing,
            host,
            port,
            log_level,
        })
    }

    pub fn is_sqlite(&self) -> bool {
        self.database_url.starts_with("sqlite:")
    }

    pub fn is_postgres(&self) -> bool {
        self.database_url.starts_with("postgres:")
            || self.database_url.starts_with("postgresql:")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_sqlite() {
        let config = Config {
            admin_password: "test".to_string(),
            database_url: "sqlite:///tmp/test.db".to_string(),
            testing: true,
            host: "127.0.0.1".to_string(),
            port: 9001,
            log_level: "info".to_string(),
        };

        assert!(config.is_sqlite());
        assert!(!config.is_postgres());
    }

    #[test]
    fn test_is_postgres() {
        let config = Config {
            admin_password: "test".to_string(),
            database_url: "postgresql://user:pass@localhost/db".to_string(),
            testing: true,
            host: "127.0.0.1".to_string(),
            port: 9001,
            log_level: "info".to_string(),
        };

        assert!(!config.is_sqlite());
        assert!(config.is_postgres());
    }
}
