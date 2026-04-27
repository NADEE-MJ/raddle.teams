# Team Hint Voting System - Implementation Plan

## Overview

Add a team-based hint voting system to the websocket game, porting the tutorial's hint functionality with the following enhancements:
- All team members vote on whether to use a hint
- Two hint types: Clue Reveal (-0.5 pts) and Word Reveal (-1.0 pts)
- Majority vote (>50%) required with 30-second timeout
- Unlimited hints allowed, but can't reduce points below 0
- Real-time voting UI visible to all team members

## Requirements Summary

| Aspect | Specification |
|--------|---------------|
| **Hint Types** | 1. Clue Reveal (💡): -0.5 pts<br>2. Word Reveal (👁️): -1.0 pts |
| **Voting Rules** | Majority (>50%) required, ties = rejection |
| **Vote Timeout** | 30 seconds, auto-reject if incomplete |
| **Hint Limits** | Unlimited per puzzle (cannot go negative) |
| **Point Floor** | Teams cannot have negative points |

---

## 1. Database Schema Changes

### 1.1 New Table: `HintUsage`

Track all hints used by teams for scoring and analytics.

```python
# backend/database/models.py

class HintUsage(SQLModel, table=True):
    """Records each hint used by a team during a game"""
    __tablename__ = "hint_usage"

    id: Optional[int] = Field(default=None, primary_key=True)
    game_id: int = Field(foreign_key="game.id", ondelete="CASCADE")
    team_id: int = Field(foreign_key="team.id", ondelete="CASCADE")
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")

    # Hint details
    hint_type: str = Field(...)  # "clue_reveal" or "word_reveal"
    word_index: int = Field(...)  # Which word/step the hint was for
    point_penalty: float = Field(...)  # 0.5 or 1.0

    # Voting metadata (for debugging/analytics)
    total_voters: int = Field(...)  # Number of team members
    yes_votes: int = Field(...)
    no_votes: int = Field(...)

    # Timestamps
    vote_started_at: datetime = Field(default_factory=datetime.utcnow)
    vote_completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 1.2 Modify `Game` Table

Add field to track accumulated hint penalties for easy scoring.

```python
# backend/database/models.py - add to Game class

class Game(SQLModel, table=True):
    # ... existing fields ...
    hint_penalty_total: float = Field(default=0.0)  # Accumulated penalties
```

### 1.3 Migration Script

```bash
# Create migration
alembic revision --autogenerate -m "add_hint_voting_system"
alembic upgrade head
```

---

## 2. Backend Implementation

### 2.1 WebSocket Events

Add new event types to handle hint voting flow.

```python
# backend/websocket/events.py

# New event types
class HintVoteStartedEvent(BaseModel):
    """Sent to all team members when someone requests a hint"""
    type: Literal["HINT_VOTE_STARTED"] = "HINT_VOTE_STARTED"
    vote_id: str  # UUID for this vote session
    hint_type: str  # "clue_reveal" or "word_reveal"
    word_index: int
    requester_name: str  # Who initiated the hint request
    timeout_seconds: int = 30
    point_penalty: float  # 0.5 or 1.0

class HintVoteReceivedEvent(BaseModel):
    """Sent to all team members when a vote is cast"""
    type: Literal["HINT_VOTE_RECEIVED"] = "HINT_VOTE_RECEIVED"
    vote_id: str
    player_name: str  # Who voted (for transparency)
    vote: bool  # True = yes, False = no
    votes_received: int
    votes_needed: int

class HintVoteResultEvent(BaseModel):
    """Sent when vote completes (pass/fail/timeout)"""
    type: Literal["HINT_VOTE_RESULT"] = "HINT_VOTE_RESULT"
    vote_id: str
    hint_type: str
    word_index: int
    approved: bool
    reason: str  # "majority_approved", "majority_rejected", "timeout", "tie"
    yes_votes: int
    no_votes: int
    total_voters: int

class HintAppliedEvent(BaseModel):
    """Sent when hint is actually applied to game state"""
    type: Literal["HINT_APPLIED"] = "HINT_APPLIED"
    hint_type: str
    word_index: int
    point_penalty: float
    total_penalties: float  # Accumulated for this game

    # For clue_reveal hints
    relevant_clue_index: Optional[int] = None

    # For word_reveal hints
    revealed_word: Optional[str] = None

class HintErrorEvent(BaseModel):
    """Sent if hint request fails validation"""
    type: Literal["HINT_ERROR"] = "HINT_ERROR"
    error: str
    hint_type: str
    word_index: int
```

### 2.2 Vote State Management

Server-side vote tracking (in-memory, per team).

```python
# backend/websocket/managers.py - add to LobbyWebSocketManager

class VoteSession:
    """Tracks an active hint vote for a team"""
    def __init__(self, vote_id: str, hint_type: str, word_index: int,
                 team_id: int, lobby_id: int, requester_session_id: str,
                 total_voters: int, point_penalty: float):
        self.vote_id = vote_id
        self.hint_type = hint_type
        self.word_index = word_index
        self.team_id = team_id
        self.lobby_id = lobby_id
        self.requester_session_id = requester_session_id
        self.total_voters = total_voters
        self.point_penalty = point_penalty

        self.votes: Dict[str, bool] = {}  # player_session_id -> yes/no
        self.started_at = datetime.utcnow()
        self.timeout_task: Optional[asyncio.Task] = None

    def add_vote(self, player_session_id: str, vote: bool):
        self.votes[player_session_id] = vote

    def is_complete(self) -> bool:
        return len(self.votes) == self.total_voters

    def get_result(self) -> tuple[bool, str]:
        """Returns (approved, reason)"""
        yes_count = sum(1 for v in self.votes.values() if v)
        no_count = len(self.votes) - yes_count

        if yes_count > self.total_voters / 2:
            return (True, "majority_approved")
        elif yes_count == no_count:
            return (False, "tie")
        else:
            return (False, "majority_rejected")

# Add to LobbyWebSocketManager class
class LobbyWebSocketManager:
    def __init__(self):
        # ... existing fields ...
        self.active_votes: Dict[str, VoteSession] = {}  # vote_id -> VoteSession

    async def start_hint_vote(self, team_id: int, lobby_id: int,
                               hint_type: str, word_index: int,
                               requester_session_id: str) -> str:
        """Initiates a hint vote for a team"""
        # Generate unique vote ID
        vote_id = str(uuid.uuid4())

        # Count team members
        total_voters = sum(
            1 for sid, tid in self.player_teams.items()
            if tid == team_id and sid in self.lobby_websockets.get(lobby_id, {})
        )

        # Determine point penalty
        point_penalty = 0.5 if hint_type == "clue_reveal" else 1.0

        # Create vote session
        vote = VoteSession(
            vote_id, hint_type, word_index, team_id, lobby_id,
            requester_session_id, total_voters, point_penalty
        )
        self.active_votes[vote_id] = vote

        # Set timeout
        vote.timeout_task = asyncio.create_task(
            self._handle_vote_timeout(vote_id)
        )

        return vote_id

    async def _handle_vote_timeout(self, vote_id: str):
        """Auto-reject vote after 30 seconds"""
        await asyncio.sleep(30)

        if vote_id in self.active_votes:
            vote = self.active_votes[vote_id]
            if not vote.is_complete():
                # Force rejection
                await self._finalize_vote(vote_id, approved=False, reason="timeout")

    async def cast_vote(self, vote_id: str, player_session_id: str, vote: bool):
        """Records a player's vote"""
        if vote_id not in self.active_votes:
            raise ValueError("Vote not found")

        vote_session = self.active_votes[vote_id]
        vote_session.add_vote(player_session_id, vote)

        # Broadcast vote received
        from backend.database.models import Player
        from backend.dependencies import get_session

        with get_session() as session:
            player = session.exec(
                select(Player).where(Player.session_id == player_session_id)
            ).first()

            await self.broadcast_to_team(
                vote_session.lobby_id,
                vote_session.team_id,
                HintVoteReceivedEvent(
                    vote_id=vote_id,
                    player_name=player.name,
                    vote=vote,
                    votes_received=len(vote_session.votes),
                    votes_needed=vote_session.total_voters
                ).dict()
            )

        # Check if complete
        if vote_session.is_complete():
            approved, reason = vote_session.get_result()
            await self._finalize_vote(vote_id, approved, reason)

    async def _finalize_vote(self, vote_id: str, approved: bool, reason: str):
        """Completes a vote and applies hint if approved"""
        vote = self.active_votes[vote_id]

        # Cancel timeout task
        if vote.timeout_task:
            vote.timeout_task.cancel()

        # Broadcast result
        yes_count = sum(1 for v in vote.votes.values() if v)
        no_count = len(vote.votes) - yes_count

        await self.broadcast_to_team(
            vote.lobby_id,
            vote.team_id,
            HintVoteResultEvent(
                vote_id=vote_id,
                hint_type=vote.hint_type,
                word_index=vote.word_index,
                approved=approved,
                reason=reason,
                yes_votes=yes_count,
                no_votes=no_count,
                total_voters=vote.total_voters
            ).dict()
        )

        # Apply hint if approved
        if approved:
            await self._apply_hint(vote)

        # Cleanup
        del self.active_votes[vote_id]

    async def _apply_hint(self, vote: VoteSession):
        """Applies the hint to game state and broadcasts"""
        from backend.dependencies import get_session
        from backend.database.models import Game, HintUsage, Team
        from backend.game.state_machine import TeamStateMachine

        with get_session() as session:
            # Get game
            game = session.exec(
                select(Game).where(
                    Game.team_id == vote.team_id
                ).order_by(Game.created_at.desc())
            ).first()

            if not game:
                return

            # Update hint penalty
            game.hint_penalty_total += vote.point_penalty

            # Record hint usage
            hint_usage = HintUsage(
                game_id=game.id,
                team_id=vote.team_id,
                lobby_id=vote.lobby_id,
                hint_type=vote.hint_type,
                word_index=vote.word_index,
                point_penalty=vote.point_penalty,
                total_voters=vote.total_voters,
                yes_votes=sum(1 for v in vote.votes.values() if v),
                no_votes=len(vote.votes) - sum(1 for v in vote.votes.values() if v),
                vote_started_at=vote.started_at,
                vote_completed_at=datetime.utcnow()
            )
            session.add(hint_usage)

            # Apply hint based on type
            if vote.hint_type == "word_reveal":
                # Reveal the word (similar to tutorial's second hint)
                state_machine = TeamStateMachine(game.team_id, session)
                puzzle = state_machine.get_puzzle()
                revealed_word = puzzle.ladder[vote.word_index].word

                # Add to revealed steps
                revealed_steps = set(json.loads(game.revealed_steps))
                revealed_steps.add(vote.word_index)
                game.revealed_steps = json.dumps(list(revealed_steps))

                # Check completion
                if len(revealed_steps) == len(puzzle.ladder):
                    game.completed_at = datetime.utcnow()

                game.last_updated_at = datetime.utcnow()

                # Broadcast hint applied with revealed word
                await self.broadcast_to_team(
                    vote.lobby_id,
                    vote.team_id,
                    HintAppliedEvent(
                        hint_type=vote.hint_type,
                        word_index=vote.word_index,
                        point_penalty=vote.point_penalty,
                        total_penalties=game.hint_penalty_total,
                        revealed_word=revealed_word
                    ).dict()
                )

                # Also send state update
                await self.broadcast_to_team(
                    vote.lobby_id,
                    vote.team_id,
                    StateUpdateEvent(
                        revealed_steps=list(revealed_steps),
                        is_completed=game.completed_at is not None,
                        last_updated_at=game.last_updated_at.isoformat()
                    ).dict()
                )

            elif vote.hint_type == "clue_reveal":
                # Reveal which clue is relevant
                state_machine = TeamStateMachine(game.team_id, session)
                puzzle = state_machine.get_puzzle()

                # Get the relevant clue for this word
                target_word = puzzle.ladder[vote.word_index].word
                relevant_clue_index = None

                for idx, clue in enumerate(puzzle.clues):
                    if clue.answer.lower() == target_word.lower():
                        relevant_clue_index = idx
                        break

                # Broadcast hint applied with clue info
                await self.broadcast_to_team(
                    vote.lobby_id,
                    vote.team_id,
                    HintAppliedEvent(
                        hint_type=vote.hint_type,
                        word_index=vote.word_index,
                        point_penalty=vote.point_penalty,
                        total_penalties=game.hint_penalty_total,
                        relevant_clue_index=relevant_clue_index
                    ).dict()
                )

            session.commit()
```

### 2.3 WebSocket Message Handlers

Add handlers for hint actions.

```python
# backend/websocket/api.py - add to handle_game_message()

async def handle_game_message(
    message: dict,
    player_session_id: str,
    lobby_id: int,
    websocket_manager: LobbyWebSocketManager,
    websocket: WebSocket
):
    action = message.get("action")

    # ... existing handlers ...

    elif action == "request_hint":
        # Player wants to start a hint vote
        hint_type = message.get("hint_type")  # "clue_reveal" or "word_reveal"
        word_index = message.get("word_index")

        # Validate
        if hint_type not in ["clue_reveal", "word_reveal"]:
            await websocket_manager.send_to_player(
                lobby_id, player_session_id,
                HintErrorEvent(
                    error="Invalid hint type",
                    hint_type=hint_type,
                    word_index=word_index
                ).dict()
            )
            return

        # Get player's team
        team_id = websocket_manager.player_teams.get(player_session_id)
        if not team_id:
            return

        # Check if word already revealed
        with get_session() as session:
            game = session.exec(
                select(Game).where(Game.team_id == team_id)
                .order_by(Game.created_at.desc())
            ).first()

            if not game:
                return

            revealed_steps = set(json.loads(game.revealed_steps))
            if word_index in revealed_steps:
                await websocket_manager.send_to_player(
                    lobby_id, player_session_id,
                    HintErrorEvent(
                        error="Word already revealed",
                        hint_type=hint_type,
                        word_index=word_index
                    ).dict()
                )
                return

            # Get requester name
            player = session.exec(
                select(Player).where(Player.session_id == player_session_id)
            ).first()

        # Start vote
        vote_id = await websocket_manager.start_hint_vote(
            team_id, lobby_id, hint_type, word_index, player_session_id
        )

        # Broadcast vote started
        point_penalty = 0.5 if hint_type == "clue_reveal" else 1.0
        await websocket_manager.broadcast_to_team(
            lobby_id, team_id,
            HintVoteStartedEvent(
                vote_id=vote_id,
                hint_type=hint_type,
                word_index=word_index,
                requester_name=player.name,
                timeout_seconds=30,
                point_penalty=point_penalty
            ).dict()
        )

    elif action == "vote_hint":
        # Player casts their vote
        vote_id = message.get("vote_id")
        vote = message.get("vote")  # True = yes, False = no

        try:
            await websocket_manager.cast_vote(vote_id, player_session_id, vote)
        except ValueError as e:
            await websocket_manager.send_to_player(
                lobby_id, player_session_id,
                {"type": "ERROR", "message": str(e)}
            )
```

### 2.4 Scoring Integration

Modify point calculation to account for hint penalties.

```python
# backend/api/admin/lobby/index.py - modify calculate_points()

def calculate_points(
    placement: int,
    total_teams: int,
    completion_percentage: float,
    is_dnf: bool,
    hint_penalty: float = 0.0  # NEW PARAMETER
) -> int:
    """
    Calculate points for a team based on placement and completion.

    Args:
        placement: Team's placement (1-indexed)
        total_teams: Total number of teams in the game
        completion_percentage: Percentage of puzzle completed (0.0-1.0)
        is_dnf: Whether the team did not finish
        hint_penalty: Total point penalty from hints used

    Returns:
        Points earned (minimum 0)
    """
    if not is_dnf:
        # Placement-based scoring: 1st place gets n points, 2nd gets n-1, etc.
        base_points = total_teams - placement + 1
    else:
        # DNF scoring based on completion percentage
        # Get the points of the worst-placed team that finished
        worst_finished_points = 1  # Last place always gets 1 point

        # Cap DNF points at 75% of worst finisher
        cap = worst_finished_points * 0.75
        base_points = max(1, ceil(min(cap, worst_finished_points * completion_percentage)))

    # Subtract hint penalties (cannot go negative)
    final_points = max(0, base_points - hint_penalty)

    return int(final_points)


# backend/api/admin/lobby/index.py - modify end_game() endpoint

@router.post("/lobby/{lobby_id}/end")
async def end_game(lobby_id: int, web_session_id: str = Cookie(None)):
    # ... existing validation ...

    # Get all teams and their game states
    teams = session.exec(select(Team).where(Team.lobby_id == lobby_id)).all()
    team_data = []

    for team in teams:
        game = session.exec(
            select(Game).where(Game.team_id == team.id)
            .order_by(Game.created_at.desc())
        ).first()

        if game:
            revealed_steps = set(json.loads(game.revealed_steps))
            puzzle = get_puzzle_by_path(game.puzzle_path)
            completion_percentage = len(revealed_steps) / len(puzzle.ladder)

            team_data.append({
                "team": team,
                "game": game,
                "completion_percentage": completion_percentage,
                "is_completed": game.completed_at is not None,
                "completed_at": game.completed_at,
                "hint_penalty": game.hint_penalty_total  # NEW FIELD
            })

    # ... existing placement logic ...

    # Calculate points for each team
    for data in team_data:
        placement = data["placement"]
        is_dnf = not data["is_completed"]

        points = calculate_points(
            placement=placement,
            total_teams=len(teams),
            completion_percentage=data["completion_percentage"],
            is_dnf=is_dnf,
            hint_penalty=data["hint_penalty"]  # NEW PARAMETER
        )

        # ... rest of scoring logic ...
```

---

## 3. Frontend Implementation

### 3.1 UI Components

#### 3.1.1 Hint Button Component

```typescript
// frontend/src/components/HintButton.tsx

interface HintButtonProps {
  hintType: 'clue_reveal' | 'word_reveal';
  wordIndex: number;
  disabled: boolean;
  onRequestHint: (hintType: string, wordIndex: number) => void;
}

export const HintButton: React.FC<HintButtonProps> = ({
  hintType,
  wordIndex,
  disabled,
  onRequestHint
}) => {
  const icon = hintType === 'clue_reveal' ? '💡' : '👁️';
  const label = hintType === 'clue_reveal' ? 'Clue' : 'Word';
  const penalty = hintType === 'clue_reveal' ? '0.5' : '1.0';

  return (
    <button
      onClick={() => onRequestHint(hintType, wordIndex)}
      disabled={disabled}
      className="hint-button"
      title={`Request ${label} Hint (-${penalty} pts)`}
    >
      {icon} {label} (-{penalty})
    </button>
  );
};
```

#### 3.1.2 Voting Modal Component

```typescript
// frontend/src/components/HintVotingModal.tsx

interface HintVotingModalProps {
  voteId: string;
  hintType: string;
  wordIndex: number;
  requesterName: string;
  pointPenalty: number;
  votesReceived: number;
  votesNeeded: number;
  timeRemaining: number;
  hasVoted: boolean;
  onVote: (voteId: string, vote: boolean) => void;
}

export const HintVotingModal: React.FC<HintVotingModalProps> = ({
  voteId,
  hintType,
  wordIndex,
  requesterName,
  pointPenalty,
  votesReceived,
  votesNeeded,
  timeRemaining,
  hasVoted,
  onVote
}) => {
  const hintName = hintType === 'clue_reveal' ? 'Clue Reveal' : 'Word Reveal';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Team Hint Vote</h2>
        <p>
          <strong>{requesterName}</strong> wants to use a <strong>{hintName}</strong> hint
          for word #{wordIndex + 1}
        </p>
        <p className="penalty">This will reduce max points by {pointPenalty}</p>

        <div className="vote-progress">
          <p>Votes: {votesReceived}/{votesNeeded}</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(votesReceived / votesNeeded) * 100}%` }}
            />
          </div>
        </div>

        <div className="timer">
          Time remaining: {timeRemaining}s
        </div>

        {!hasVoted ? (
          <div className="vote-buttons">
            <button onClick={() => onVote(voteId, true)} className="btn-yes">
              Yes, use hint
            </button>
            <button onClick={() => onVote(voteId, false)} className="btn-no">
              No, keep trying
            </button>
          </div>
        ) : (
          <p className="voted-message">Waiting for other team members...</p>
        )}
      </div>
    </div>
  );
};
```

#### 3.1.3 Vote Result Notification

```typescript
// frontend/src/components/HintVoteResult.tsx

interface HintVoteResultProps {
  approved: boolean;
  reason: string;
  hintType: string;
  yesVotes: number;
  noVotes: number;
  onClose: () => void;
}

export const HintVoteResult: React.FC<HintVoteResultProps> = ({
  approved,
  reason,
  hintType,
  yesVotes,
  noVotes,
  onClose
}) => {
  const hintName = hintType === 'clue_reveal' ? 'Clue Reveal' : 'Word Reveal';

  return (
    <div className="notification">
      <h3>{approved ? '✅ Hint Approved!' : '❌ Hint Rejected'}</h3>
      <p>
        {reason === 'majority_approved' && `Team voted to use ${hintName}`}
        {reason === 'majority_rejected' && `Team voted not to use hint`}
        {reason === 'tie' && `Vote tied - hint not used`}
        {reason === 'timeout' && `Vote timed out - hint not used`}
      </p>
      <p>Votes: {yesVotes} Yes, {noVotes} No</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};
```

#### 3.1.4 Hint Penalty Display

```typescript
// frontend/src/components/HintPenaltyDisplay.tsx

interface HintPenaltyDisplayProps {
  totalPenalty: number;
}

export const HintPenaltyDisplay: React.FC<HintPenaltyDisplayProps> = ({
  totalPenalty
}) => {
  if (totalPenalty === 0) return null;

  return (
    <div className="hint-penalty-display">
      <span className="penalty-icon">⚠️</span>
      <span>Hint Penalties: -{totalPenalty} pts</span>
    </div>
  );
};
```

### 3.2 Game State Management

```typescript
// frontend/src/types/game.ts - add to existing types

export interface HintVote {
  voteId: string;
  hintType: 'clue_reveal' | 'word_reveal';
  wordIndex: number;
  requesterName: string;
  pointPenalty: number;
  timeoutSeconds: number;
  votesReceived: number;
  votesNeeded: number;
  hasVoted: boolean;
  startedAt: Date;
}

export interface HintUsed {
  hintType: 'clue_reveal' | 'word_reveal';
  wordIndex: number;
  relevantClueIndex?: number;  // For clue reveals
}

export interface GameState {
  // ... existing fields ...
  activeVote: HintVote | null;
  hintsUsed: Map<number, HintUsed>;  // wordIndex -> hint info
  totalHintPenalty: number;
}
```

### 3.3 WebSocket Integration

```typescript
// frontend/src/pages/GamePage/index.tsx - add event handlers

const GamePage: React.FC = () => {
  const [activeVote, setActiveVote] = useState<HintVote | null>(null);
  const [hintsUsed, setHintsUsed] = useState<Map<number, HintUsed>>(new Map());
  const [totalHintPenalty, setTotalHintPenalty] = useState(0);
  const [voteResult, setVoteResult] = useState<any>(null);

  // ... existing state ...

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'HINT_VOTE_STARTED':
          setActiveVote({
            voteId: message.vote_id,
            hintType: message.hint_type,
            wordIndex: message.word_index,
            requesterName: message.requester_name,
            pointPenalty: message.point_penalty,
            timeoutSeconds: message.timeout_seconds,
            votesReceived: 0,
            votesNeeded: 0,  // Will be updated in VOTE_RECEIVED
            hasVoted: false,
            startedAt: new Date()
          });
          break;

        case 'HINT_VOTE_RECEIVED':
          setActiveVote(prev => prev ? {
            ...prev,
            votesReceived: message.votes_received,
            votesNeeded: message.votes_needed,
            hasVoted: prev.hasVoted  // Keep existing value
          } : null);
          break;

        case 'HINT_VOTE_RESULT':
          setVoteResult({
            approved: message.approved,
            reason: message.reason,
            hintType: message.hint_type,
            yesVotes: message.yes_votes,
            noVotes: message.no_votes
          });
          setActiveVote(null);

          // Auto-dismiss after 3 seconds
          setTimeout(() => setVoteResult(null), 3000);
          break;

        case 'HINT_APPLIED':
          const newHint: HintUsed = {
            hintType: message.hint_type,
            wordIndex: message.word_index,
            relevantClueIndex: message.relevant_clue_index
          };

          setHintsUsed(prev => new Map(prev).set(message.word_index, newHint));
          setTotalHintPenalty(message.total_penalties);

          // If word reveal, add to revealed steps
          if (message.hint_type === 'word_reveal' && message.revealed_word) {
            // Trigger same update as WORD_SOLVED
            handleWordRevealed(message.word_index, message.revealed_word);
          }
          break;

        // ... existing handlers ...
      }
    };
  }, [ws]);

  const handleRequestHint = (hintType: string, wordIndex: number) => {
    if (!ws) return;

    ws.send(JSON.stringify({
      action: 'request_hint',
      hint_type: hintType,
      word_index: wordIndex
    }));
  };

  const handleVote = (voteId: string, vote: boolean) => {
    if (!ws) return;

    ws.send(JSON.stringify({
      action: 'vote_hint',
      vote_id: voteId,
      vote: vote
    }));

    setActiveVote(prev => prev ? { ...prev, hasVoted: true } : null);
  };

  return (
    <div className="game-page">
      {/* Hint penalty display */}
      <HintPenaltyDisplay totalPenalty={totalHintPenalty} />

      {/* Active vote modal */}
      {activeVote && (
        <HintVotingModal
          {...activeVote}
          onVote={handleVote}
        />
      )}

      {/* Vote result notification */}
      {voteResult && (
        <HintVoteResult
          {...voteResult}
          onClose={() => setVoteResult(null)}
        />
      )}

      {/* Game content with hint buttons */}
      {/* ... existing game UI ... */}
    </div>
  );
};
```

### 3.4 Clue Reveal Implementation

```typescript
// frontend/src/components/Clues.tsx - modify to handle hint reveals

interface CluesProps {
  clues: Clue[];
  hintsUsed: Map<number, HintUsed>;
}

export const Clues: React.FC<CluesProps> = ({ clues, hintsUsed }) => {
  // Find which clues have been revealed via hints
  const revealedClueIndices = new Set<number>();

  hintsUsed.forEach((hint) => {
    if (hint.hintType === 'clue_reveal' && hint.relevantClueIndex !== undefined) {
      revealedClueIndices.add(hint.relevantClueIndex);
    }
  });

  return (
    <div className="clues-container">
      {clues.map((clue, index) => (
        <div
          key={index}
          className={`clue ${
            revealedClueIndices.size > 0 && !revealedClueIndices.has(index)
              ? 'greyed-out'
              : 'highlighted'
          }`}
        >
          <span className="clue-number">{index + 1}.</span>
          <span className="clue-text">{clue.text}</span>
          {revealedClueIndices.has(index) && (
            <span className="hint-badge">💡 Hint</span>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 4. Critical Design Decisions & Solutions

### 4.1 Zero/Negative Points Edge Case

**Problem:** Teams using many hints could reach 0 or negative points. How to handle placement when teams have equal points?

**Solution:**
1. **Point Floor:** `max(0, base_points - hint_penalty)` ensures minimum 0 points
2. **Placement Priority:** Completed teams ALWAYS rank higher than DNF teams, regardless of points
3. **Tie-Breaking:** If multiple teams have 0 points:
   - Completed teams with 0 points: rank by `completed_at` (earlier = higher)
   - DNF teams with 0 points: rank by `completion_percentage` (higher = higher)

```python
# Placement calculation with point-aware tie-breaking
completed_teams.sort(key=lambda x: (
    -x['points'],           # Higher points first
    x['completed_at']       # Earlier completion breaks ties
))

dnf_teams.sort(key=lambda x: (
    -x['points'],                    # Higher points first
    -x['completion_percentage']      # Higher % breaks ties
))
```

### 4.2 Vote Timeout vs Game End

**Problem:** What if game ends (admin force-ends or all teams complete) while vote is active?

**Solution:**
- When `end_game()` is called, cancel all active votes for that lobby
- Broadcast `HINT_VOTE_RESULT` with `reason="game_ended"` to cleanup UI
- Add to `end_game()` endpoint:

```python
# Cancel active votes for this lobby
for vote_id, vote in list(websocket_manager.active_votes.items()):
    if vote.lobby_id == lobby_id:
        vote.timeout_task.cancel()
        del websocket_manager.active_votes[vote_id]
```

### 4.3 Word Already Revealed Race Condition

**Problem:** Player requests hint for a word that gets solved during the vote.

**Solution:**
- Check in `_apply_hint()` before applying
- If word already in `revealed_steps`, skip hint application but still record vote
- Send error event to team: `HINT_ERROR` with reason "word_already_revealed"

### 4.4 Solo Player Teams

**Problem:** What if a team has only 1 player? They'd always approve their own votes.

**Solution:**
- Allow single-player teams to vote (they need majority = 1 vote)
- This is fair since they have no collaboration advantage anyway
- No special handling needed

### 4.5 Disconnected Players During Vote

**Problem:** Player disconnects mid-vote, blocking completion.

**Solution:**
- **Option A (Recommended):** Count only connected players at vote start
  - Re-count `total_voters` based on active websockets when vote starts
  - If player disconnects during vote, their vote isn't needed

- **Option B:** Auto-reject on timeout (30s) handles this naturally
  - Simpler implementation
  - Vote fails if not enough responses

**Implementation:** Use Option A + Option B (timeout as safety net)

```python
# In start_hint_vote()
total_voters = sum(
    1 for sid, tid in self.player_teams.items()
    if tid == team_id and sid in self.lobby_websockets.get(lobby_id, {})
    # Only count currently connected players
)
```

---

## 5. Implementation Phases

### Phase 1: Database & Backend Foundation (2-3 hours)
1. Add `HintUsage` table and `Game.hint_penalty_total` field
2. Create migration script
3. Add event classes to `backend/websocket/events.py`
4. Add `VoteSession` class to `managers.py`

### Phase 2: WebSocket Vote Logic (3-4 hours)
1. Implement `start_hint_vote()`, `cast_vote()`, `_finalize_vote()`
2. Implement `_apply_hint()` with both hint types
3. Add timeout handling with `asyncio.create_task()`
4. Add message handlers for `request_hint` and `vote_hint`

### Phase 3: Scoring Integration (1-2 hours)
1. Modify `calculate_points()` to accept `hint_penalty` parameter
2. Update `end_game()` to pass hint penalties
3. Add tie-breaking logic for zero-point teams
4. Test point calculations with various scenarios

### Phase 4: Frontend UI Components (3-4 hours)
1. Create `HintButton`, `HintVotingModal`, `HintVoteResult` components
2. Create `HintPenaltyDisplay` component
3. Add CSS styling for all new components
4. Add timer countdown logic for vote modal

### Phase 5: Frontend WebSocket Integration (2-3 hours)
1. Add game state for hints (`activeVote`, `hintsUsed`, `totalHintPenalty`)
2. Add websocket event handlers for all hint events
3. Integrate `handleRequestHint()` and `handleVote()` functions
4. Add hint buttons to game UI (near word inputs)

### Phase 6: Clue Reveal Integration (2 hours)
1. Modify `Clues` component to grey out non-relevant clues
2. Add highlighting for revealed clues
3. Test clue matching logic with puzzle data

### Phase 7: Testing & Edge Cases (3-4 hours)
1. Test voting with 2, 3, 4+ players
2. Test timeout scenarios
3. Test disconnection during vote
4. Test both hint types
5. Test point penalties and zero-point scenarios
6. Test concurrent votes (should be blocked)
7. Test word reveal for final word (triggers completion)

### Phase 8: Polish & Documentation (1-2 hours)
1. Add loading states
2. Add animations for vote progress
3. Update README with hint system explanation
4. Add admin view of hint usage statistics (optional)

**Total Estimated Time: 17-24 hours**

---

## 6. Edge Cases & Handling

| Edge Case | Solution |
|-----------|----------|
| Player requests hint while vote active | Block with error: "Vote already in progress" |
| Word revealed during active vote | Check on apply, send error if already revealed |
| Team completes puzzle during vote | Game completion cancels vote, broadcast result |
| Admin ends game during vote | Cancel all active votes, cleanup state |
| Player disconnects before voting | Vote proceeds with remaining players |
| Player disconnects mid-vote | Timeout handles this (30s auto-reject) |
| Hint reduces points to 0 | Floor at 0, tie-break by completion time |
| Multiple hints on same word | Allow (user can vote again if they want) |
| Hint for already-solved word | Validate and reject with error |
| Solo player team | Allow (1 vote = majority) |
| Network lag causes double-vote | Server ignores duplicate votes (same session_id) |

---

## 7. Testing Checklist

### Unit Tests
- [ ] `VoteSession.add_vote()` correctly tracks votes
- [ ] `VoteSession.get_result()` calculates majority correctly
- [ ] `VoteSession.get_result()` identifies ties
- [ ] `calculate_points()` with hint penalties returns correct values
- [ ] `calculate_points()` never returns negative numbers

### Integration Tests
- [ ] Starting a vote broadcasts to all team members
- [ ] Casting vote updates all team members
- [ ] Vote completion triggers hint application
- [ ] Clue reveal identifies correct clue
- [ ] Word reveal adds to revealed_steps
- [ ] Hint penalty updates game.hint_penalty_total
- [ ] Timeout cancels vote after 30 seconds
- [ ] Multiple teams can vote independently

### E2E Tests (Playwright)
- [ ] Player requests clue hint, team votes yes, clue highlights
- [ ] Player requests word hint, team votes yes, word reveals
- [ ] Player requests hint, team votes no, hint rejected
- [ ] Vote times out, hint rejected
- [ ] Hint reduces points correctly in final scoring
- [ ] Team with 0 points from hints still gets placement

---

## 8. Files to Create/Modify

### Backend - New Files
- `backend/database/migrations/xxx_add_hint_voting_system.py`

### Backend - Modified Files
- `backend/database/models.py` (add `HintUsage` table, modify `Game`)
- `backend/websocket/events.py` (add hint event classes)
- `backend/websocket/managers.py` (add `VoteSession`, vote methods)
- `backend/websocket/api.py` (add hint action handlers)
- `backend/api/admin/lobby/index.py` (modify `calculate_points()`, `end_game()`)

### Frontend - New Files
- `frontend/src/components/HintButton.tsx`
- `frontend/src/components/HintVotingModal.tsx`
- `frontend/src/components/HintVoteResult.tsx`
- `frontend/src/components/HintPenaltyDisplay.tsx`

### Frontend - Modified Files
- `frontend/src/types/game.ts` (add hint types)
- `frontend/src/pages/GamePage/index.tsx` (add state, handlers, UI)
- `frontend/src/components/Clues.tsx` (add greying logic)
- `frontend/src/components/index.ts` (export new components)

---

## 9. Future Enhancements (Out of Scope)

- Admin dashboard showing hint usage statistics per team
- "Hint budget" system (limit hints per round/tournament)
- Different hint types (e.g., "reveal word length", "reveal first letter")
- Hint purchase with points (spend points to get hints)
- Team strategy: designated "hint caller" role
- Analytics: correlation between hint usage and final placement

---

## Summary

This plan provides a complete, production-ready implementation of a team-based hint voting system for the Raddle game. The system:

✅ **Preserves tutorial hint mechanics** (clue reveal + word reveal)
✅ **Adds democratic voting** (majority required, 30s timeout)
✅ **Integrates with scoring** (point penalties, zero-point handling)
✅ **Scales to any team size** (including solo players)
✅ **Handles all edge cases** (disconnects, timeouts, race conditions)
✅ **Provides real-time feedback** (vote progress, results, penalties)

The implementation is broken into 8 phases with clear deliverables, estimated at 17-24 hours total development time.
