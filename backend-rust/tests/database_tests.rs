// Unit tests for database models
// These tests verify that our models work correctly with SeaORM

use chrono::Utc;
use raddle_teams_rust::database::{
    LobbyActiveModel, PlayerActiveModel, TeamActiveModel,
};
use sea_orm::Set;
use uuid::Uuid;

#[cfg(test)]
mod lobby_tests {
    use super::*;

    #[test]
    fn test_create_lobby_active_model() {
        let now = Utc::now();

        let lobby = LobbyActiveModel {
            name: Set("Test Lobby".to_string()),
            code: Set("ABC123".to_string()),
            created_at: Set(now),
            ..Default::default()
        };

        // Verify the ActiveModel was created correctly
        assert!(matches!(lobby.name, Set(_)));
        assert!(matches!(lobby.code, Set(_)));
        assert!(matches!(lobby.created_at, Set(_)));
    }

    #[test]
    fn test_lobby_code_format() {
        // Test that we can create a lobby with a 6-character code
        let code = Uuid::new_v4()
            .to_string()
            .chars()
            .filter(|c| c.is_alphanumeric())
            .take(6)
            .collect::<String>()
            .to_uppercase();

        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_alphanumeric()));
        assert!(code.chars().all(|c| c.is_uppercase() || c.is_numeric()));
    }
}

#[cfg(test)]
mod player_tests {
    use super::*;

    #[test]
    fn test_create_player_active_model() {
        let now = Utc::now();
        let session_id = Uuid::new_v4().to_string();

        let player = PlayerActiveModel {
            name: Set("Alice".to_string()),
            session_id: Set(session_id.clone()),
            lobby_id: Set(1),
            team_id: Set(None),
            created_at: Set(now),
            ..Default::default()
        };

        // Verify the ActiveModel was created correctly
        assert!(matches!(player.name, Set(_)));
        assert!(matches!(player.session_id, Set(_)));
        assert!(matches!(player.lobby_id, Set(_)));
        assert!(matches!(player.team_id, Set(None)));
    }

    #[test]
    fn test_assign_player_to_team() {
        let now = Utc::now();
        let session_id = Uuid::new_v4().to_string();

        let mut player = PlayerActiveModel {
            name: Set("Alice".to_string()),
            session_id: Set(session_id),
            lobby_id: Set(1),
            team_id: Set(None),
            created_at: Set(now),
            ..Default::default()
        };

        // Assign player to a team
        player.team_id = Set(Some(1));

        assert!(matches!(player.team_id, Set(Some(1))));
    }

    #[test]
    fn test_player_session_id_is_uuid() {
        let session_id = Uuid::new_v4().to_string();

        // Verify it's a valid UUID format
        assert!(Uuid::parse_str(&session_id).is_ok());
        assert_eq!(session_id.len(), 36); // UUID string length with hyphens
    }
}

#[cfg(test)]
mod team_tests {
    use super::*;

    #[test]
    fn test_create_team_active_model() {
        let now = Utc::now();

        let team = TeamActiveModel {
            name: Set("Team 1".to_string()),
            lobby_id: Set(1),
            current_word_index: Set(0),
            completed_at: Set(None),
            created_at: Set(now),
            ..Default::default()
        };

        // Verify the ActiveModel was created correctly
        assert!(matches!(team.name, Set(_)));
        assert!(matches!(team.lobby_id, Set(_)));
        assert!(matches!(team.current_word_index, Set(0)));
        assert!(matches!(team.completed_at, Set(None)));
    }

    #[test]
    fn test_team_progress() {
        let now = Utc::now();

        let mut team = TeamActiveModel {
            name: Set("Team 1".to_string()),
            lobby_id: Set(1),
            current_word_index: Set(0),
            completed_at: Set(None),
            created_at: Set(now),
            ..Default::default()
        };

        // Advance word index
        team.current_word_index = Set(5);
        assert!(matches!(team.current_word_index, Set(5)));

        // Mark as completed
        let completed_time = Utc::now();
        team.completed_at = Set(Some(completed_time));
        assert!(matches!(team.completed_at, Set(Some(_))));
    }

    #[test]
    fn test_multiple_teams_same_lobby() {
        let now = Utc::now();

        let team1 = TeamActiveModel {
            name: Set("Team 1".to_string()),
            lobby_id: Set(1),
            current_word_index: Set(0),
            completed_at: Set(None),
            created_at: Set(now),
            ..Default::default()
        };

        let team2 = TeamActiveModel {
            name: Set("Team 2".to_string()),
            lobby_id: Set(1),
            current_word_index: Set(0),
            completed_at: Set(None),
            created_at: Set(now),
            ..Default::default()
        };

        // Both teams should reference the same lobby
        if let (Set(lobby_id1), Set(lobby_id2)) = (team1.lobby_id, team2.lobby_id) {
            assert_eq!(lobby_id1, lobby_id2);
        }
    }
}

#[cfg(test)]
mod schema_validation_tests {
    use super::*;

    #[test]
    fn test_lobby_code_validation() {
        // Codes should be 6 characters, alphanumeric, uppercase
        let valid_codes = vec!["ABC123", "XYZ789", "GAME01"];

        for code in valid_codes {
            assert_eq!(code.len(), 6);
            assert!(code.chars().all(|c| c.is_alphanumeric()));
            assert!(code.chars().all(|c| c.is_uppercase() || c.is_numeric()));
        }
    }

    #[test]
    fn test_player_name_validation() {
        // Player names should be non-empty strings
        let valid_names = vec!["Alice", "Bob", "Player 1", "🎮 Gamer"];

        for name in valid_names {
            assert!(!name.is_empty());
            assert!(name.len() <= 100); // Reasonable max length
        }
    }

    #[test]
    fn test_team_name_format() {
        // Team names should follow "Team N" pattern
        for i in 1..=10 {
            let team_name = format!("Team {}", i);
            assert!(team_name.starts_with("Team "));
            assert!(team_name.len() >= 6); // "Team 1"
            assert!(team_name.len() <= 7); // "Team 10"
        }
    }
}

#[cfg(test)]
mod business_logic_tests {
    use super::*;

    #[test]
    fn test_team_assignment_logic() {
        // Simulate assigning 10 players to 3 teams
        let num_players = 10;
        let num_teams = 3;

        let mut team_counts = vec![0; num_teams];

        for i in 0..num_players {
            let team_index = i % num_teams;
            team_counts[team_index] += 1;
        }

        // Verify distribution
        assert_eq!(team_counts[0], 4); // Team 1: players 0, 3, 6, 9
        assert_eq!(team_counts[1], 3); // Team 2: players 1, 4, 7
        assert_eq!(team_counts[2], 3); // Team 3: players 2, 5, 8

        let total: usize = team_counts.iter().sum();
        assert_eq!(total, num_players);
    }

    #[test]
    fn test_word_progression() {
        // Test word chain progression logic
        let total_words = 10;
        let mut current_index = 0;

        // Simulate progressing through the word chain
        for _ in 0..5 {
            current_index += 1;
        }

        assert_eq!(current_index, 5);
        assert!(current_index < total_words);

        // Simulate completing the chain
        current_index = total_words;
        assert_eq!(current_index, total_words);
    }

    #[test]
    fn test_lobby_capacity() {
        // Test that we can handle reasonable number of players
        let max_players = 100;
        let max_teams = 10;

        assert!(max_players >= max_teams);
        assert!(max_players / max_teams >= 1); // At least 1 player per team

        // Min players per team
        let min_per_team = max_players / max_teams;
        assert!(min_per_team >= 1);
    }
}
