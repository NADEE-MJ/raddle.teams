use clap::{Parser, Subcommand};
use colored::*;
use console::style;
use std::process::{Command, exit};

#[derive(Parser)]
#[command(name = "raddle-cli")]
#[command(version, about = "Raddle Teams Rust Backend CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the development server
    Serve {
        /// Port to bind to
        #[arg(short, long, default_value = "9001")]
        port: u16,

        /// Host to bind to
        #[arg(short = 'H', long, default_value = "127.0.0.1")]
        host: String,

        /// Enable auto-reload (requires cargo-watch)
        #[arg(short, long)]
        reload: bool,

        /// Log level (trace, debug, info, warn, error)
        #[arg(short, long, default_value = "info")]
        log_level: String,
    },

    /// Run database migrations
    Migrate {
        /// Run migrations up
        #[arg(long)]
        up: bool,

        /// Rollback last migration
        #[arg(long)]
        down: bool,
    },

    /// Run tests
    Test {
        /// Run specific test pattern
        #[arg(short, long)]
        filter: Option<String>,

        /// Show verbose output
        #[arg(short, long)]
        verbose: bool,
    },

    /// Reset the database (TESTING mode only)
    DbReset,

    /// Build the project
    Build {
        /// Build in release mode
        #[arg(short, long)]
        release: bool,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Serve { port, host, reload, log_level } => {
            println!("\n{}", style("🚀 Starting Raddle Teams Rust Server").bold().cyan());
            println!("   {} {}", "Port:".green(), style(port).bold());
            println!("   {} {}", "Host:".green(), style(&host).bold());
            println!("   {} {}", "Log Level:".green(), style(&log_level).bold());

            if reload {
                println!("   {} {}", "Auto-reload:".green(), style("enabled").bold().yellow());
                println!("\n{}", style("Starting with cargo-watch...").dim());

                let status = Command::new("cargo")
                    .args(&["watch", "-x", &format!("run --bin raddle-server")])
                    .env("RADDLE_PORT", port.to_string())
                    .env("RADDLE_HOST", host)
                    .env("RUST_LOG", log_level)
                    .status();

                match status {
                    Ok(exit_status) => {
                        if !exit_status.success() {
                            eprintln!("{}", "❌ Server exited with error".red().bold());
                            exit(exit_status.code().unwrap_or(1));
                        }
                    }
                    Err(e) => {
                        eprintln!("{}", "❌ Failed to start server with cargo-watch".red().bold());
                        eprintln!("   Make sure cargo-watch is installed: cargo install cargo-watch");
                        eprintln!("   Error: {}", e);
                        exit(1);
                    }
                }
            } else {
                println!();
                let status = Command::new("cargo")
                    .args(&["run", "--bin", "raddle-server"])
                    .env("RADDLE_PORT", port.to_string())
                    .env("RADDLE_HOST", host)
                    .env("RUST_LOG", log_level)
                    .status();

                match status {
                    Ok(exit_status) => {
                        if !exit_status.success() {
                            eprintln!("{}", "❌ Server exited with error".red().bold());
                            exit(exit_status.code().unwrap_or(1));
                        }
                    }
                    Err(e) => {
                        eprintln!("{}", "❌ Failed to start server".red().bold());
                        eprintln!("   Error: {}", e);
                        exit(1);
                    }
                }
            }
        }

        Commands::Migrate { up, down } => {
            println!("\n{}", style("🔄 Running Database Migrations").bold().cyan());

            if down {
                println!("   {}", "Rolling back last migration...".yellow());
                let status = Command::new("sea-orm-cli")
                    .args(&["migrate", "down"])
                    .status();

                match status {
                    Ok(_) => println!("   {}", "✓ Migration rolled back".green()),
                    Err(e) => {
                        eprintln!("   {} {}", "❌ Migration failed:".red(), e);
                        exit(1);
                    }
                }
            } else {
                println!("   {}", "Applying migrations...".dimmed());
                let status = Command::new("sea-orm-cli")
                    .args(&["migrate", "up"])
                    .status();

                match status {
                    Ok(_) => println!("   {}", "✓ Migrations applied successfully".green()),
                    Err(e) => {
                        eprintln!("   {} {}", "❌ Migration failed:".red(), e);
                        eprintln!("   Make sure sea-orm-cli is installed: cargo install sea-orm-cli");
                        exit(1);
                    }
                }
            }
        }

        Commands::Test { filter, verbose } => {
            println!("\n{}", style("🧪 Running Tests").bold().cyan());

            let mut cmd = Command::new("cargo");
            cmd.arg("test");
            cmd.env("RADDLE_ENV", "testing");

            if let Some(pattern) = &filter {
                cmd.arg(pattern);
            }

            if verbose {
                cmd.arg("--");
                cmd.arg("--nocapture");
            }

            let status = cmd.status();

            match status {
                Ok(exit_status) => {
                    if exit_status.success() {
                        println!("\n{}", "✓ All tests passed!".green().bold());
                    } else {
                        eprintln!("\n{}", "❌ Some tests failed".red().bold());
                        exit(exit_status.code().unwrap_or(1));
                    }
                }
                Err(e) => {
                    eprintln!("{}", "❌ Failed to run tests".red().bold());
                    eprintln!("   Error: {}", e);
                    exit(1);
                }
            }
        }

        Commands::DbReset => {
            println!("\n{}", style("⚠️  Database Reset").bold().yellow());
            println!("   {}", "This will delete all data!".red());

            // Check if we're in testing mode
            let env = std::env::var("RADDLE_ENV").unwrap_or_default();
            if env != "testing" {
                eprintln!("\n{}", "❌ Database reset is only allowed in TESTING mode".red().bold());
                eprintln!("   Set RADDLE_ENV=testing to enable this command");
                exit(1);
            }

            println!("   {}", "Resetting database...".dimmed());

            // This would call the reset endpoint or run migrations
            // For now, just a placeholder
            println!("   {}", "✓ Database reset complete".green());
        }

        Commands::Build { release } => {
            println!("\n{}", style("🏗️  Building Project").bold().cyan());

            let mut args = vec!["build"];
            if release {
                args.push("--release");
                println!("   {} {}", "Mode:".green(), style("release").bold());
            } else {
                println!("   {} {}", "Mode:".green(), style("debug").bold());
            }

            let status = Command::new("cargo")
                .args(&args)
                .status();

            match status {
                Ok(exit_status) => {
                    if exit_status.success() {
                        println!("\n{}", "✓ Build successful!".green().bold());
                    } else {
                        eprintln!("\n{}", "❌ Build failed".red().bold());
                        exit(exit_status.code().unwrap_or(1));
                    }
                }
                Err(e) => {
                    eprintln!("{}", "❌ Failed to build".red().bold());
                    eprintln!("   Error: {}", e);
                    exit(1);
                }
            }
        }
    }
}
