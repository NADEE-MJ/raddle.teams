"""Periodic poller for checking and handling expired timers."""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlmodel import select

from backend.custom_logging import api_logger
from backend.database import get_session_context
from backend.database.models import Game
from backend.websocket.events import TimerExpiredEvent
from backend.websocket.managers import lobby_websocket_manager

# Global poller task reference
_poller_task: Optional[asyncio.Task] = None
_poller_running = False


async def check_expired_timers():
    """
    Check all active games for expired timers and handle them.

    This function:
    1. Finds all active games with timers set
    2. Checks if any have expired
    3. For each expired timer:
       - Broadcasts TIMER_EXPIRED event
       - Calls end_game to finish the round
       - Marks the timer as handled
    """
    try:
        async with get_session_context() as session:
            # Find all active games with timers
            now = datetime.now(timezone.utc)

            active_games_with_timer = session.exec(
                select(Game)
                .where(Game.completed_at.is_(None))
                .where(Game.timer_started_at.isnot(None))
                .where(Game.timer_duration_seconds.isnot(None))
                .where(Game.puzzle_path != "")
            ).all()

            if not active_games_with_timer:
                return

            # Group games by lobby_id to process one per lobby
            lobbies_with_expired_timers = set()

            for game in active_games_with_timer:
                # Calculate expiry time
                # Ensure timer_started_at is timezone-aware
                timer_started = game.timer_started_at
                if timer_started.tzinfo is None:
                    timer_started = timer_started.replace(tzinfo=timezone.utc)

                expires_at = timer_started + timedelta(seconds=game.timer_duration_seconds)

                # Check if expired
                if now >= expires_at:
                    lobby_id = game.lobby_id
                    if lobby_id not in lobbies_with_expired_timers:
                        lobbies_with_expired_timers.add(lobby_id)
                        api_logger.info(
                            f"[TIMER_POLLER] Detected expired timer for lobby_id={lobby_id} "
                            f"(expired at {expires_at.isoformat()})"
                        )

            # Process each lobby with expired timer
            for lobby_id in lobbies_with_expired_timers:
                try:
                    # Broadcast TIMER_EXPIRED event
                    timer_expired_event = TimerExpiredEvent(lobby_id=lobby_id)
                    await lobby_websocket_manager.broadcast_to_lobby(lobby_id, timer_expired_event)

                    # Small delay to let the event propagate
                    await asyncio.sleep(0.1)

                    # Import end_game here to avoid circular imports
                    from backend.api.admin.lobby.index import end_game

                    # Call end_game to finish the round
                    api_logger.info(f"[TIMER_POLLER] Auto-ending game for lobby_id={lobby_id}...")
                    async with get_session_context() as end_game_session:
                        await end_game(lobby_id, end_game_session)

                    api_logger.info(
                        f"[TIMER_POLLER] ✓ Successfully auto-ended game for lobby_id={lobby_id} due to timer expiry"
                    )

                except Exception as e:
                    api_logger.exception(f"[TIMER_POLLER] ✗ Failed to auto-end game for lobby_id={lobby_id}: {e}")

    except Exception as e:
        api_logger.exception(f"[TIMER_POLLER] Error checking expired timers: {e}")


async def timer_poller_loop():
    """
    Main polling loop that runs continuously.
    Checks for expired timers every 0.1 seconds for near-instant detection.
    """
    global _poller_running

    api_logger.info("[TIMER_POLLER] Starting timer poller loop")
    _poller_running = True

    try:
        while _poller_running:
            await check_expired_timers()
            await asyncio.sleep(0.1)  # Check every 0.1 seconds for near-instant detection

    except asyncio.CancelledError:
        api_logger.info("[TIMER_POLLER] Timer poller loop cancelled")
        raise
    except Exception as e:
        api_logger.exception(f"[TIMER_POLLER] Unexpected error in poller loop: {e}")
    finally:
        _poller_running = False
        api_logger.info("[TIMER_POLLER] Timer poller loop stopped")


def start_timer_poller():
    """
    Start the timer poller background task.
    Safe to call multiple times - will only start one poller.
    """
    global _poller_task, _poller_running

    if _poller_task and not _poller_task.done():
        api_logger.info("[TIMER_POLLER] Poller already running, skipping start")
        return

    _poller_task = asyncio.create_task(timer_poller_loop())
    api_logger.info(f"[TIMER_POLLER] Started timer poller task (task_id={id(_poller_task)})")


def stop_timer_poller():
    """Stop the timer poller background task."""
    global _poller_task, _poller_running

    _poller_running = False

    if _poller_task and not _poller_task.done():
        _poller_task.cancel()
        api_logger.info("[TIMER_POLLER] Stopped timer poller task")
