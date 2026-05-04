import os
import re

import requests


def get_manifest():
    """Fetch the raddle manifest from the API."""
    url = "https://raddle.quest/data/manifest.json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


def parse_puzzle_info(puzzle):
    """Extract year, month, day and build file path + download URL from a manifest entry.

    The manifest format changed from:
        {"date": "2026-02-08", "path": "/data/2026/02/08.yaml"}
    to:
        {"month": "2026-05", "slug": "04-again-life", "num": 434}

    Both formats are handled here.
    """
    if "date" in puzzle:
        # Old format
        date_parts = puzzle["date"].split("-")
        year, month, day = date_parts[0], date_parts[1], date_parts[2]
        puzzle_url = f"https://raddle.quest{puzzle['path']}"
    else:
        # New format: month="2026-05", slug="04-again-life"
        year, month = puzzle["month"].split("-")
        day = puzzle["slug"].split("-")[0]  # e.g. "04" from "04-again-life"
        puzzle_url = f"https://raddle.quest/data/puzzles/{year}/{month}/{puzzle['slug']}.yaml"

    folder_path = f"yaml_puzzles/{year}/{month}"
    file_path = f"{folder_path}/{day}.yaml"
    return folder_path, file_path, puzzle_url


def clean_content(content):
    """Transform placeholders in downloaded content."""
    # Decode bytes as UTF-8 (server sends proper UTF-8)
    if isinstance(content, bytes):
        content = content.decode("utf-8")

    # Transform placeholders in clues:
    # ^ -> <> (question word)
    # ___ -> ^ (answer word - converted to {} in JSON)
    # [word] -> ^ (answer word hint - converted to {} in JSON)

    # Replace all ^ with <> globally
    content = content.replace("^", "<>")

    # Process line by line for clue-specific replacements (to avoid replacing in other fields)
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if "clue:" in line:
            # Replace all ___ with ^ on this line
            line = line.replace("___", "^")
            # Replace all [word] patterns with ^ on this line
            line = re.sub(r"\[[^\]]+\]", "^", line)
            lines[i] = line
    content = "\n".join(lines)

    # Fix bare special characters in transform fields by quoting them
    # Matches: "transform: <single-char>" where char is a YAML special character
    content = re.sub(r"(\s+transform:\s*)(=|&|\||>|<|!|%|@|`)(\s*$)", r'\1"\2"\3', content, flags=re.MULTILINE)

    return content


def download_puzzle(puzzle):
    """Download a single puzzle if it doesn't already exist."""
    try:
        folder_path, file_path, puzzle_url = parse_puzzle_info(puzzle)
    except (KeyError, ValueError) as e:
        print(f"⚠️  Skipping malformed puzzle entry {puzzle}: {e}")
        return

    # Skip if puzzle already exists
    if os.path.exists(file_path):
        print(f"⏭️  Skipping {file_path}, already exists")
        return

    # Download the puzzle YAML file
    response = requests.get(puzzle_url)
    response.raise_for_status()

    # Clean the content
    cleaned_content = clean_content(response.content)

    # Create directory and save file
    os.makedirs(folder_path, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(cleaned_content)
    print(f"✅ Saved {file_path}")


def main():
    try:
        manifest = get_manifest()

        for puzzle in manifest["puzzles"]:
            download_puzzle(puzzle)

        print("Download complete!")

    except requests.RequestException as e:
        print(f"Error downloading data: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
