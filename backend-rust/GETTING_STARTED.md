# Getting Started with the Rust Backend

## Quick Start

### 1. Install Rust

If you don't have Rust installed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

Verify installation:
```bash
cargo --version
rustc --version
```

### 2. Set Up Environment

```bash
cd backend-rust
cp .env.example .env
```

Edit `.env` and set your configuration:
```env
ADMIN_PASSWORD=your_secure_password
DATABASE_URL=sqlite:///databases/raddle_rust.db
```

### 3. Build the Frontend

The Rust server needs the built frontend to serve static files:

```bash
cd ..  # Back to project root
./rt build
```

### 4. Run the Server

```bash
cd backend-rust
cargo run --bin raddle-server
```

The server will start on `http://127.0.0.1:9001`

## Using the CLI Tool

For a better development experience, use the included CLI tool:

```bash
# Start server (default: port 9001)
cargo run --bin raddle-cli -- serve

# Start on custom port
cargo run --bin raddle-cli -- serve --port 9002

# Enable auto-reload (requires cargo-watch)
cargo install cargo-watch
cargo run --bin raddle-cli -- serve --reload

# Run tests
cargo run --bin raddle-cli -- test

# Build optimized release binary
cargo run --bin raddle-cli -- build --release
```

## Development Workflow

### 1. First Build

The first build will take 5-10 minutes as Cargo downloads and compiles all dependencies:

```bash
cargo build
```

Subsequent builds are much faster (incremental compilation).

### 2. Development Mode

Run in development mode with detailed logging:

```bash
RUST_LOG=debug cargo run --bin raddle-server
```

### 3. Auto-Reload on Changes

Install cargo-watch:
```bash
cargo install cargo-watch
```

Run with auto-reload:
```bash
cargo watch -x 'run --bin raddle-server'
```

Or use the CLI:
```bash
cargo run --bin raddle-cli -- serve --reload
```

### 4. Testing

Run all tests:
```bash
cargo test
```

Run specific test:
```bash
cargo test test_name
```

Run with output:
```bash
cargo test -- --nocapture
```

## Running Both Backends

You can run the Python and Rust backends simultaneously for comparison:

**Terminal 1 - Python Backend:**
```bash
./rt server  # Runs on port 8000
```

**Terminal 2 - Rust Backend:**
```bash
cd backend-rust
cargo run --bin raddle-server  # Runs on port 9001
```

Now you can access:
- Python API: `http://localhost:8000`
- Rust API: `http://localhost:9001`

Both will serve the same React frontend!

## Database Configuration

### SQLite (Default)

The default configuration uses SQLite:

```env
DATABASE_URL=sqlite:///databases/raddle_rust.db
```

The database file is created automatically in the `databases/` directory.

### PostgreSQL

To use PostgreSQL:

1. **Install PostgreSQL** (if not already installed)

2. **Create database:**
   ```bash
   createdb raddle_teams_rust
   ```

3. **Update `.env`:**
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/raddle_teams_rust
   ```

4. **Restart the server**

The Rust backend will automatically detect PostgreSQL and configure accordingly. No code changes needed!

## Build Artifacts

### Development Build

```bash
cargo build
```

Binary location: `target/debug/raddle-server`

### Release Build (Optimized)

```bash
cargo build --release
```

Binary location: `target/release/raddle-server`

Release builds are:
- Much faster (3-10x)
- Much smaller
- Take longer to compile

### Running Release Binary

```bash
./target/release/raddle-server
```

## Troubleshooting

### Error: "Static directory not found"

Build the frontend first:
```bash
cd ..  # Back to project root
./rt build
cd backend-rust
```

### Error: "ADMIN_PASSWORD must be set"

Create and configure `.env`:
```bash
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD
```

### Error: "Failed to connect to database"

For SQLite:
- Check that `DATABASE_URL` path is correct
- Ensure parent directory exists: `mkdir -p databases`

For PostgreSQL:
- Ensure PostgreSQL is running: `pg_isready`
- Check connection string format
- Verify database exists: `psql -l`

### Compilation Errors

Update Rust to latest stable:
```bash
rustup update stable
```

Clean build artifacts:
```bash
cargo clean
cargo build
```

### Port Already in Use

Change the port:
```bash
cargo run --bin raddle-cli -- serve --port 9002
```

Or set environment variable:
```bash
RADDLE_PORT=9002 cargo run --bin raddle-server
```

## Performance Tips

### 1. Use Release Mode for Load Testing

Always use release builds when testing performance:
```bash
cargo run --release --bin raddle-server
```

### 2. Increase Connection Pool

For high concurrency, you may want to increase the database connection pool size (edit `src/database/mod.rs`).

### 3. Enable Logging Only When Needed

In production, use `RUST_LOG=info` or `RUST_LOG=warn` instead of `debug` or `trace`.

## Next Steps

- Read the [README.md](README.md) for full API documentation
- Check out the [Architecture Guide](#architecture) below
- Compare performance with Python backend
- Explore the code in `src/` directory

## Architecture Overview

```
Request Flow:
1. HTTP/WebSocket request arrives at Axum router
2. Middleware: CORS, tracing, compression
3. Route handler extracts state and parameters
4. Extractors validate auth and provide DB connection
5. Business logic interacts with SeaORM models
6. Response serialized via serde and sent back

WebSocket Flow:
1. Client connects via WebSocket upgrade
2. Connection registered in WebSocketManager
3. Messages broadcast to subscribed clients
4. Real-time updates for gameplay events
```

### Key Components

- **Axum Router**: HTTP routing and middleware
- **SeaORM**: Type-safe database queries
- **Extractors**: Dependency injection (auth, DB)
- **WebSocket Managers**: Connection management and broadcasting
- **Tracing**: Structured logging and diagnostics

## Useful Commands

```bash
# Format code
cargo fmt

# Check for common mistakes
cargo clippy

# Check without building
cargo check

# Build documentation
cargo doc --open

# Show dependency tree
cargo tree

# Update dependencies
cargo update

# Remove build artifacts
cargo clean

# Run benchmarks
cargo bench
```

## Learning Resources

- [Axum Documentation](https://docs.rs/axum/)
- [SeaORM Tutorial](https://www.sea-ql.org/SeaORM/docs/index)
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)
- [Rust Book](https://doc.rust-lang.org/book/)

## Questions?

- Check the [README.md](README.md)
- Look at the Python implementation in `../backend/`
- Review code comments in `src/`
- Open an issue on GitHub
