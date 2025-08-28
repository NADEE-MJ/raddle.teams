import json
import os
from threading import Lock
from typing import Dict, List, Optional

from .database import Game, Team


class PuzzleLoader:
    def __init__(self, puzzles_dir: str = "puzzles"):
        self.puzzles_dir = puzzles_dir
        self._puzzle_cache: Dict[str, dict] = {}

    def load_puzzle(self, puzzle_name: str) -> dict:
        if puzzle_name in self._puzzle_cache:
            return self._puzzle_cache[puzzle_name]

        puzzle_path = os.path.join(self.puzzles_dir, f"{puzzle_name}.json")
        if not os.path.exists(puzzle_path):
            raise FileNotFoundError(f"Puzzle '{puzzle_name}' not found")

        with open(puzzle_path, "r") as f:
            puzzle_data = json.load(f)

        self._puzzle_cache[puzzle_name] = puzzle_data
        return puzzle_data

    def get_word_chain(self, puzzle_name: str) -> List[str]:
        """Get the word chain for a puzzle."""
        puzzle = self.load_puzzle(puzzle_name)
        return [item["word"] for item in puzzle["ladder"]]

    def get_clue(self, puzzle_name: str, word: str, direction: str) -> Optional[str]:
        """Get a clue for a specific word and direction."""
        puzzle = self.load_puzzle(puzzle_name)
        ladder = puzzle.get("ladder", [])

        # Find the word in the ladder
        word_index = None
        for i, item in enumerate(ladder):
            if item["word"].upper() == word.upper():
                word_index = i
                break

        if word_index is None:
            return None

        # For forward direction, use the current word's clue (to get to next word)
        # For backward direction, use the previous word's clue (to get to current word)
        if direction == "forward" and word_index < len(ladder) - 1:
            return ladder[word_index]["clue"]
        elif direction == "backward" and word_index > 0:
            return ladder[word_index - 1]["clue"]

        return None

    def get_tip(self, puzzle_name: str, word: str) -> Optional[str]:
        """Get a tip for a specific word."""
        puzzle = self.load_puzzle(puzzle_name)
        tips = puzzle.get("tips", {})
        return tips.get(word)


class GameManager:
    """Manages game state and team coordination."""

    def __init__(self):
        self.puzzle_loader = PuzzleLoader()
        self.team_locks: Dict[int, Lock] = {}
        self.current_game: Optional[Game] = None

    def get_team_lock(self, team_id: int) -> Lock:
        if team_id not in self.team_locks:
            self.team_locks[team_id] = Lock()
        return self.team_locks[team_id]

    def check_answer(
        self, puzzle_name: str, word_index: int, guess: str, direction: str
    ) -> bool:
        try:
            words = self.puzzle_loader.get_word_chain(puzzle_name)

            if direction == "forward" and word_index + 1 < len(words):
                correct_answer = words[word_index + 1]
            elif direction == "backward" and word_index > 0:
                correct_answer = words[word_index - 1]
            else:
                return False

            return guess.upper().strip() == correct_answer.upper().strip()
        except (FileNotFoundError, IndexError, KeyError):
            return False

    def get_current_clue(
        self, puzzle_name: str, team: Team, direction: str
    ) -> Optional[str]:
        """Get the current clue for a team in a specific direction."""
        try:
            words = self.puzzle_loader.get_word_chain(puzzle_name)
            current_word = words[team.current_word_index]
            return self.puzzle_loader.get_clue(puzzle_name, current_word, direction)
        except (FileNotFoundError, IndexError, KeyError):
            return None

    def get_next_word_length(
        self, puzzle_name: str, word_index: int, direction: str
    ) -> Optional[int]:
        """Get the length of the next word in the chain."""
        try:
            words = self.puzzle_loader.get_word_chain(puzzle_name)

            if direction == "forward" and word_index + 1 < len(words):
                return len(words[word_index + 1])
            elif direction == "backward" and word_index > 0:
                return len(words[word_index - 1])

            return None
        except (FileNotFoundError, IndexError, KeyError):
            return None

    def is_puzzle_complete(self, puzzle_name: str, team: Team) -> bool:
        """Check if a team has completed the puzzle."""
        try:
            words = self.puzzle_loader.get_word_chain(puzzle_name)
            return (
                team.current_word_index == 0
                or team.current_word_index == len(words) - 1
            )
        except (FileNotFoundError, IndexError, KeyError):
            return False

    def advance_team_progress(self, team: Team, direction: str) -> bool:
        """Advance team progress based on correct answer direction."""
        if direction == "forward":
            team.current_word_index += 1
        elif direction == "backward":
            team.current_word_index -= 1
        else:
            return False
        return True


game_manager = GameManager()
