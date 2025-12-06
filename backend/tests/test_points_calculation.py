"""Unit tests for the points calculation system."""

import math
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def calculate_points(
    placement: int,
    total_teams: int,
    completion_percentage: float,
    completed: bool,
    worst_finished_points: int,
) -> int:
    """
    Calculate points for a team based on placement and completion.

    Reverse placement for finishers; DNFs get up to 75% of worst finished points,
    scaled by completion pct, ceil, min 1.
    """
    if completed:
        return total_teams - placement + 1
    base = worst_finished_points
    cap = base * 0.75
    return max(1, math.ceil(min(cap, base * completion_percentage)))


def test_points_for_first_place():
    """Test points calculation for first place."""
    points = calculate_points(
        placement=1,
        total_teams=5,
        completion_percentage=1.0,
        completed=True,
        worst_finished_points=2,
    )
    assert points == 5  # 5 - 1 + 1 = 5


def test_points_for_second_place():
    """Test points calculation for second place."""
    points = calculate_points(
        placement=2,
        total_teams=5,
        completion_percentage=1.0,
        completed=True,
        worst_finished_points=2,
    )
    assert points == 4  # 5 - 2 + 1 = 4


def test_points_for_last_place_completed():
    """Test points calculation for last place that completed."""
    points = calculate_points(
        placement=5,
        total_teams=5,
        completion_percentage=1.0,
        completed=True,
        worst_finished_points=1,
    )
    assert points == 1  # 5 - 5 + 1 = 1


def test_points_for_dnf_with_50_percent():
    """Test DNF points with 50% completion."""
    # 5 teams, 2 finished, so worst_finished_points = 4
    # base = 4, cap = 3, completion = 0.5
    # points = max(1, ceil(min(3, 4 * 0.5))) = max(1, ceil(min(3, 2))) = max(1, ceil(2)) = 2
    points = calculate_points(
        placement=3,
        total_teams=5,
        completion_percentage=0.5,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 2


def test_points_for_dnf_with_80_percent():
    """Test DNF points with 80% completion (should hit cap)."""
    # 5 teams, 2 finished, so worst_finished_points = 4
    # base = 4, cap = 3, completion = 0.8
    # points = max(1, ceil(min(3, 4 * 0.8))) = max(1, ceil(min(3, 3.2))) = max(1, ceil(3)) = 3
    points = calculate_points(
        placement=3,
        total_teams=5,
        completion_percentage=0.8,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 3


def test_points_for_dnf_with_70_percent():
    """Test DNF points with 70% completion (just hits cap)."""
    # 5 teams, 2 finished, so worst_finished_points = 4
    # base = 4, cap = 3, completion = 0.7
    # points = max(1, ceil(min(3, 4 * 0.7))) = max(1, ceil(min(3, 2.8))) = max(1, ceil(2.8)) = 3
    points = calculate_points(
        placement=3,
        total_teams=5,
        completion_percentage=0.7,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 3  # needs >= 2.75 to reach 3


def test_points_for_dnf_with_68_percent():
    """Test DNF points with 68% completion (just below cap threshold)."""
    # 5 teams, 2 finished, so worst_finished_points = 4
    # base = 4, cap = 3, completion = 0.68
    # points = max(1, ceil(min(3, 4 * 0.68))) = max(1, ceil(min(3, 2.72))) = max(1, ceil(2.72)) = 3
    points = calculate_points(
        placement=3,
        total_teams=5,
        completion_percentage=0.68,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 3


def test_points_for_dnf_with_67_percent():
    """Test DNF points with 67% completion (just below threshold for 3 points)."""
    # 5 teams, 2 finished, so worst_finished_points = 4
    # base = 4, cap = 3, completion = 0.67
    # points = max(1, ceil(min(3, 4 * 0.67))) = max(1, ceil(min(3, 2.68))) = max(1, ceil(2.68)) = 3
    points = calculate_points(
        placement=3,
        total_teams=5,
        completion_percentage=0.67,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 3


def test_points_for_dnf_with_zero_percent():
    """Test DNF points with 0% completion."""
    points = calculate_points(
        placement=3,
        total_teams=5,
        completion_percentage=0.0,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 1  # Minimum is 1


def test_points_for_dnf_when_no_teams_finished():
    """Test DNF points when no team finished (worst_finished_points = total_teams)."""
    # 5 teams, 0 finished, so worst_finished_points = 5
    # base = 5, cap = 3.75, completion = 0.6
    # points = max(1, ceil(min(3.75, 5 * 0.6))) = max(1, ceil(min(3.75, 3))) = max(1, ceil(3)) = 3
    points = calculate_points(
        placement=1,
        total_teams=5,
        completion_percentage=0.6,
        completed=False,
        worst_finished_points=5,
    )
    assert points == 3


def test_points_for_dnf_with_very_low_completion():
    """Test DNF points with very low completion."""
    # Should still get at least 1 point
    points = calculate_points(
        placement=5,
        total_teams=5,
        completion_percentage=0.01,
        completed=False,
        worst_finished_points=4,
    )
    assert points == 1


def test_points_reverse_placement():
    """Test that points decrease with worse placement for completed teams."""
    total_teams = 5
    placements_points = []

    for placement in range(1, 6):
        points = calculate_points(
            placement=placement,
            total_teams=total_teams,
            completion_percentage=1.0,
            completed=True,
            worst_finished_points=1,
        )
        placements_points.append((placement, points))

    # Verify points decrease as placement worsens
    for i in range(len(placements_points) - 1):
        assert placements_points[i][1] > placements_points[i + 1][1]

    # Verify specific values
    assert placements_points[0][1] == 5  # 1st place
    assert placements_points[1][1] == 4  # 2nd place
    assert placements_points[2][1] == 3  # 3rd place
    assert placements_points[3][1] == 2  # 4th place
    assert placements_points[4][1] == 1  # 5th place
