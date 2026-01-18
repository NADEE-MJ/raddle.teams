"""Name generator for rooms."""

import random

# Adjectives for room names
ROOM_ADJECTIVES = [
    "Wild",
    "Crazy",
    "Super",
    "Mega",
    "Ultra",
    "Epic",
    "Stellar",
    "Cosmic",
    "Radical",
    "Awesome",
    "Legendary",
    "Mythical",
    "Fantastic",
    "Glorious",
    "Spectacular",
    "Magnificent",
    "Stupendous",
    "Marvelous",
    "Incredible",
    "Amazing",
    "Wonderful",
    "Brilliant",
    "Dazzling",
    "Sparkling",
    "Shimmering",
]

# Nouns for room names (singular concepts/places)
ROOM_NOUNS = [
    "Party",
    "Showdown",
    "Challenge",
    "Quest",
    "Adventure",
    "Expedition",
    "Journey",
    "Odyssey",
    "Festival",
    "Fiesta",
    "Jamboree",
    "Carnival",
    "Celebration",
    "Gathering",
    "Meetup",
    "Session",
    "Event",
    "Happening",
    "Shindig",
    "Bash",
    "Bonanza",
    "Extravaganza",
    "Gala",
    "Soiree",
    "Function",
]


def generate_room_name() -> str:
    """Generate a fun room name."""
    adjective = random.choice(ROOM_ADJECTIVES)
    noun = random.choice(ROOM_NOUNS)
    return f"{adjective} {noun}"


def generate_room_code(length: int = 6) -> str:
    """Generate a random room code."""
    import string

    characters = string.ascii_uppercase + string.digits
    # Exclude confusing characters: 0, O, I, 1
    characters = characters.replace("0", "").replace("O", "").replace("I", "").replace("1", "")
    return "".join(random.choice(characters) for _ in range(length))
