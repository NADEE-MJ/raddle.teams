use std::path::PathBuf;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_logging(log_level: &str, testing: bool) -> anyhow::Result<()> {
    // Create logs directory if it doesn't exist
    std::fs::create_dir_all("logs")?;

    // Build log file path
    let log_file_name = if testing {
        format!("testing_{}.log", chrono::Local::now().format("%Y%m%d_%H%M%S"))
    } else {
        format!("server_{}.log", chrono::Local::now().format("%Y%m%d_%H%M%S"))
    };
    let log_file_path = PathBuf::from("logs").join(log_file_name);

    // Create log file
    let log_file = std::fs::File::create(&log_file_path)?;

    // Set up environment filter
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(log_level));

    // File layer - structured logging
    let file_layer = fmt::layer()
        .with_writer(log_file)
        .with_ansi(false)
        .with_target(true)
        .with_file(true)
        .with_line_number(true)
        .json();

    // Console layer - pretty logging for development
    let console_layer = fmt::layer()
        .with_target(false)
        .with_file(false)
        .with_line_number(false)
        .compact();

    // Build the subscriber
    tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer)
        .with(console_layer)
        .init();

    tracing::info!("Logging initialized");
    tracing::info!("Log file: {}", log_file_path.display());
    tracing::info!("Log level: {}", log_level);
    tracing::info!("Testing mode: {}", testing);

    Ok(())
}
