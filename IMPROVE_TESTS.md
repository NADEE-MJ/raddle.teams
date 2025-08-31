 Plan to Optimize Slow Tests
1. Fix WebSocket Real-time Updates

- Investigate why WebSocket updates are failing and fix the underlying issue
- Replace arbitrary wait_for_websocket_update() delays with actual WebSocket event listeners
- This should eliminate the need for fallback page refreshes

2. Reduce Unnecessary Waits

- Replace wait_for_websocket_update(delay) calls with more targeted waiting
- Implement proper WebSocket event waiting instead of arbitrary timeouts
- Reduce default timeouts for wait_for_player_count() from 15s to 5s

3. Optimize Concurrent Operations

- Make player joins happen in parallel rather than sequentially where possible
- Use Promise.all() or similar patterns for concurrent browser operations

4. Improve WebSocket Event Handling

- Add proper WebSocket event listeners in the frontend for player join/leave events
- Create helper functions to wait for specific WebSocket events rather than arbitrary delays

5. Reduce Timeout Values

- Lower the default timeout for wait_for_player_count() from 15000ms to 5000ms
- Use progressive timeout reduction (start with shorter timeouts, only extend if needed)

This should reduce test execution time from ~15-20 seconds per test to ~3-5 seconds by eliminating unnecessary
waits and fixing the underlying WebSocket reliability issues.