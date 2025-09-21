import json
import os
from pathlib import Path

import yaml


def convert_yaml_to_json(yaml_file_path, json_file_path):
    """Convert a single YAML file to JSON format."""
    try:
        with open(yaml_file_path, "r", encoding="utf-8") as yaml_file:
            data = yaml.safe_load(yaml_file)

        # Create the output directory if it doesn't exist
        os.makedirs(os.path.dirname(json_file_path), exist_ok=True)

        with open(json_file_path, "w", encoding="utf-8") as json_file:
            json.dump(data, json_file, indent=2, ensure_ascii=False)

        return True
    except Exception as e:
        print(f"Error converting {yaml_file_path}: {e}")
        return False


def get_json_path(yaml_path):
    """Convert YAML file path to corresponding JSON file path."""
    # Convert yaml_puzzles/2025/08/23.yaml to json_puzzles/2025/08/23.json
    path_parts = Path(yaml_path).parts
    if path_parts[0] == "yaml_puzzles":
        json_path = Path("json_puzzles") / Path(*path_parts[1:])
        return json_path.with_suffix(".json")
    else:
        # If not in yaml_puzzles folder, just change extension
        return Path(yaml_path).with_suffix(".json")


def convert_all_yaml_files():
    """Convert all YAML files in yaml_puzzles directory to JSON format."""
    yaml_root = Path("yaml_puzzles")

    if not yaml_root.exists():
        print("yaml_puzzles directory not found!")
        return

    converted_count = 0
    skipped_count = 0
    error_count = 0

    # Find all YAML files
    yaml_files = list(yaml_root.rglob("*.yaml"))

    print(f"Found {len(yaml_files)} YAML files to convert...")

    for yaml_file in yaml_files:
        json_file = get_json_path(yaml_file)

        # Skip if JSON file already exists
        if json_file.exists():
            print(f"Skipping {json_file}, already exists")
            skipped_count += 1
            continue

        if convert_yaml_to_json(yaml_file, json_file):
            print(f"Converted {yaml_file} -> {json_file}")
            converted_count += 1
        else:
            error_count += 1

    print("\nConversion complete!")
    print(f"Converted: {converted_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")


def main():
    """Main function to convert YAML files to JSON."""
    try:
        convert_all_yaml_files()
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
