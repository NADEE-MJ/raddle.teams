# TODO

## Testing

### tests to look into in the future

1. reconnect flow test
2. lobby no session access
3. duplicate player names

### e2e tests to create (some could probably be unit tests instead)

1. ***should rewrite e2e tests to cover main flows***
2. ***should write python unit tests to cover all backend flows***
3. ***should write vite unit tests to cover all frontend flows***

#### some edge cases that should probably be tested

1. test admin sees a player leaving and joining via websocket updates (i think this already exists)
2. Test invalid team assignments: Try to move player to non-existent team ID
3. Test team creation limits: Create teams with 0, 1, 11+ teams (should fail)
4. Test team operations on empty lobbies: Try to create teams with no players
5. Test unassigned player kicks: Kick unassigned players vs assigned players
6. Test team operations during game: Try to modify teams while game is active (should fail)
7. Test game start requirements: Verify game can't start with unassigned players

#### this is entirely for admins and is prob not worth but Team Display & Progress (based on current_word_index field) could maybe be unit tested

1. Test team progress display: Verify teams show correct progress/word index
2. Test progress updates: If game functionality exists, test progress synchronization
3. Test completed team display: Test teams that have finished vs active teams

#### these seem like they will never happen but maybe should add ways to handle this stuff for real world scenarios????

1. Test player UI during rapid team changes: Admin rapidly switching player between teams
2. Test WebSocket connection drops during team assignment: Player loses connection mid-assignment
3. Test player refresh during team operations: Player reloads page while being moved
4. Test simultaneous team operations: Multiple admins trying to create teams simultaneously
5. Test race conditions: Player leaving while admin is moving them to a team
6. Test WebSocket message ordering: Ensure events arrive in correct sequence during rapid operations
7. Test admin permission conflicts: Two admins trying to modify same player simultaneously
8. Test admin session isolation: One admin's actions don't affect other admin's WebSocket connections

## TASKS

1. send individual team assignments to players via websockets instead of just a teams assigned update and forcing a reload
2. admin loading icon is not centered on the page, same with lobby, same with game i believe
3. provide a better error screen than the vite error page:
   1. 💿 Hey developer 👋
   2. You can provide a way better UX than this when your app throws errors by providing your own ErrorBoundary or errorElement prop on your route.
4. add setup instructions to the readme / create a separate setup.md file / clean up the readme
   1. npm ci && uv sync
   2. create .env file with new envs
5. enforce max length on ladder step input?
6. create a broadcast to other players in lobby and broadcast to self
   1. broadcast to others can be used for events like players being kicked
   2. broadcast to self can be used for events like "you have been kicked"
7. implement message handling for broadcasts
   1. specifically in the continuous listening loop for websockets, maybe not worth it in the lobby?
   2. could be used for chat messages, game updates, etc
8. What should happen in web sockets it it fails to broadcast to a player?
   1. currently it just ignores it, but should it remove the player from the lobby?
   2. should it log the error somewhere more permanent than just the console?
   3. should it notify the admin that a player has been disconnected?
   4. should it attempt to reconnect to the player
   5. should it resend the message later?
9. implement better error handling for websockets in general. add websocket reconnection logic everywhere on the frontend
10. - in a answer should probably show as something else or maybe just dont include those
11. when someone gets kicked they should be sent back to the home page
12. show the admin websocket connected status on the page somewhere
13. when a new game starts everyone should be sent to the new game page even if they are looking at the old game page


## BUGS
