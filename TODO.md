Things to fix:

1. admin loading icon is not centered on the page, same with lobby, same with game i believe

tests to look into in the future:

1. reconnect flow test
2. lobby no session access
3. duplicate player names

tests to create:

1. test admin sees a player leaving and joining via websocket updates (i think this already exists)
│ │ - Test invalid team assignments: Try to move player to non-existent team ID                                                                                                                                                                                        │ │
│ │ - Test team creation limits: Create teams with 0, 1, 11+ teams (should fail)                                                                                                                                                                                       │ │
│ │ - Test team operations on empty lobbies: Try to create teams with no players                                                                                                                                                                                       │ │
│ │ - Test unassigned player kicks: Kick unassigned players vs assigned players                                                                                                                                                                                        │ │
│ │ - Test team operations during game: Try to modify teams while game is active (should fail)                                                                                                                                                                         │ │
│ │ - Test game start requirements: Verify game can't start with unassigned players                                                                                                                                                                                    │ │

this is entirely for admins and is prob not worth but Team Display & Progress (based on current_word_index field)                                                                                                                                                                                                     │ │
│ │                                                                                                                                                                                                                                                                    │ │
│ │ - Test team progress display: Verify teams show correct progress/word index                                                                                                                                                                                        │ │
│ │ - Test progress updates: If game functionality exists, test progress synchronization                                                                                                                                                                               │ │
│ │ - Test completed team display: Test teams that have finished vs active teams

these seem like they will never happen but maybe should add ways to handle this stuff for real world scenarios????
│ │ - Test player UI during rapid team changes: Admin rapidly switching player between teams                                                                                                                                                                           │ │
│ │ - Test WebSocket connection drops during team assignment: Player loses connection mid-assignment                                                                                                                                                                   │ │
│ │ - Test player refresh during team operations: Player reloads page while being moved                                                                                                                                                                                │ │
│ │ - Test simultaneous team operations: Multiple admins trying to create teams simultaneously                                                                                                                                                                         │ │
│ │ - Test race conditions: Player leaving while admin is moving them to a team                                                                                                                                                                                        │ │
│ │ - Test WebSocket message ordering: Ensure events arrive in correct sequence during rapid operations                                                                                                                                                                │ │
│ │ - Test admin permission conflicts: Two admins trying to modify same player simultaneously                                                                                                                                                                          │ │
│ │ - Test admin session isolation: One admin's actions don't affect other admin's WebSocket connections                                                                                                                                                               │ │



pages to fix:
Tutorial page
lobby, lobby context, layout
admin, admin context, layout
Game, game context, layout