import Foundation

struct Player: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let sessionId: String
    let lobbyId: Int
    let teamId: Int?
    let isReady: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case sessionId = "session_id"
        case lobbyId = "lobby_id"
        case teamId = "team_id"
        case isReady = "is_ready"
        case createdAt = "created_at"
    }
}

struct Team: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let lobbyId: Int
    let gameId: Int?
    let currentWordIndex: Int
    let createdAt: String
    let totalPoints: Int?
    let roundsWon: Int?
    let roundsPlayed: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case lobbyId = "lobby_id"
        case gameId = "game_id"
        case currentWordIndex = "current_word_index"
        case createdAt = "created_at"
        case totalPoints = "total_points"
        case roundsWon = "rounds_won"
        case roundsPlayed = "rounds_played"
    }
}

struct Lobby: Codable, Identifiable, Hashable {
    let id: Int
    let code: String
    let name: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case code
        case name
        case createdAt = "created_at"
    }
}

struct LobbyInfo: Codable {
    let lobby: Lobby
    let players: [Player]
    let playersByTeam: [String: [Player]]?
    let teams: [Team]?

    enum CodingKeys: String, CodingKey {
        case lobby
        case players
        case playersByTeam = "players_by_team"
        case teams
    }
}

struct MessageResponse: Codable {
    let status: Bool?
    let message: String?
}

struct GeneratedNameResponse: Codable {
    let name: String
}

struct AdminAuthenticatedResponse: Codable {
    let sessionId: String

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
    }
}

struct StartGameResponse: Codable {
    let success: Bool?
    let gameId: Int?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case success
        case gameId = "game_id"
        case message
    }
}

struct PuzzleStep: Codable, Hashable {
    let word: String
    let clue: String?
    let transform: String?
}

struct AdminPuzzle: Codable, Hashable {
    let title: String
    let ladder: [PuzzleStep]
}

struct TeamGameProgress: Codable, Identifiable, Hashable {
    var id: Int { teamId }

    let teamId: Int
    let teamName: String
    let puzzle: AdminPuzzle
    let revealedSteps: [Int]
    let isCompleted: Bool
    let completedAt: String?

    enum CodingKeys: String, CodingKey {
        case teamId = "team_id"
        case teamName = "team_name"
        case puzzle
        case revealedSteps = "revealed_steps"
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
    }
}

struct GameStateResponse: Codable {
    let isGameActive: Bool
    let teams: [TeamGameProgress]

    enum CodingKeys: String, CodingKey {
        case isGameActive = "is_game_active"
        case teams
    }
}

struct TimerStateResponse: Codable {
    let isActive: Bool
    let durationSeconds: Int?
    let startedAt: String?
    let expiresAt: String?

    enum CodingKeys: String, CodingKey {
        case isActive = "is_active"
        case durationSeconds = "duration_seconds"
        case startedAt = "started_at"
        case expiresAt = "expires_at"
    }
}

struct RoundSummary: Codable, Identifiable, Hashable {
    var id: Int { roundNumber }

    let roundNumber: Int
    let gameId: Int

    enum CodingKeys: String, CodingKey {
        case roundNumber = "round_number"
        case gameId = "game_id"
    }
}

struct LeaderboardResponse: Codable {
    let teams: [LeaderboardTeam]
    let currentRound: Int?
    let totalRounds: Int?
    let lastRoundGameId: Int?

    enum CodingKeys: String, CodingKey {
        case teams
        case currentRound = "current_round"
        case totalRounds = "total_rounds"
        case lastRoundGameId = "last_round_game_id"
    }
}

struct LeaderboardTeam: Codable, Identifiable, Hashable {
    var id: Int { teamId }

    let teamId: Int
    let teamName: String
    let totalPoints: Int
    let roundsWon: Int
    let roundsPlayed: Int
    let lastRoundWinner: Bool?

    enum CodingKeys: String, CodingKey {
        case teamId = "team_id"
        case teamName = "team_name"
        case totalPoints = "total_points"
        case roundsWon = "rounds_won"
        case roundsPlayed = "rounds_played"
        case lastRoundWinner = "last_round_winner"
    }
}

struct WebSocketMessage: Codable {
    let type: String
    let teamId: Int?
    let teamName: String?
    let lobbyId: Int?
    let revealedSteps: [Int]?
    let isCompleted: Bool?
    let completedAt: String?
    let expiresAt: String?

    enum CodingKeys: String, CodingKey {
        case type
        case teamId = "team_id"
        case teamName = "team_name"
        case lobbyId = "lobby_id"
        case revealedSteps = "revealed_steps"
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
        case expiresAt = "expires_at"
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case requestFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .requestFailed(let message):
            return message
        }
    }
}

final class APIClient: @unchecked Sendable {
    let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder

    init() {
        let value = Bundle.main.infoDictionary?["API_BASE_URL"] as? String ?? "https://raddle.nadee-mj.dev"
        baseURL = URL(string: value) ?? URL(string: "https://raddle.nadee-mj.dev")!
        session = URLSession(configuration: .default)
        decoder = JSONDecoder()
    }

    func adminWebSocketURL(sessionId: String, token: String) throws -> URL {
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.scheme = baseURL.scheme == "https" ? "wss" : "ws"
        components?.path = "/ws/admin/\(sessionId)"
        components?.queryItems = [URLQueryItem(name: "token", value: token)]
        guard let url = components?.url else { throw APIError.invalidURL }
        return url
    }

    func checkCredentials(token: String) async throws -> AdminAuthenticatedResponse {
        try await request("/api/admin/check", token: token)
    }

    func getPuzzleDates(token: String) async throws -> [String] {
        try await request("/api/admin/puzzles/dates", token: token)
    }

    func getLobbies(token: String) async throws -> [Lobby] {
        try await request("/api/admin/lobby", token: token)
    }

    func createLobby(name: String, token: String) async throws -> Lobby {
        try await request("/api/admin/lobby", method: "POST", body: ["name": name], token: token)
    }

    func randomLobbyName(token: String) async throws -> GeneratedNameResponse {
        try await request("/api/admin/lobby/random-name", token: token)
    }

    func deleteLobby(id: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/\(id)", method: "DELETE", token: token)
    }

    func getLobbyInfo(id: Int, token: String) async throws -> LobbyInfo {
        try await request("/api/admin/lobby/\(id)", token: token)
    }

    func createTeams(lobbyId: Int, count: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/\(lobbyId)/team", method: "POST", body: ["num_teams": count], token: token)
    }

    func addTeam(lobbyId: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/\(lobbyId)/team/add-one", method: "POST", token: token)
    }

    func removeTeam(teamId: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/team/\(teamId)", method: "DELETE", token: token)
    }

    func movePlayer(playerId: Int, teamId: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/team/\(teamId)/player/\(playerId)", method: "PUT", token: token)
    }

    func updateTeamName(teamId: Int, name: String, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/team/\(teamId)/name", method: "PUT", body: ["name": name], token: token)
    }

    func kickPlayer(playerId: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/player/\(playerId)", method: "DELETE", token: token)
    }

    func startGame(
        lobbyId: Int,
        difficulty: String,
        puzzleMode: String,
        wordCountMode: String,
        forceStart: Bool,
        puzzleDate: String?,
        token: String
    ) async throws -> StartGameResponse {
        var body: [String: Any] = [
            "difficulty": difficulty,
            "puzzle_mode": puzzleMode,
            "word_count_mode": wordCountMode,
            "force_start": forceStart,
        ]
        if let puzzleDate, !puzzleDate.isEmpty {
            body["puzzle_date"] = puzzleDate
        }
        return try await request("/api/admin/lobby/\(lobbyId)/start", method: "POST", body: body, token: token)
    }

    func getGameState(lobbyId: Int, token: String) async throws -> GameStateResponse {
        try await request("/api/admin/lobby/\(lobbyId)/game-state", token: token)
    }

    func endGame(lobbyId: Int, token: String) async throws -> MessageResponse {
        try await request("/api/admin/lobby/\(lobbyId)/end", method: "POST", token: token)
    }

    func getTimerState(lobbyId: Int, token: String) async throws -> TimerStateResponse {
        try await request("/api/admin/lobby/\(lobbyId)/timer-state", token: token)
    }

    func startTimer(lobbyId: Int, minutes: Int, seconds: Int, token: String) async throws -> MessageResponse {
        try await request(
            "/api/admin/lobby/\(lobbyId)/start-timer",
            method: "POST",
            body: ["duration_minutes": minutes, "duration_seconds": seconds],
            token: token
        )
    }

    func getRounds(lobbyId: Int, token: String) async throws -> [RoundSummary] {
        try await request("/api/admin/lobby/\(lobbyId)/rounds", token: token)
    }

    func getLeaderboard(lobbyId: Int, token: String) async throws -> LeaderboardResponse {
        try await request("/api/lobby/\(lobbyId)/leaderboard", token: token)
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: Any? = nil,
        token: String? = nil
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.requestFailed("Non-HTTP response")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.requestFailed(Self.errorMessage(from: data, fallback: "Request failed (\(http.statusCode))"))
        }
        return try decoder.decode(T.self, from: data)
    }

    private static func errorMessage(from data: Data, fallback: String) -> String {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let detail = object["detail"]
        else {
            return String(data: data, encoding: .utf8) ?? fallback
        }
        return String(describing: detail)
    }
}
