---
name: hint-vote-system
description: Plan to add team-voted hints to websocket game
---

# Plan

Implement a team-voted hint system in the real-time game by porting the tutorial hint behavior to the websocket game flow, adding server-authoritative votes, syncing state to clients, and applying a points cap reduction per hint.

## Requirements
- Reuse tutorial hint behavior in the live game: first hint reveals the correct clue, second hint reveals the word.
- Add a team vote for using a hint; hint triggers only if majority votes yes.
- Applying a hint reduces the team’s max possible points for the round (per hint).
- All clients see vote status, hint usage, and updated scoring cap in real time.

## Scope
- In: websocket events, backend game state, frontend game UI, score calculation/summary.
- Out: tutorial behavior changes (unless needed for shared components), admin tooling beyond showing hint usage.

## Files and entry points
- Backend websocket + game logic: `backend/api/game.py`, `backend/websocket/events.py`, `backend/websocket/managers.py`
- Scoring/round results: `backend/api/admin/lobby/index.py`, `backend/database/models.py`
- Frontend game UI/state: `frontend/src/pages/GamePage/index.tsx`, `frontend/src/pages/GamePage/Clues.tsx`, `frontend/src/pages/GamePage/LadderStep.tsx`, `frontend/src/hooks/useGameState.ts`
- Tutorial reference: `frontend/src/services/TutorialStateMachine.ts`, `frontend/src/pages/TutorialPage/Clues.tsx`, `frontend/src/components/HintConfirmationModal.tsx`

## Data model / API changes
- Add per-team hint tracking in game state: hints used by step, current hint phase (0/1/2), and cumulative hint penalty.
- Add team hint vote state: voters, vote tally, required majority threshold.
- Define websocket events for hint vote started/updated, hint applied, and score-cap update.

## Action items
[ ] Review tutorial hint flow and map the minimum logic needed for the live game (clue reveal then word reveal, max 2).
[ ] Define backend hint vote rules (majority definition, timeouts/cancelation, re-vote behavior) and add server-authoritative state.
[ ] Add websocket event types and handlers for hint vote lifecycle and hint application.
[ ] Integrate hint usage into game state updates sent to clients; update client state/store.
[ ] Port UI affordances: hint button, confirmation modal, vote UI, and clue/word reveal styling.
[ ] Apply scoring cap reduction logic in round results and surface it in UI/admin summary.
[ ] Add/adjust tests for hint usage, votes, and score calculation.

## Testing and validation
- Backend: unit tests for hint vote majority logic and scoring cap reduction.
- Frontend: component tests for hint button/vote UI and clue/word reveal behavior.
- Manual: run a lobby with multiple players, simulate vote, ensure hint applies only after majority.

## Risks and edge cases
- Race conditions if multiple hint votes overlap or a vote is triggered during step change.
- Majority definition with disconnected players or late joiners.
- Score cap reductions stacking correctly across multiple hints and multiple steps.
- Sync issues between server state and client UI during rapid updates.

## Open questions
- How should hint penalties scale? Options: 0.5 for clue, 1 for word; or 0.5 for both.
- What counts toward “majority” — current connected players on the team, or full team size?
- Should hint votes expire after a timeout or be cancelable?
