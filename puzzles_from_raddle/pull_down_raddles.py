import os

import requests


def get_manifest():
    """Fetch the raddle manifest from the API."""
    url = "https://raddle.quest/data/manifest.json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


def create_file_path(puzzle_date):
    """Create the folder and file path based on the puzzle date."""
    date_parts = puzzle_date.split("-")
    folder_path = f"yaml_puzzles/{date_parts[0]}/{date_parts[1]}"
    file_path = f"{folder_path}/{date_parts[2]}.yaml"
    return folder_path, file_path


def download_puzzle(puzzle):
    """Download a single puzzle if it doesn't already exist."""
    folder_path, file_path = create_file_path(puzzle["date"])

    # Skip if puzzle already exists
    if os.path.exists(file_path):
        print(f"Skipping {file_path}, already exists")
        return

    # Download the puzzle YAML file
    puzzle_url = f"https://raddle.quest{puzzle['path']}"
    response = requests.get(puzzle_url)
    response.raise_for_status()

    # Create directory and save file
    os.makedirs(folder_path, exist_ok=True)
    with open(file_path, "w") as f:
        f.write(response.text)
    print(f"Saved {file_path}")


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
