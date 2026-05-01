import Foundation

@MainActor
final class AdminStore: ObservableObject {
    @Published var token: String = UserDefaults.standard.string(forKey: "raddle_admin_token") ?? ""
    @Published var sessionId: String? = UserDefaults.standard.string(forKey: "raddle_admin_session_id")
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var socketConnected = false

    @Published var lobbies: [Lobby] = []
    @Published var selectedLobby: LobbyInfo?
    @Published var gameState: GameStateResponse?
    @Published var timerState: TimerStateResponse?
    @Published var rounds: [RoundSummary] = []
    @Published var leaderboard: LeaderboardResponse?
    @Published var puzzleDates: [String] = []

    let api = APIClient()
    private var socketTask: URLSessionWebSocketTask?
    private var reconnectTask: Task<Void, Never>?
    private var selectedLobbyId: Int?

    var activeToken: String? {
        token.isEmpty ? nil : token
    }

    func restoreSession() {
        guard let activeToken else { return }
        Task {
            do {
                let response = try await api.checkCredentials(token: activeToken)
                sessionId = response.sessionId
                UserDefaults.standard.set(activeToken, forKey: "raddle_admin_token")
                UserDefaults.standard.set(response.sessionId, forKey: "raddle_admin_session_id")
                isAuthenticated = true
                connectWebSocket()
                await refreshLobbies()
            } catch {
                logout()
            }
        }
    }

    func login() async {
        guard !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        await run {
            let response = try await api.checkCredentials(token: token)
            sessionId = response.sessionId
            UserDefaults.standard.set(token, forKey: "raddle_admin_token")
            UserDefaults.standard.set(response.sessionId, forKey: "raddle_admin_session_id")
            isAuthenticated = true
            connectWebSocket()
            await refreshLobbies()
        }
    }

    func logout() {
        socketTask?.cancel(with: .goingAway, reason: nil)
        socketTask = nil
        reconnectTask?.cancel()
        reconnectTask = nil
        socketConnected = false
        isAuthenticated = false
        sessionId = nil
        selectedLobby = nil
        selectedLobbyId = nil
        UserDefaults.standard.removeObject(forKey: "raddle_admin_token")
        UserDefaults.standard.removeObject(forKey: "raddle_admin_session_id")
    }

    func refreshLobbies() async {
        guard let activeToken else { return }
        await run(showLoading: false) {
            lobbies = try await api.getLobbies(token: activeToken)
        }
    }

    func createLobby(name: String) async {
        guard let activeToken else { return }
        await run {
            _ = try await api.createLobby(name: name, token: activeToken)
            await refreshLobbies()
        }
    }

    func generateLobbyName() async -> String {
        guard let activeToken else { return "" }
        do {
            return try await api.randomLobbyName(token: activeToken).name
        } catch {
            errorMessage = error.localizedDescription
            return ""
        }
    }

    func selectLobby(_ lobby: Lobby) async {
        selectedLobbyId = lobby.id
        sendSocketMessage(["action": "subscribe_lobby", "lobby_id": lobby.id])
        await refreshSelectedLobby()
    }

    func closeSelectedLobby() {
        if let selectedLobbyId {
            sendSocketMessage(["action": "unsubscribe_lobby", "lobby_id": selectedLobbyId])
        }
        selectedLobby = nil
        selectedLobbyId = nil
        gameState = nil
        timerState = nil
        rounds = []
        leaderboard = nil
    }

    func refreshSelectedLobby() async {
        guard let selectedLobbyId, let activeToken else { return }
        await run(showLoading: false) {
            async let lobbyInfo = api.getLobbyInfo(id: selectedLobbyId, token: activeToken)
            async let state = try? api.getGameState(lobbyId: selectedLobbyId, token: activeToken)
            async let timer = try? api.getTimerState(lobbyId: selectedLobbyId, token: activeToken)
            async let roundsList = try? api.getRounds(lobbyId: selectedLobbyId, token: activeToken)
            async let leaderboardState = try? api.getLeaderboard(lobbyId: selectedLobbyId, token: activeToken)
            async let dates = try? api.getPuzzleDates(token: activeToken)

            selectedLobby = try await lobbyInfo
            gameState = await state
            timerState = await timer
            rounds = await roundsList ?? []
            leaderboard = await leaderboardState
            puzzleDates = await dates ?? []
        }
    }

    func deleteSelectedLobby() async {
        guard let id = selectedLobbyId, let activeToken else { return }
        await run {
            _ = try await api.deleteLobby(id: id, token: activeToken)
            closeSelectedLobby()
            await refreshLobbies()
        }
    }

    func createTeams(count: Int) async {
        guard let id = selectedLobbyId, let activeToken else { return }
        await run {
            _ = try await api.createTeams(lobbyId: id, count: count, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func addTeam() async {
        guard let id = selectedLobbyId, let activeToken else { return }
        await run {
            _ = try await api.addTeam(lobbyId: id, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func removeTeam(_ team: Team) async {
        guard let activeToken else { return }
        await run {
            _ = try await api.removeTeam(teamId: team.id, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func renameTeam(_ team: Team, name: String) async {
        guard let activeToken else { return }
        await run {
            _ = try await api.updateTeamName(teamId: team.id, name: name, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func movePlayer(_ player: Player, to teamId: Int) async {
        guard let activeToken else { return }
        await run {
            _ = try await api.movePlayer(playerId: player.id, teamId: teamId, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func kickPlayer(_ player: Player) async {
        guard let activeToken else { return }
        await run {
            _ = try await api.kickPlayer(playerId: player.id, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func startGame(difficulty: String, puzzleMode: String, wordCountMode: String, puzzleDate: String?, force: Bool) async {
        guard let id = selectedLobbyId, let activeToken else { return }
        await run {
            _ = try await api.startGame(
                lobbyId: id,
                difficulty: difficulty,
                puzzleMode: puzzleMode,
                wordCountMode: wordCountMode,
                forceStart: force,
                puzzleDate: puzzleDate,
                token: activeToken
            )
            await refreshSelectedLobby()
        }
    }

    func endGame() async {
        guard let id = selectedLobbyId, let activeToken else { return }
        await run {
            _ = try await api.endGame(lobbyId: id, token: activeToken)
            await refreshSelectedLobby()
        }
    }

    func startTimer(minutes: Int, seconds: Int) async {
        guard let id = selectedLobbyId, let activeToken else { return }
        await run {
            _ = try await api.startTimer(lobbyId: id, minutes: minutes, seconds: seconds, token: activeToken)
            timerState = try await api.getTimerState(lobbyId: id, token: activeToken)
        }
    }

    private func run(showLoading: Bool = true, _ work: () async throws -> Void) async {
        if showLoading { isLoading = true }
        errorMessage = nil
        do {
            try await work()
        } catch {
            errorMessage = error.localizedDescription
        }
        if showLoading { isLoading = false }
    }

    private func connectWebSocket() {
        socketTask?.cancel(with: .goingAway, reason: nil)
        guard let sessionId, let activeToken else { return }

        do {
            let url = try api.adminWebSocketURL(sessionId: sessionId, token: activeToken)
            let task = URLSession.shared.webSocketTask(with: url)
            socketTask = task
            task.resume()
            socketConnected = true
            receiveSocketMessage()
            if let selectedLobbyId {
                sendSocketMessage(["action": "subscribe_lobby", "lobby_id": selectedLobbyId])
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func receiveSocketMessage() {
        socketTask?.receive { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                switch result {
                case .success(let message):
                    self.handleSocketMessage(message)
                    self.receiveSocketMessage()
                case .failure:
                    self.socketConnected = false
                    self.scheduleReconnect()
                }
            }
        }
    }

    private func handleSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        let text: String?
        switch message {
        case .string(let value):
            text = value
        case .data(let data):
            text = String(data: data, encoding: .utf8)
        @unknown default:
            text = nil
        }

        guard let text, let data = text.data(using: .utf8) else { return }
        let decoded = try? JSONDecoder().decode(WebSocketMessage.self, from: data)
        let type = decoded?.type ?? "unknown"

        switch type {
        case "connection_confirmed":
            socketConnected = true
        case "state_update", "team_completed", "timer_started", "timer_expired", "game_started", "game_won", "round_ended", "new_round_started", "player_joined", "team_assigned", "team_changed", "disconnected", "player_kicked", "ready_status_changed":
            Task { await refreshSelectedLobby(); await refreshLobbies() }
        default:
            Task { await refreshSelectedLobby(); await refreshLobbies() }
        }
    }

    private func sendSocketMessage(_ object: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: object), let text = String(data: data, encoding: .utf8) else {
            return
        }
        socketTask?.send(.string(text)) { _ in }
    }

    private func scheduleReconnect() {
        reconnectTask?.cancel()
        reconnectTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            await MainActor.run {
                self?.connectWebSocket()
            }
        }
    }
}
