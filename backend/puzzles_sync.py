import asyncio
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from backend.custom_logging import server_logger

def sync_puzzles_blocking():
    try:
        base_dir = Path(__file__).parent.parent
        puzzles_dir = base_dir / "puzzles_from_raddle"
        
        server_logger.info("Running pull_down_raddles.py")
        subprocess.run(["uv", "run", "python", "pull_down_raddles.py"], cwd=puzzles_dir, check=True)
        
        server_logger.info("Running convert_yaml_to_json.py")
        subprocess.run(["uv", "run", "python", "convert_yaml_to_json.py"], cwd=puzzles_dir, check=True)
        
        server_logger.info("Puzzle sync completed successfully.")
    except Exception as e:
        server_logger.error(f"Error syncing puzzles: {e}")

async def puzzle_sync_task():
    while True:
        # Calculate seconds until next 5:00 AM local time
        now = datetime.now()
        next_run = now.replace(hour=5, minute=0, second=0, microsecond=0)
        if now >= next_run:
            # Already past 5am today, schedule for tomorrow
            next_run += timedelta(days=1)
        sleep_seconds = (next_run - now).total_seconds()
        server_logger.info(f"Next puzzle sync scheduled at {next_run.strftime('%Y-%m-%d %H:%M:%S')} (in {sleep_seconds:.0f}s)")
        await asyncio.sleep(sleep_seconds)

        server_logger.info("Starting daily puzzle sync...")
        await asyncio.to_thread(sync_puzzles_blocking)

_sync_task = None

def start_puzzle_sync():
    global _sync_task
    _sync_task = asyncio.create_task(puzzle_sync_task())
    server_logger.info("Started puzzle sync background task")

def stop_puzzle_sync():
    global _sync_task
    if _sync_task:
        _sync_task.cancel()
        server_logger.info("Stopped puzzle sync background task")
