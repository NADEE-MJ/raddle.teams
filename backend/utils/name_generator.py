"""Name generator for teams and lobbies."""

import random

# Adjectives for team names
TEAM_ADJECTIVES = [
    "Brilliant",
    "Savage",
    "Mighty",
    "Sneaky",
    "Clever",
    "Daring",
    "Fearless",
    "Jolly",
    "Wacky",
    "Cosmic",
    "Electric",
    "Blazing",
    "Radical",
    "Epic",
    "Legendary",
    "Mystical",
    "Rowdy",
    "Zany",
    "Funky",
    "Groovy",
    "Stellar",
    "Supreme",
    "Ultimate",
    "Chaotic",
    "Dynamic",
    "Turbo",
    "Ninja",
    "Quantum",
    "Speedy",
    "Brave",
]

# Nouns for team names (plural animals and objects)
TEAM_NOUNS = [
    "Bananas",
    "Sloths",
    "Pandas",
    "Llamas",
    "Narwhals",
    "Penguins",
    "Otters",
    "Raccoons",
    "Flamingos",
    "Unicorns",
    "Dragons",
    "Wizards",
    "Pirates",
    "Ninjas",
    "Vikings",
    "Robots",
    "Astronauts",
    "Dinosaurs",
    "Phoenixes",
    "Griffins",
    "Krakens",
    "Wombats",
    "Platypuses",
    "Meerkats",
    "Hedgehogs",
    "Capybaras",
    "Jellyfish",
    "Octopi",
    "Squirrels",
    "Beavers",
]

# Adjectives for lobby names
LOBBY_ADJECTIVES = [
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

# Nouns for lobby names (singular concepts/places)
LOBBY_NOUNS = [
    "Arena",
    "Battleground",
    "Tournament",
    "Championship",
    "Showdown",
    "Challenge",
    "Quest",
    "Adventure",
    "Expedition",
    "Journey",
    "Odyssey",
    "Fortress",
    "Castle",
    "Kingdom",
    "Galaxy",
    "Universe",
    "Dimension",
    "Portal",
    "Nexus",
    "Summit",
    "Playground",
    "Carnival",
    "Festival",
    "Fiesta",
    "Jamboree",
]


def generate_team_name() -> str:
    """Generate a funny team name."""
    adjective = random.choice(TEAM_ADJECTIVES)
    noun = random.choice(TEAM_NOUNS)
    return f"{adjective} {noun}"


def generate_lobby_name() -> str:
    """Generate a funny lobby name."""
    adjective = random.choice(LOBBY_ADJECTIVES)
    noun = random.choice(LOBBY_NOUNS)
    return f"{adjective} {noun}"


def generate_multiple_team_names(count: int) -> list[str]:
    """Generate multiple unique team names."""
    # Ensure we don't try to generate more names than possible unique combinations
    max_combinations = len(TEAM_ADJECTIVES) * len(TEAM_NOUNS)
    if count > max_combinations:
        raise ValueError(f"Cannot generate {count} unique names. Maximum is {max_combinations}")

    names = set()
    while len(names) < count:
        names.add(generate_team_name())

    return list(names)
