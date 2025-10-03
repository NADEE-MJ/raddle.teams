pub mod models;
pub mod player;
pub mod team;

use anyhow::{Context, Result};
use sea_orm::{ConnectOptions, Database, DbErr};
use std::time::Duration;

// Re-export DatabaseConnection from sea_orm
pub use sea_orm::DatabaseConnection;

pub use models::{Lobby, LobbyActiveModel, LobbyModel};
pub use player::{Player, PlayerActiveModel, PlayerModel};
pub use team::{Team, TeamActiveModel, TeamModel};

/// Create a database connection pool
pub async fn create_connection_pool(database_url: &str) -> Result<DatabaseConnection> {
    tracing::info!("Connecting to database: {}", database_url);

    let mut opt = ConnectOptions::new(database_url.to_string());
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(8))
        .max_lifetime(Duration::from_secs(8))
        .sqlx_logging(true)
        .sqlx_logging_level(log::LevelFilter::Debug);

    let db = Database::connect(opt)
        .await
        .context("Failed to connect to database")?;

    tracing::info!("Database connection established");

    // Enable foreign keys for SQLite
    if database_url.starts_with("sqlite:") {
        enable_sqlite_foreign_keys(&db).await?;
    }

    Ok(db)
}

/// Enable foreign key constraints for SQLite
async fn enable_sqlite_foreign_keys(db: &DatabaseConnection) -> Result<(), DbErr> {
    use sea_orm::Statement;
    use sea_orm::ConnectionTrait;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "PRAGMA foreign_keys = ON;".to_string(),
    ))
    .await?;

    tracing::info!("SQLite foreign keys enabled");
    Ok(())
}

/// Create all database tables
pub async fn create_tables(db: &DatabaseConnection) -> Result<()> {
    use sea_orm::{Schema, sea_query::TableCreateStatement, ConnectionTrait};

    let backend = db.get_database_backend();
    let schema = Schema::new(backend);

    tracing::info!("Creating database tables...");

    // Create tables in order (respecting foreign key dependencies)
    let tables: Vec<TableCreateStatement> = vec![
        schema.create_table_from_entity(Lobby).if_not_exists().to_owned(),
        schema.create_table_from_entity(Team).if_not_exists().to_owned(),
        schema.create_table_from_entity(Player).if_not_exists().to_owned(),
    ];

    for table in tables {
        db.execute(backend.build(&table))
            .await
            .context("Failed to create table")?;
    }

    tracing::info!("Database tables created successfully");
    Ok(())
}

/// Drop all database tables (for testing)
pub async fn drop_all_tables(db: &DatabaseConnection) -> Result<()> {
    use sea_orm::Statement;
    use sea_orm::ConnectionTrait;

    tracing::warn!("Dropping all database tables...");

    // Drop in reverse order to respect foreign keys
    let drop_statements = vec![
        "DROP TABLE IF EXISTS player;",
        "DROP TABLE IF EXISTS team;",
        "DROP TABLE IF EXISTS lobby;",
    ];

    for stmt in drop_statements {
        db.execute(Statement::from_string(
            db.get_database_backend(),
            stmt.to_string(),
        ))
        .await
        .context("Failed to drop table")?;
    }

    tracing::info!("All tables dropped successfully");
    Ok(())
}
