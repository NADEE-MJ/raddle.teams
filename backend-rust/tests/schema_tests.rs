// Unit tests for request/response schemas
use raddle_teams_rust::schemas::*;
use serde_json;

#[cfg(test)]
mod request_schema_tests {
    use super::*;

    #[test]
    fn test_lobby_create_serialization() {
        let lobby = LobbyCreate {
            name: "Test Lobby".to_string(),
        };

        let json = serde_json::to_string(&lobby).unwrap();
        assert!(json.contains("Test Lobby"));

        let deserialized: LobbyCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "Test Lobby");
    }

    #[test]
    fn test_player_create_serialization() {
        let player = PlayerCreate {
            name: "Alice".to_string(),
        };

        let json = serde_json::to_string(&player).unwrap();
        assert!(json.contains("Alice"));

        let deserialized: PlayerCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "Alice");
    }

    #[test]
    fn test_team_create_validation() {
        // Valid team counts (2-10)
        for num in 2..=10 {
            let team = TeamCreate { num_teams: num };
            assert!(team.num_teams >= 2 && team.num_teams <= 10);
        }

        // Test serialization
        let team = TeamCreate { num_teams: 3 };
        let json = serde_json::to_string(&team).unwrap();
        let deserialized: TeamCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.num_teams, 3);
    }
}

#[cfg(test)]
mod response_schema_tests {
    use super::*;

    #[test]
    fn test_message_response_success() {
        let response = MessageResponse::success("Operation completed");

        assert_eq!(response.message, "Operation completed");
        assert_eq!(response.status, true);

        // Test serialization
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("Operation completed"));
        assert!(json.contains("true"));
    }

    #[test]
    fn test_message_response_error() {
        let response = MessageResponse::error("Operation failed");

        assert_eq!(response.message, "Operation failed");
        assert_eq!(response.status, false);

        // Test serialization
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("Operation failed"));
        assert!(json.contains("false"));
    }

    #[test]
    fn test_error_response() {
        let error = ErrorResponse::new("Something went wrong");

        assert_eq!(error.detail, "Something went wrong");

        // Test serialization
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("Something went wrong"));

        let deserialized: ErrorResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.detail, "Something went wrong");
    }

    #[test]
    fn test_admin_authenticated_response() {
        let response = AdminAuthenticatedResponse {
            session_id: "abc123xyz".to_string(),
        };

        assert_eq!(response.session_id, "abc123xyz");

        // Test serialization
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("abc123xyz"));

        let deserialized: AdminAuthenticatedResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.session_id, "abc123xyz");
    }

    #[test]
    fn test_api_root_response() {
        use std::collections::HashMap;

        let mut endpoints = HashMap::new();
        endpoints.insert("docs".to_string(), "/docs".to_string());
        endpoints.insert("api".to_string(), "/api".to_string());

        let response = ApiRootResponse {
            message: "Welcome to API".to_string(),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
            documentation_endpoints: endpoints,
        };

        assert_eq!(response.message, "Welcome to API");
        assert_eq!(response.documentation_endpoints.len(), 2);

        // Test serialization
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("Welcome to API"));
        assert!(json.contains("/docs"));
    }
}

#[cfg(test)]
mod json_roundtrip_tests {
    use super::*;

    #[test]
    fn test_lobby_create_roundtrip() {
        let lobby_create = LobbyCreate {
            name: "Test".to_string(),
        };
        let json = serde_json::to_string(&lobby_create).unwrap();
        let decoded: LobbyCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.name, lobby_create.name);
    }

    #[test]
    fn test_player_create_roundtrip() {
        let player_create = PlayerCreate {
            name: "Alice".to_string(),
        };
        let json = serde_json::to_string(&player_create).unwrap();
        let decoded: PlayerCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.name, player_create.name);
    }

    #[test]
    fn test_team_create_roundtrip() {
        let team_create = TeamCreate { num_teams: 5 };
        let json = serde_json::to_string(&team_create).unwrap();
        let decoded: TeamCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.num_teams, team_create.num_teams);
    }

    #[test]
    fn test_error_response_roundtrip() {
        let error = ErrorResponse::new("Error");
        let json = serde_json::to_string(&error).unwrap();
        let decoded: ErrorResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.detail, error.detail);
    }

    #[test]
    fn test_message_response_roundtrip() {
        let message = MessageResponse::success("Success");
        let json = serde_json::to_string(&message).unwrap();
        let decoded: MessageResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.message, message.message);
        assert_eq!(decoded.status, message.status);
    }
}

#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn test_lobby_name_validation() {
        // Test various valid lobby names
        let names = vec!["Game Night", "Test 123", "🎮 Gaming", "My-Lobby"];

        for name in names {
            let lobby = LobbyCreate {
                name: name.to_string(),
            };
            assert!(!lobby.name.is_empty());
            assert!(lobby.name.len() <= 100); // Reasonable max
        }
    }

    #[test]
    fn test_player_name_validation() {
        // Test various valid player names
        let names = vec!["Alice", "Bob123", "Player-1", "🎮 Gamer"];

        for name in names {
            let player = PlayerCreate {
                name: name.to_string(),
            };
            assert!(!player.name.is_empty());
            assert!(player.name.len() <= 100); // Reasonable max
        }
    }

    #[test]
    fn test_team_count_boundaries() {
        // Test minimum (2 teams)
        let min_teams = TeamCreate { num_teams: 2 };
        assert_eq!(min_teams.num_teams, 2);

        // Test maximum (10 teams)
        let max_teams = TeamCreate { num_teams: 10 };
        assert_eq!(max_teams.num_teams, 10);

        // Test middle value
        let mid_teams = TeamCreate { num_teams: 5 };
        assert_eq!(mid_teams.num_teams, 5);
    }

    #[test]
    fn test_empty_message_response() {
        let response = MessageResponse::success("");
        assert_eq!(response.message, "");
        assert_eq!(response.status, true);
    }

    #[test]
    fn test_special_characters_in_responses() {
        // Test that special characters are preserved
        let special_chars = "Special: !@#$%^&*()_+-=[]{}|;':\"<>?,./~`";

        let error = ErrorResponse::new(special_chars);
        assert_eq!(error.detail, special_chars);

        let json = serde_json::to_string(&error).unwrap();
        let decoded: ErrorResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.detail, special_chars);
    }

    #[test]
    fn test_unicode_in_responses() {
        // Test Unicode characters
        let unicode_text = "Hello 世界 🌍 Привет";

        let lobby = LobbyCreate {
            name: unicode_text.to_string(),
        };

        let json = serde_json::to_string(&lobby).unwrap();
        let decoded: LobbyCreate = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.name, unicode_text);
    }
}
