# Tournament Feature Implementation Plan

## Overview

This document outlines the implementation plan for adding tournament-style features to the Raddle Teams game, including:
- Continuous play (teams compete for 2nd, 3rd place after winner is declared)
- Player statistics and performance metrics
- Admin summary screen showing detailed round results
- Points system across multiple rounds
- Team leaderboard in lobby page
- Fun player awards based on performance

## User Requirements

### Scoring System
- **Points allocation**: Reverse placement (n, n-1, n-2... where n = number of teams)
  - Example with 5 teams: 1st gets 5pts, 2nd gets 4pts, 3rd gets 3pts, 4th gets 2pts, 5th gets 1pt
- **DNF (Did Not Finish) teams**: Scaled by progress
  - Partial points based on % of puzzle completed
  - Example: 50% complete = half of last place points

### Game Flow
- **Game ending**: Admin manually ends the game (teams can play indefinitely)
- **Winner notification**: Just a notification banner ("Team X finished 1st! Keep going to compete for 2nd place")
- **Player metrics**: Show individual stats including:
  - Correct guesses count
  - Guess accuracy rate
  - Key contributions (which words they solved)
  - All wrong guesses
  - Fun award names based on performance
- **Round visibility**: Admin must be able to view results of the previous game/round; lobby should surface the last round winner with a crown indicator
- **Team metrics**: Track total wrong guesses per team (with playful labels), time-to-complete per team, and per-player contributions/accuracy after each game

## Current Architecture

### Teams Are Persistent ✅
Teams already survive across multiple games in the same lobby:
- When new game starts, teams are reset (progress cleared) but keep same ID and name
- Perfect foundation for tournament-style scoring

### Data Already Tracked ✅
- Individual team completion times (`Team.completed_at`)
- Game start time (`Game.started_at`)
- All guesses per player (`Guess` model: `player_id`, `word_index`, `guess`, `is_correct`)
- First winner detection

### What's Missing
- Cumulative points/wins tracking on Team model
- Round results storage
- Player statistics aggregation
- Summary screen UI
- Leaderboard display
- Previous round results in admin page (currently missing/bugged) and lobby crown indicator for last winner
- Continuous play (currently auto-reveals all puzzles when first team wins)

---

## Implementation Phases

### Phase 1: Modify Game Completion for Continuous Play

**Goal**: Remove auto-reveal logic when first team wins, allow teams to keep playing

**Files to modify**:
- `backend/api/game.py` (lines 415-461)

**Changes**:
1. **Remove** the "reveal all puzzles" loop (lines 424-461)
2. **Keep** marking games as completed (lines 416-423)
3. **Keep** broadcasting `GAME_WON` event (lines 462-468)
4. **Add** logic to track team placements (1st, 2nd, 3rd...) as they finish
5. **Add** broadcast `TEAM_PLACED` event for each subsequent completion

**New WebSocket event needed** in `backend/websocket/events.py`:
```python
class TeamPlacedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.TEAM_PLACED
    team_name: str
    placement: int  # 1, 2, 3, etc.
    completed_at: str
```

**Technical details**:
- Count completed teams to determine placement
- Broadcast to both the team and admins
- Don't reveal puzzles until admin manually ends game

**Complexity**: Medium (1-2 hours)

---

### Phase 2: Add Database Schema for Points and Round Tracking

**Goal**: Extend Team model to track cumulative statistics

**Files to modify**:
- `backend/database/models.py`

**Team model additions** (add after line 42):
```python
# Tournament statistics (persist across rounds)
total_points: int = Field(default=0)
rounds_won: int = Field(default=0)
rounds_played: int = Field(default=0)
```

**New RoundResult model** (add after Guess model):
```python
class RoundResult(SQLModel, table=True):
    __table_args__ = (
        Index("ix_round_lobby_id", "lobby_id"),
        Index("ix_round_team_id", "team_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")
    game_id: int = Field(foreign_key="game.id", ondelete="CASCADE")
    team_id: int = Field(foreign_key="team.id", ondelete="CASCADE")
    round_number: int  # 1, 2, 3...
    placement: int  # 1st, 2nd, 3rd, etc.
    points_earned: int
    completion_percentage: float  # 0.0 to 1.0 for DNF teams
    time_to_complete: Optional[int]  # seconds, null if DNF
    completed_at: Optional[datetime]
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    lobby: "Lobby" = Relationship()
    game: "Game" = Relationship()
    team: "Team" = Relationship()
```

**Database migration**:
- SQLModel will auto-create new tables/columns on restart (SQLite)
- Existing teams will default to 0 points/rounds

**Complexity**: Low (1-2 hours)

---

### Phase 3: Implement Player Statistics Aggregation

**Goal**: Create endpoint to calculate per-player stats from Guess records

**New file**: `backend/api/stats.py`

**Endpoint**: `GET /api/stats/game/{game_id}`

**Response structure**:
```python
class PlayerGameStats(BaseModel):
    player_id: int
    player_name: str
    correct_guesses: int
    total_guesses: int
    accuracy_rate: float  # 0.0 to 1.0
    words_solved: list[int]  # word indices they got right first
    wrong_guesses: list[str]  # all their incorrect guesses
    awards: list[PlayerAward]  # fun titles (from Phase 8)

class TeamGameStats(BaseModel):
    team_id: int
    team_name: str
    placement: int
    points_earned: int
    wrong_guesses: int
    wrong_guess_rate: float
    wrong_guess_label: str  # playful tag like "Oops-o-meter", "Spice Rack", "Plot Twist Generator"
    completed_at: Optional[str]
    completion_percentage: float
    time_to_complete: Optional[int]  # seconds
    player_stats: list[PlayerGameStats]

class GameStatsResponse(BaseModel):
    game_id: int
    round_number: int
    started_at: str
    teams: list[TeamGameStats]
    last_round_winner_id: Optional[int]  # for lobby crown display
```

**SQL queries needed**:
1. Group guesses by player, count correct/total
2. Find first correct guess per word_index to determine who "solved" it
3. Collect all wrong guesses per player
4. Aggregate wrong guesses per team and derive rate (wrong/total) + attach playful label
5. Calculate completion percentage: `len(revealed_steps) / len(puzzle.ladder)`
6. Calculate time: `completed_at - game.started_at` (in seconds)

**Implementation details**:
```python
# Pseudo-code for player stats
for player in team.players:
    guesses = session.exec(
        select(Guess)
        .where(Guess.player_id == player.id)
        .where(Guess.game_id == game_id)
    ).all()

    correct = [g for g in guesses if g.is_correct]
    wrong = [g.guess for g in guesses if not g.is_correct]

    # Find words this player solved first
    words_solved = []
    for word_idx in revealed_steps:
        first_correct = session.exec(
            select(Guess)
            .where(Guess.team_id == team_id)
            .where(Guess.word_index == word_idx)
            .where(Guess.is_correct == True)
            .order_by(Guess.created_at)
            .limit(1)
        ).first()
        if first_correct and first_correct.player_id == player.id:
            words_solved.append(word_idx)
```

**Team wrong-guess label generation**:
- Sum wrong guesses across team players; compute rate vs total guesses
- Map ranges to playful tags (examples: 0-1 → "Laser Focus", 2-5 → "Oops-o-meter", 6-10 → "Spice Rack", 10+ → "Chaos Engine")

**Complexity**: Medium (2-3 hours)

---

### Phase 4: Create Admin Summary Screen

**Goal**: New UI component showing detailed round results, also a way to view previous rounds (fix current issue where admin cannot see previous game)

**New file**: `frontend/src/pages/AdminPage/RoundSummary.tsx`

**Component structure**:
```tsx
interface RoundSummaryProps {
  lobbyId: number;
  gameId: number;
  onClose: () => void;
}

export function RoundSummary({ lobbyId, gameId, onClose }: RoundSummaryProps) {
  const [stats, setStats] = useState<GameStatsResponse | null>(null);

  // Fetch stats from /api/stats/game/{gameId}

  return (
    <div className="round-summary">
      <RoundMetadata />
      <TeamRankingsTable teams={stats.teams} showWinnerCrown />
      {stats.teams.map(team => (
        <ExpandableTeamDetails key={team.team_id} team={team} />
      ))}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

// Sub-components:
// - RoundMetadata: Round #, duration, date
// - TeamRankingsTable: Rankings with placement badges and crown on winner
// - ExpandableTeamDetails:
//   - PlayerStatsTable
//   - WrongGuessesList (collapsible)
//   - TeamMetrics (time-to-complete, wrong guess totals + playful label, accuracy)
```

**Display elements**:
- **Placement badges**: 🥇 1st, 🥈 2nd, 🥉 3rd
- **Team rankings table** (with crown on winning team and wrong-guess tag):
  - Rank | Team | Points | Time | Completion % | Wrong guesses (tag + count)
- **Player breakdown** (expandable per team):
  - Player name + award emoji/title
  - Correct/Total guesses
  - Accuracy percentage
  - Words solved (colored chips showing word indices)
  - Wrong guesses (collapsible list)

**Integration point**: `AdminPage/LobbyDetails.tsx`
- Add "View Last Round Results" button after game ends; ensure admin always sees the immediately previous round (bug fix)
- Show crown on the winning team row in the summary and on the lobby recap widget
- Show as modal or slide-over panel

**Complexity**: Medium (3-4 hours)

---

### Phase 5: Add Points Calculation System

**Goal**: Calculate and award points when admin ends game

**Files to modify**:
- `backend/api/admin/lobby/index.py` (end game endpoint, lines 212-270)

**Points algorithm**:
```python
def calculate_points(
    placement: int,
    total_teams: int,
    completion_percentage: float,
    completed: bool
) -> int:
    """
    Reverse placement: 1st gets n points, 2nd gets n-1, etc.
    DNF teams get partial points based on completion %

    Args:
        placement: Team's finishing position (1-indexed)
        total_teams: Total number of teams in lobby
        completion_percentage: 0.0 to 1.0, how much puzzle was solved
        completed: Whether team finished the puzzle

    Returns:
        Points earned this round
    """
    if completed:
        # Completed teams get full points for their placement
        return total_teams - placement + 1
    else:
        # DNF teams get partial points
        # Last place would get 1 point if completed
        # DNF teams get fraction of that based on progress
        last_place_points = 1
        return int(last_place_points * completion_percentage)
```

**Modified end game flow**:
```python
@router.post("/lobby/{lobby_id}/end")
async def end_game(lobby_id: int, session: SessionDep):
    """
    End the current game and calculate round results
    """
    # 1. Get all teams and their current game states
    teams = session.exec(select(Team).where(Team.lobby_id == lobby_id)).all()

    # 2. Sort completed teams by completion time
    completed_teams = [t for t in teams if t.completed_at]
    completed_teams.sort(key=lambda t: t.completed_at)

    # 3. Get DNF teams and calculate their completion %
    dnf_teams = [t for t in teams if not t.completed_at]
    for team in dnf_teams:
        puzzle = get_team_puzzle(team)
        revealed = json.loads(team.revealed_steps)
        team.completion_pct = len(revealed) / len(puzzle.ladder)

    # 4. Sort DNF by completion %
    dnf_teams.sort(key=lambda t: t.completion_pct, reverse=True)

    # 5. Assign placements
    all_teams_ranked = completed_teams + dnf_teams

    # 6. Calculate round number
    round_number = session.exec(
        select(func.max(RoundResult.round_number))
        .where(RoundResult.lobby_id == lobby_id)
    ).first() or 0
    round_number += 1

    # 7. Award points and create RoundResult records
    for placement, team in enumerate(all_teams_ranked, start=1):
        completed = team in completed_teams
        completion_pct = 1.0 if completed else team.completion_pct

        points = calculate_points(
            placement,
            len(teams),
            completion_pct,
            completed
        )

        # Update team stats
        team.total_points += points
        team.rounds_played += 1
        if placement == 1:
            team.rounds_won += 1

        # Create round result record
        time_to_complete = None
        if completed:
            time_to_complete = int(
                (team.completed_at - team.game.started_at).total_seconds()
            )

        round_result = RoundResult(
            lobby_id=lobby_id,
            game_id=team.game_id,
            team_id=team.id,
            round_number=round_number,
            placement=placement,
            points_earned=points,
            completion_percentage=completion_pct,
            time_to_complete=time_to_complete,
            completed_at=team.completed_at,
        )
        session.add(round_result)

    # 8. Mark all games as completed
    games = session.exec(select(Game).where(Game.lobby_id == lobby_id)).all()
    for game in games:
        game.completed_at = datetime.now(tz=timezone.utc)

    # 9. Reset team game states (but keep points/stats)
    for team in teams:
        team.completed_at = None
        team.revealed_steps = "[]"
        team.last_updated_at = None
        team.game_id = None

    session.commit()

    # 10. Broadcast round ended event
    await websocket_manager.broadcast_to_lobby(
        lobby_id,
        RoundEndedEvent(
            lobby_id=lobby_id,
            round_number=round_number,
            results=all_teams_ranked  # Summary data
        )
    )
```

**New WebSocket event**:
```python
class RoundEndedEvent(BaseModel):
    type: str = "round_ended"
    lobby_id: int
    round_number: int
    results: list[dict]  # Team placements and points
```

**New endpoint**: `GET /admin/lobby/{lobby_id}/round-results/{round_number}`
```python
@router.get("/lobby/{lobby_id}/round-results/{round_number}")
async def get_round_results(
    lobby_id: int,
    round_number: int,
    session: SessionDep
):
    """Get detailed results for a specific round"""
    results = session.exec(
        select(RoundResult)
        .where(RoundResult.lobby_id == lobby_id)
        .where(RoundResult.round_number == round_number)
        .order_by(RoundResult.placement)
    ).all()

    # Join with team/game data and return
    return results
```

**Complexity**: Medium (2-3 hours)

---

### Phase 6: Build Team Leaderboard for Lobby Page

**Goal**: Show persistent tournament standings in lobby

**Files to modify**:
- `frontend/src/pages/LobbyPage/index.tsx`

**New component**: `frontend/src/components/TeamLeaderboard.tsx`

**Display format**:
```
🏆 TOURNAMENT LEADERBOARD
┌─────────────────────────────────────────┐
│ 1. 🥇 Team Alpha      25 pts (3-0-1-0) │
│ 2. 🥈 Team Beta       22 pts (2-1-1-0) │
│ 3. 🥉 Team Gamma      18 pts (1-2-1-0) │
│ 4.    Team Delta      15 pts (0-1-2-1) │
└─────────────────────────────────────────┘

Format: (1st-2nd-3rd-DNF) across all rounds
Round 5 of 10
```

**Backend endpoint**: `GET /api/lobby/{lobby_id}/leaderboard`

**New file**: `backend/api/leaderboard.py`

```python
from fastapi import APIRouter
from sqlmodel import select, func

router = APIRouter()

class PlacementBreakdown(BaseModel):
    first: int
    second: int
    third: int
    dnf: int

class TeamLeaderboardEntry(BaseModel):
    team_id: int
    team_name: str
    total_points: int
    rounds_won: int
    rounds_played: int
    placement_breakdown: PlacementBreakdown
    last_round_winner: bool  # for crown marker in lobby recap

class LeaderboardResponse(BaseModel):
    teams: list[TeamLeaderboardEntry]
    current_round: int
    total_rounds: int
    last_round_game_id: Optional[int]  # to link to last results modal in lobby

@router.get("/lobby/{lobby_id}/leaderboard")
async def get_leaderboard(lobby_id: int, session: SessionDep):
    """Get tournament leaderboard for a lobby"""
    teams = session.exec(
        select(Team)
        .where(Team.lobby_id == lobby_id)
        .order_by(Team.total_points.desc())
    ).all()

    # Find last round winner for crown marker + recap link
    last_round_number = session.exec(
        select(func.max(RoundResult.round_number))
        .where(RoundResult.lobby_id == lobby_id)
    ).first()
    last_round_winner_id = None
    last_round_game_id = None
    if last_round_number:
        last_round_winner = session.exec(
            select(RoundResult)
            .where(RoundResult.lobby_id == lobby_id)
            .where(RoundResult.round_number == last_round_number)
            .order_by(RoundResult.placement)
        ).first()
        if last_round_winner:
            last_round_winner_id = last_round_winner.team_id
            last_round_game_id = last_round_winner.game_id

    # Get placement breakdown for each team
    entries = []
    for team in teams:
        # Count placements from RoundResult
        placements = session.exec(
            select(
                func.count(RoundResult.id).filter(RoundResult.placement == 1).label('first'),
                func.count(RoundResult.id).filter(RoundResult.placement == 2).label('second'),
                func.count(RoundResult.id).filter(RoundResult.placement == 3).label('third'),
                func.count(RoundResult.id).filter(RoundResult.completed_at.is_(None)).label('dnf'),
            )
            .where(RoundResult.team_id == team.id)
        ).first()

        entries.append(TeamLeaderboardEntry(
            team_id=team.id,
            team_name=team.name,
            total_points=team.total_points,
            rounds_won=team.rounds_won,
            rounds_played=team.rounds_played,
            placement_breakdown=PlacementBreakdown(**placements),
            last_round_winner=team.id == last_round_winner_id
        ))

    # Get current round number
    current_round = session.exec(
        select(func.max(RoundResult.round_number))
        .where(RoundResult.lobby_id == lobby_id)
    ).first() or 0

    return LeaderboardResponse(
        teams=entries,
        current_round=current_round,
        total_rounds=current_round,  # Or set a max if you want
        last_round_game_id=last_round_game_id
    )
```

**Integration**: Add `<TeamLeaderboard />` to LobbyPage
- Show above or beside team assignments, and add a compact "Last Round" card with crown on the winning team and a link to open the previous round results
- Real-time updates via WebSocket when round ends
- Highlight current leader and crown the last winner even before next game starts

**Complexity**: Low-Medium (2-3 hours)

---

### Phase 7: Add Game Notifications for Team Placements

**Goal**: Show banner when teams finish during gameplay

**Files to modify**:
- `frontend/src/pages/GamePage/index.tsx`

**New component**: `frontend/src/components/PlacementNotification.tsx`

```tsx
interface PlacementNotificationProps {
  placement: number;
  teamName: string;
  isOwnTeam: boolean;
  onDismiss: () => void;
}

export function PlacementNotification({
  placement,
  teamName,
  isOwnTeam,
  onDismiss
}: PlacementNotificationProps) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const colors = {
    1: 'bg-yellow-500',
    2: 'bg-gray-400',
    3: 'bg-orange-600',
    default: 'bg-blue-500'
  };

  const message = isOwnTeam
    ? `Your team finished in ${placement}${ordinalSuffix(placement)} place!`
    : `${teamName} finished ${placement}${ordinalSuffix(placement)}! Keep going!`;

  return (
    <div className={`notification ${colors[placement] || colors.default}`}>
      {medals[placement]} {message}
      <button onClick={onDismiss}>×</button>
    </div>
  );
}
```

**Behavior**:
1. Listen for `GAME_WON` event → Show "Team X finished 1st! 🥇"
2. Listen for `TEAM_PLACED` event → Show "Team Y finished 2nd! 🥈"
3. When your team completes → Show "Your team finished in Nth place!"
4. Auto-dismiss after 5 seconds or user clicks close
5. Stack multiple notifications if teams finish quickly

**Styling**:
- Toast notification at top of screen
- Slide-in animation
- Gold/silver/bronze themed colors
- Celebration confetti animation for 1st place (optional)

**Complexity**: Low (1 hour)

---

### Phase 8: Implement Fun Player Awards System

**Goal**: Generate fun titles based on player performance

**New file**: `backend/utils/awards.py`

**Award categories**:
```python
from typing import List
from pydantic import BaseModel

class PlayerAward(BaseModel):
    key: str
    title: str
    emoji: str
    description: str

AWARDS_CATALOG = {
    "MVP": PlayerAward(
        key="MVP",
        title="Most Valuable Player",
        emoji="🏆",
        description="Most correct guesses on the team"
    ),
    "SPEED_DEMON": PlayerAward(
        key="SPEED_DEMON",
        title="Speed Demon",
        emoji="⚡",
        description="Fastest to submit correct guesses"
    ),
    "CLUTCH": PlayerAward(
        key="CLUTCH",
        title="Clutch Player",
        emoji="💪",
        description="Solved the final word"
    ),
    "SHARPSHOOTER": PlayerAward(
        key="SHARPSHOOTER",
        title="Sharpshooter",
        emoji="🎯",
        description="Highest accuracy rate (min 5 guesses)"
    ),
    "CREATIVE": PlayerAward(
        key="CREATIVE",
        title="Creative Guesser",
        emoji="🎨",
        description="Most unique wrong guesses"
    ),
    "CHEERLEADER": PlayerAward(
        key="CHEERLEADER",
        title="Team Cheerleader",
        emoji="📣",
        description="Fewest guesses but team still won"
    ),
    "WILDCARD": PlayerAward(
        key="WILDCARD",
        title="Wildcard",
        emoji="🎲",
        description="Most enthusiastic guesser (most total guesses)"
    ),
    "PUZZLE_MASTER": PlayerAward(
        key="PUZZLE_MASTER",
        title="Puzzle Master",
        emoji="🧩",
        description="Solved the most difficult words"
    ),
    "STRATEGIST": PlayerAward(
        key="STRATEGIST",
        title="Strategist",
        emoji="🧠",
        description="Best guess diversity across puzzle"
    ),
    "WORD_WIZARD": PlayerAward(
        key="WORD_WIZARD",
        title="Word Wizard",
        emoji="🪄",
        description="Solved words in unusual order"
    ),
}

def assign_awards(
    team_stats: List[PlayerGameStats],
    puzzle_length: int
) -> dict[int, List[PlayerAward]]:
    """
    Assign 1-3 awards per player based on performance

    Args:
        team_stats: List of player statistics for the team
        puzzle_length: Total number of words in puzzle

    Returns:
        Dictionary mapping player_id to list of awards
    """
    awards_by_player = {p.player_id: [] for p in team_stats}

    if not team_stats:
        return awards_by_player

    # MVP: Most correct guesses
    max_correct = max(p.correct_guesses for p in team_stats)
    mvp = [p for p in team_stats if p.correct_guesses == max_correct][0]
    awards_by_player[mvp.player_id].append(AWARDS_CATALOG["MVP"])

    # Sharpshooter: Highest accuracy (min 5 guesses to qualify)
    qualified = [p for p in team_stats if p.total_guesses >= 5]
    if qualified:
        sharpshooter = max(qualified, key=lambda p: p.accuracy_rate)
        if sharpshooter.accuracy_rate >= 0.7:  # At least 70% accuracy
            awards_by_player[sharpshooter.player_id].append(AWARDS_CATALOG["SHARPSHOOTER"])

    # Clutch: Solved the final word (last index in puzzle)
    final_word_idx = puzzle_length - 1
    for player in team_stats:
        if final_word_idx in player.words_solved:
            awards_by_player[player.player_id].append(AWARDS_CATALOG["CLUTCH"])
            break

    # Creative: Most wrong guesses (lovingly)
    max_wrong = max(len(p.wrong_guesses) for p in team_stats)
    if max_wrong > 0:
        creative = [p for p in team_stats if len(p.wrong_guesses) == max_wrong][0]
        awards_by_player[creative.player_id].append(AWARDS_CATALOG["CREATIVE"])

    # Wildcard: Most total guesses
    max_guesses = max(p.total_guesses for p in team_stats)
    wildcard = [p for p in team_stats if p.total_guesses == max_guesses][0]
    if wildcard.player_id != mvp.player_id:  # Don't double-award with MVP
        awards_by_player[wildcard.player_id].append(AWARDS_CATALOG["WILDCARD"])

    # Cheerleader: Fewest guesses but team completed
    min_guesses = min(p.total_guesses for p in team_stats)
    cheerleader = [p for p in team_stats if p.total_guesses == min_guesses][0]
    if cheerleader.total_guesses < max_guesses * 0.5:  # Less than half of max
        awards_by_player[cheerleader.player_id].append(AWARDS_CATALOG["CHEERLEADER"])

    # Puzzle Master: Solved the most words first
    max_solved = max(len(p.words_solved) for p in team_stats)
    if max_solved > 0:
        masters = [p for p in team_stats if len(p.words_solved) == max_solved]
        for master in masters:
            if master.player_id != mvp.player_id:  # Avoid double-award
                awards_by_player[master.player_id].append(AWARDS_CATALOG["PUZZLE_MASTER"])

    return awards_by_player
```

**Integration**:
- Call `assign_awards()` in Phase 3's stats endpoint
- Include in `PlayerGameStats.awards` field
- Display in Phase 4's summary screen next to player names

**Display in UI**:
```tsx
<div className="player-row">
  <span className="player-name">John Doe</span>
  <div className="awards">
    {player.awards.map(award => (
      <span
        key={award.key}
        className="award-badge"
        title={award.description}
      >
        {award.emoji} {award.title}
      </span>
    ))}
  </div>
  <span className="stats">15/20 (75%)</span>
</div>
```

**Complexity**: Medium (2-3 hours)

---

## Implementation Dependencies

```
Phase 1 (Continuous Play) ─┐
                           ├─→ Phase 2 (Database) ─→ Phase 5 (Points) ─┐
                           │                                            ├─→ Phase 6 (Leaderboard)
Phase 3 (Stats) ───────────┴─→ Phase 4 (Summary UI) ─→ Phase 8 (Awards)┘

Phase 7 (Notifications) ───→ (Independent, can implement anytime)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 5 → Phase 6
**Parallel Tracks**:
- Phase 3 → Phase 8 → Phase 4 (can develop alongside critical path)
- Phase 7 (can be done independently)

---

## Time Estimates

| Phase              | Hours | Difficulty | Dependencies |
| ------------------ | ----- | ---------- | ------------ |
| 1. Continuous Play | 1-2   | Medium     | None         |
| 2. Database Schema | 1-2   | Low        | None         |
| 3. Player Stats    | 2-3   | Medium     | None         |
| 4. Summary Screen  | 3-4   | Medium     | Phase 3, 8   |
| 5. Points System   | 2-3   | Medium     | Phase 2      |
| 6. Leaderboard     | 2-3   | Low-Medium | Phase 5      |
| 7. Notifications   | 1     | Low        | Phase 1      |
| 8. Awards System   | 2-3   | Medium     | Phase 3      |

**Total Estimate**: 14-23 hours of focused development

**Recommended Sprint Breakdown**:
- **Sprint 1** (5-7 hours): Phases 1, 2, 3 - Core gameplay and data foundation
- **Sprint 2** (5-7 hours): Phases 5, 6 - Points and leaderboard
- **Sprint 3** (4-6 hours): Phases 4, 7, 8 - Polish, awards, and UI

---

## Testing Checklist

### Phase 1: Continuous Play
- [ ] First team completes → `GAME_WON` broadcast, other teams can still play
- [ ] Second team completes → `TEAM_PLACED` broadcast with placement=2
- [ ] Puzzles NOT auto-revealed for other teams
- [ ] All placements tracked correctly (3rd, 4th, 5th...)

### Phase 2: Database
- [ ] Team fields added successfully
- [ ] RoundResult table created
- [ ] Existing teams have default values (0 points)
- [ ] Foreign key relationships work

### Phase 3: Player Stats
- [ ] Correct/total guesses counted accurately
- [ ] Accuracy rate calculated correctly
- [ ] Words solved attributed to first correct guesser
- [ ] Wrong guesses list complete
- [ ] Team wrong guess totals/rates correct and playful label assigned to expected bucket
- [ ] Completion percentage accurate for DNF teams
- [ ] Time-to-complete computed correctly per team

### Phase 4: Admin Summary
- [ ] Admin can open previous round results after a new game starts
- [ ] Admin can see the results of every round played
- [ ] Round metadata displays correct round number, duration, date
- [ ] Rankings table shows correct placements and points
- [ ] Winner shows crown in rankings table and lobby recap card
- [ ] Team metrics show time, wrong-guess totals/rate/tag, completion %
- [ ] Player breakdown shows contributions and wrong guesses per player

### Phase 5: Points System
- [ ] Points calculated correctly for all placements
- [ ] DNF teams get scaled points
- [ ] Round results saved to database
- [ ] Team totals update correctly
- [ ] Multiple rounds accumulate properly

### Phase 6: Leaderboard
- [ ] Teams sorted by total points
- [ ] Placement breakdown accurate
- [ ] Updates in real-time after round ends
- [ ] Shows correct round number
- [ ] Last round crown appears on winner and opens last results modal/link

### Phase 7: Notifications
- [ ] 1st place notification shows with gold theme
- [ ] Subsequent placements show correctly
- [ ] Own team placement emphasized
- [ ] Auto-dismiss after 5 seconds
- [ ] Manual dismiss works

### Phase 8: Awards
- [ ] Awards assigned correctly based on stats
- [ ] Multiple players can get same award
- [ ] Players get 1-3 awards each
- [ ] Award descriptions accurate

---

## Future Enhancements (Not in Initial Scope)

- **Historical round browser**: View results from all past rounds
- **Player profiles**: Individual stats across all lobbies/rounds
- **Achievement system**: Unlock badges for milestones
- **Export results**: Download CSV/PDF of tournament results
- **Configurable point values**: Let admin customize scoring system
- **Team draft mode**: Balanced team creation based on skill
- **Live spectator mode**: Watch teams compete without joining
- **Round timer**: Auto-end rounds after time limit
- **Bonus points**: Extra points for speed, accuracy, etc.

---

## Database Schema Diagrams

### Updated Team Model
```
Team
├─ id (PK)
├─ name
├─ lobby_id (FK)
├─ game_id (FK, nullable)
├─ completed_at (nullable)
├─ revealed_steps (JSON)
├─ last_updated_at
├─ created_at
├─ total_points ⭐ NEW
├─ rounds_won ⭐ NEW
└─ rounds_played ⭐ NEW
```

### New RoundResult Model
```
RoundResult
├─ id (PK)
├─ lobby_id (FK)
├─ game_id (FK)
├─ team_id (FK)
├─ round_number
├─ placement
├─ points_earned
├─ completion_percentage
├─ time_to_complete (nullable)
├─ completed_at (nullable)
└─ created_at
```

---

## API Endpoints Summary

### New Endpoints
- `GET /api/stats/game/{game_id}` - Get detailed game statistics
- `GET /api/lobby/{lobby_id}/leaderboard` - Get tournament leaderboard
- `GET /admin/lobby/{lobby_id}/round-results/{round_number}` - Get specific round results

### Modified Endpoints
- `POST /admin/lobby/{lobby_id}/end` - Enhanced to calculate points and save results

### New WebSocket Events
- `TEAM_PLACED` - Broadcast when team finishes after winner
- `ROUND_ENDED` - Broadcast when admin ends game with results summary

---

## Questions & Decisions Needed

1. **Award customization**: Should admins be able to customize award names/criteria?
2. **Leaderboard reset**: How should admins reset tournament standings? New button?
3. **Round history**: Should we show all past rounds or just last N rounds?
4. **Tiebreakers**: If teams have same points, how to rank? (completion time avg? wins?)
5. **UI placement**: Where exactly should leaderboard go on lobby page?
6. **Mobile responsiveness**: Ensure all new UI works on mobile devices?

---

## Notes

- All code follows existing patterns in codebase
- Uses existing WebSocket infrastructure
- Minimal breaking changes (mostly additions)
- SQLite auto-migration keeps things simple
- Can implement incrementally and test each phase
