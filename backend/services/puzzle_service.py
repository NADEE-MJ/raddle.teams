import json
import os
from pathlib import Path
from typing import Dict, List, Optional

from sqlmodel import Session, select

from backend.database.models import PuzzleWord
from backend.database import get_engine


class PuzzleService:
    def __init__(self):
        self.puzzles_dir = Path("puzzles")
        
    def load_puzzle_from_file(self, puzzle_name: str) -> Dict:
        """Load puzzle data from JSON file."""
        puzzle_file = self.puzzles_dir / f"{puzzle_name}.json"
        
        if not puzzle_file.exists():
            raise FileNotFoundError(f"Puzzle file not found: {puzzle_file}")
            
        with open(puzzle_file, 'r') as f:
            return json.load(f)
    
    def get_available_puzzles(self) -> List[str]:
        """Get list of available puzzle names."""
        if not self.puzzles_dir.exists():
            return []
            
        puzzle_files = list(self.puzzles_dir.glob("*.json"))
        return [f.stem for f in puzzle_files]
    
    def load_puzzle_to_database(self, puzzle_name: str) -> None:
        """Load puzzle words into database."""
        puzzle_data = self.load_puzzle_from_file(puzzle_name)
        
        with Session(get_engine()) as session:
            # Check if puzzle already exists
            existing = session.exec(
                select(PuzzleWord).where(PuzzleWord.puzzle_name == puzzle_name)
            ).first()
            
            if existing:
                # Delete existing words for this puzzle to reload fresh
                session.exec(
                    select(PuzzleWord).where(PuzzleWord.puzzle_name == puzzle_name)
                )
                for word in session.exec(
                    select(PuzzleWord).where(PuzzleWord.puzzle_name == puzzle_name)
                ):
                    session.delete(word)
            
            # Add new words
            for index, word_data in enumerate(puzzle_data["ladder"]):
                puzzle_word = PuzzleWord(
                    puzzle_name=puzzle_name,
                    word_index=index,
                    word=word_data["word"],
                    clue=word_data.get("clue"),
                    transform=word_data.get("transform")
                )
                session.add(puzzle_word)
            
            session.commit()
    
    def get_puzzle_words(self, puzzle_name: str) -> List[PuzzleWord]:
        """Get all words for a puzzle from database."""
        with Session(get_engine()) as session:
            words = session.exec(
                select(PuzzleWord)
                .where(PuzzleWord.puzzle_name == puzzle_name)
                .order_by(PuzzleWord.word_index)
            ).all()
            return list(words)
    
    def get_word_at_index(self, puzzle_name: str, word_index: int) -> Optional[PuzzleWord]:
        """Get specific word by index."""
        with Session(get_engine()) as session:
            word = session.exec(
                select(PuzzleWord)
                .where(PuzzleWord.puzzle_name == puzzle_name)
                .where(PuzzleWord.word_index == word_index)
            ).first()
            return word
    
    def get_puzzle_length(self, puzzle_name: str) -> int:
        """Get total number of words in puzzle."""
        with Session(get_engine()) as session:
            count = session.exec(
                select(PuzzleWord)
                .where(PuzzleWord.puzzle_name == puzzle_name)
            ).count()
            return count
    
    def initialize_default_puzzles(self) -> None:
        """Load all available puzzles into the database."""
        available_puzzles = self.get_available_puzzles()
        for puzzle_name in available_puzzles:
            try:
                self.load_puzzle_to_database(puzzle_name)
                print(f"Loaded puzzle: {puzzle_name}")
            except Exception as e:
                print(f"Failed to load puzzle {puzzle_name}: {e}")


puzzle_service = PuzzleService()