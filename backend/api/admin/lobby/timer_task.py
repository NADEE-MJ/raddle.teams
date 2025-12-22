"""Background task for handling round timer expiry."""

import asyncio
from datetime import datetime, timezone
from typing import Dict

from sqlmodel import select

from backend.custom_logging import api_logger
from backend.database import get_session_context
from backend.database.models import Game
from backend.websocket.events import TimerExpiredEvent
from backend.websocket.managers import lobby_websocket_manager

# Keep references to running timer tasks to prevent garbage collection
_active_timer_tasks: Dict[int, asyncio.Task] = {}


def cancel_timer(lobby_id: int) -> bool:
    """
    Cancel a running timer task for a lobby.

    Args:
        lobby_id: The lobby ID

    Returns:
        True if a timer was cancelled, False if no timer was running
    """
    if lobby_id in _active_timer_tasks:
        task = _active_timer_tasks[lobby_id]
        if not task.done():
            task.cancel()
            api_logger.info(f"Cancelled timer task for lobby_id={lobby_id}")
        del _active_timer_tasks[lobby_id]
        return True
    return False


async def schedule_timer_expiry(lobby_id: int, duration_seconds: int):
    """
    Schedule a task to automatically end the game when the timer expires.

    This function:
    1. Sleeps for the duration of the timer
    2. Checks if the timer is still active (not manually ended)
    3. Broadcasts TIMER_EXPIRED event
    4. Calls end_game to finish the round

    Args:
        lobby_id: The lobby ID
        duration_seconds: How long to wait before ending the game
    """
    api_logger.info(
        f"[TIMER] Starting timer task for lobby_id={lobby_id}, duration={duration_seconds}s, "
        f"task_id={id(asyncio.current_task())}"
    )

    try:
        # Sleep for the timer duration
        api_logger.info(f"[TIMER] lobby_id={lobby_id} sleeping for {duration_seconds}s...")
        await asyncio.sleep(duration_seconds)

        api_logger.info(f"[TIMER] lobby_id={lobby_id} sleep completed, checking if still active")

        # Check if the timer is still active (game not manually ended)
        async with get_session_context() as session:
            # Get active games with timer set
            api_logger.info(f"[TIMER] lobby_id={lobby_id} querying active games with timer...")
            active_games_with_timer = session.exec(
                select(Game)
                .where(Game.lobby_id == lobby_id)
                .where(Game.completed_at.is_(None))
                .where(Game.timer_started_at.isnot(None))
                .where(Game.puzzle_path != "")
            ).all()

            if not active_games_with_timer:
                api_logger.info(
                    f"[TIMER] lobby_id={lobby_id} - no active games with timer found (game may have been manually ended)"
                )
                return

            api_logger.info(f"[TIMER] lobby_id={lobby_id} found {len(active_games_with_timer)} active games with timer")

            # Check if timer actually expired (verify it wasn't canceled)
            first_game = active_games_with_timer[0]
            if not first_game.timer_started_at or not first_game.timer_duration_seconds:
                api_logger.info(f"[TIMER] lobby_id={lobby_id} timer data missing, skipping auto-end")
                return

            # Calculate if timer actually expired
            from datetime import timedelta

            expected_expiry = first_game.timer_started_at + timedelta(seconds=first_game.timer_duration_seconds)
            now = datetime.now(timezone.utc)

            api_logger.info(
                f"[TIMER] lobby_id={lobby_id} expiry check: now={now.isoformat()}, expected_expiry={expected_expiry.isoformat()}"
            )

            if now < expected_expiry:
                # Timer was canceled or reset, don't end the game
                api_logger.info(f"[TIMER] lobby_id={lobby_id} timer was canceled or reset, skipping auto-end")
                return

            api_logger.info(f"[TIMER] lobby_id={lobby_id} timer confirmed expired, broadcasting TIMER_EXPIRED event")

            # Broadcast TIMER_EXPIRED event
            timer_expired_event = TimerExpiredEvent(lobby_id=lobby_id)
            await lobby_websocket_manager.broadcast_to_lobby(lobby_id, timer_expired_event)

            # Small delay to let the event propagate
            await asyncio.sleep(0.5)

        # Import end_game here to avoid circular imports
        from backend.api.admin.lobby.index import end_game

        # Call end_game to finish the round
        # We need to create a new session for this
        api_logger.info(f"[TIMER] lobby_id={lobby_id} calling end_game to finish the round...")
        async with get_session_context() as session:
            try:
                await end_game(lobby_id, session)
                api_logger.info(f"[TIMER] lobby_id={lobby_id} ✓ Successfully auto-ended game due to timer expiry")
            except Exception as e:
                api_logger.exception(f"[TIMER] lobby_id={lobby_id} ✗ Failed to auto-end game: {e}")

    except asyncio.CancelledError:
        api_logger.info(f"[TIMER] lobby_id={lobby_id} timer task was cancelled")
        raise
    except Exception as e:
        api_logger.exception(f"[TIMER] lobby_id={lobby_id} unexpected error in timer task: {e}")
    finally:
        # Clean up task reference
        if lobby_id in _active_timer_tasks:
            del _active_timer_tasks[lobby_id]
            api_logger.info(f"[TIMER] lobby_id={lobby_id} cleaned up task reference")


def start_timer(lobby_id: int, duration_seconds: int) -> asyncio.Task:
    """
    Start a timer task for a lobby and keep a reference to prevent garbage collection.

    Args:
        lobby_id: The lobby ID
        duration_seconds: How long to wait before ending the game

    Returns:
        The created asyncio.Task
    """
    # Cancel any existing timer for this lobby
    cancel_timer(lobby_id)

    # Create and store the task
    task = asyncio.create_task(schedule_timer_expiry(lobby_id, duration_seconds))
    _active_timer_tasks[lobby_id] = task

    api_logger.info(
        f"[TIMER] Created and registered timer task for lobby_id={lobby_id}, "
        f"active_tasks={len(_active_timer_tasks)}, task_id={id(task)}"
    )

    return task
