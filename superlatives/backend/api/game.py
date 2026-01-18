"""Game API endpoints for players."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import get_session
from backend.database.models import Player, Question, Room, Vote
from backend.dependencies import require_player_session
from backend.game.state_machine import SuperlativesStateMachine
from backend.schemas import QuestionSubmitRequest, QuestionSubmitResponse, VoteResults, VoteSubmitRequest, VoteSubmitResponse

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/state")
def get_game_state(player: Player = Depends(require_player_session), db: Session = Depends(get_session)):
    """Get current game state for the player."""
    room = db.get(Room, player.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Get player's questions for current round
    questions = db.exec(
        select(Question).where(Question.room_id == room.id, Question.round_number == room.current_round)
    ).all()

    # Get current question being voted on
    current_question = None
    if room.current_question_id:
        current_question = db.get(Question, room.current_question_id)

    return {
        "room_status": room.status,
        "current_round": room.current_round,
        "questions": [q.model_dump() for q in questions],
        "current_question": current_question.model_dump() if current_question else None,
    }


@router.post("/submit-question", response_model=QuestionSubmitResponse)
def submit_question(
    request: QuestionSubmitRequest,
    player: Player = Depends(require_player_session),
    db: Session = Depends(get_session),
):
    """Submit a question for the current round."""
    try:
        state_machine = SuperlativesStateMachine(db)
        question = state_machine.submit_question(player.room_id, player.id, request.question_text)
        return QuestionSubmitResponse(question=question)
    except ValueError as e:
        api_logger.warning(f"Question submission failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/submit-vote", response_model=VoteSubmitResponse)
def submit_vote(
    request: VoteSubmitRequest, player: Player = Depends(require_player_session), db: Session = Depends(get_session)
):
    """Submit a vote for a question."""
    try:
        state_machine = SuperlativesStateMachine(db)
        vote = state_machine.submit_vote(player.room_id, player.id, request.question_id, request.voted_for_name)
        return VoteSubmitResponse(vote=vote)
    except ValueError as e:
        api_logger.warning(f"Vote submission failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/results/{question_id}", response_model=VoteResults)
def get_results(
    question_id: int, player: Player = Depends(require_player_session), db: Session = Depends(get_session)
):
    """Get voting results for a question."""
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.room_id != player.room_id:
        raise HTTPException(status_code=403, detail="Cannot view results for questions from other rooms")

    try:
        state_machine = SuperlativesStateMachine(db)
        results = state_machine.calculate_results(question_id)

        return VoteResults(
            question_id=question_id,
            question_text=question.question_text,
            votes_by_person=results["votes_by_person"],
            total_votes=results["total_votes"],
            winner=results["winner"],
            is_tie=results["is_tie"],
            tied_people=results["tied_people"],
            fastest_voter=results["fastest_voter"],
        )
    except ValueError as e:
        api_logger.warning(f"Get results failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
