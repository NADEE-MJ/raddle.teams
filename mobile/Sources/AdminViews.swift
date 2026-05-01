import SwiftUI

struct LobbyDetailView: View {
    @ObservedObject var store: AdminStore
    @Environment(\.dismiss) private var dismiss

    @State private var teamCount = 2
    @State private var difficulty = "medium"
    @State private var puzzleMode = "same"
    @State private var wordCountMode = "balanced"
    @State private var selectedPuzzleDate = ""
    @State private var timerMinutes = 3
    @State private var timerSeconds = 0
    @State private var forceStart = false
    @State private var deleteConfirmation = false

    private var lobbyInfo: LobbyInfo? { store.selectedLobby }
    private var teams: [Team] { lobbyInfo?.teams ?? [] }
    private var players: [Player] { lobbyInfo?.players ?? [] }
    private var unassignedPlayers: [Player] { players.filter { $0.teamId == nil } }
    private var activeGame: Bool { store.gameState?.isGameActive == true }

    var body: some View {
        NavigationStack {
            List {
                if let error = store.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }

                if let lobbyInfo {
                    Section("Lobby") {
                        LabeledContent("Name", value: lobbyInfo.lobby.name)
                        LabeledContent("Code", value: lobbyInfo.lobby.code)
                        LabeledContent("Players", value: "\(players.count)")
                        LabeledContent("Teams", value: "\(teams.count)")
                        LabeledContent("Created", value: lobbyInfo.lobby.createdAt.formattedDate)
                        LabeledContent("WebSocket", value: store.socketConnected ? "Connected" : "Disconnected")
                    }

                    leaderboardSection
                    gameProgressSection
                    gameControlsSection
                    teamManagementSection
                    playersSection

                    Section {
                        Button("Delete Lobby", role: .destructive) {
                            deleteConfirmation = true
                        }
                    }
                } else {
                    Section {
                        ProgressView("Loading lobby")
                    }
                }
            }
            .navigationTitle(lobbyInfo?.lobby.name ?? "Lobby")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await store.refreshSelectedLobby() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .refreshable { await store.refreshSelectedLobby() }
            .task { await store.refreshSelectedLobby() }
            .confirmationDialog("Delete this lobby?", isPresented: $deleteConfirmation, titleVisibility: .visible) {
                Button("Delete Lobby", role: .destructive) {
                    Task {
                        await store.deleteSelectedLobby()
                        dismiss()
                    }
                }
            } message: {
                Text("This action cannot be undone.")
            }
        }
    }

    private var leaderboardSection: some View {
        Section("Tournament Standings") {
            if let leaderboard = store.leaderboard, !leaderboard.teams.isEmpty {
                ForEach(leaderboard.teams) { team in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(team.teamName)
                                .font(.headline)
                            Text("\(team.roundsWon) wins · \(team.roundsPlayed) rounds")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text("\(team.totalPoints) pts")
                            .font(.headline)
                    }
                }
            } else if store.rounds.isEmpty {
                Text("No completed rounds yet")
                    .foregroundStyle(.secondary)
            }

            if !store.rounds.isEmpty {
                DisclosureGroup("Rounds") {
                    ForEach(store.rounds) { round in
                        LabeledContent("Round \(round.roundNumber)", value: "Game \(round.gameId)")
                    }
                }
            }
        }
    }

    private var gameProgressSection: some View {
        Section("Game Progress") {
            if let gameState = store.gameState, gameState.isGameActive || !gameState.teams.isEmpty {
                ForEach(gameState.teams) { progress in
                    DisclosureGroup {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(progress.puzzle.title)
                                .font(.subheadline.weight(.semibold))
                            ForEach(Array(progress.puzzle.ladder.enumerated()), id: \.offset) { index, step in
                                HStack(alignment: .top) {
                                    Text("\(index + 1).")
                                        .foregroundStyle(.secondary)
                                    VStack(alignment: .leading) {
                                        Text(step.word)
                                            .font(.system(.body, design: .monospaced).weight(.semibold))
                                        if let clue = step.clue, !clue.isEmpty {
                                            Text(clue).font(.caption).foregroundStyle(.secondary)
                                        }
                                        if let transform = step.transform, !transform.isEmpty {
                                            Text(transform).font(.caption2).foregroundStyle(.tertiary)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 6)
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(progress.teamName)
                                    .font(.headline)
                                Text("\(progress.revealedSteps.count)/\(progress.puzzle.ladder.count) revealed")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if progress.isCompleted {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                }
            } else {
                Text("No active game")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var gameControlsSection: some View {
        Section("Game Controls") {
            Picker("Difficulty", selection: $difficulty) {
                Text("Easy").tag("easy")
                Text("Medium").tag("medium")
                Text("Hard").tag("hard")
            }

            Picker("Puzzle Mode", selection: $puzzleMode) {
                Text("Same puzzle").tag("same")
                Text("Different puzzles").tag("different")
            }

            Picker("Word Count", selection: $wordCountMode) {
                Text("Balanced").tag("balanced")
                Text("Exact").tag("exact")
            }

            Picker("Puzzle Date", selection: $selectedPuzzleDate) {
                Text("Random").tag("")
                ForEach(store.puzzleDates, id: \.self) { date in
                    Text(date).tag(date)
                }
            }

            Toggle("Force start if players are not ready", isOn: $forceStart)

            Button(activeGame ? "Game Already Active" : "Start Game") {
                Task {
                    await store.startGame(
                        difficulty: difficulty,
                        puzzleMode: puzzleMode,
                        wordCountMode: wordCountMode,
                        puzzleDate: selectedPuzzleDate.isEmpty ? nil : selectedPuzzleDate,
                        force: forceStart
                    )
                }
            }
            .disabled(activeGame || teams.count < 2)

            Button("End Current Game", role: .destructive) {
                Task { await store.endGame() }
            }
            .disabled(!activeGame)

            Stepper("Timer Minutes: \(timerMinutes)", value: $timerMinutes, in: 0...60)
            Stepper("Timer Seconds: \(timerSeconds)", value: $timerSeconds, in: 0...59)
            Button("Start Timer") {
                Task { await store.startTimer(minutes: timerMinutes, seconds: timerSeconds) }
            }
            .disabled(!activeGame || (timerMinutes == 0 && timerSeconds == 0) || store.timerState?.isActive == true)

            if let timer = store.timerState, timer.isActive, let expires = timer.expiresAt {
                LabeledContent("Timer Expires", value: expires.formattedDate)
            }
        }
    }

    private var teamManagementSection: some View {
        Section("Teams") {
            if teams.isEmpty {
                Stepper("Teams: \(teamCount)", value: $teamCount, in: 2...10)
                Button("Create Teams") {
                    Task { await store.createTeams(count: teamCount) }
                }
                .disabled(players.isEmpty)
            } else {
                Button("Add Team") {
                    Task { await store.addTeam() }
                }
                .disabled(activeGame || teams.count >= 10)

                ForEach(teams) { team in
                    TeamAdminRow(store: store, team: team, players: players.filter { $0.teamId == team.id }, allTeams: teams, activeGame: activeGame)
                }
            }
        }
    }

    private var playersSection: some View {
        Section("Players") {
            if players.isEmpty {
                Text("No players joined yet")
                    .foregroundStyle(.secondary)
            }

            if !unassignedPlayers.isEmpty {
                DisclosureGroup("Unassigned") {
                    ForEach(unassignedPlayers) { player in
                        PlayerAdminRow(store: store, player: player, allTeams: teams)
                    }
                }
            }

            ForEach(players.filter { $0.teamId != nil }) { player in
                PlayerAdminRow(store: store, player: player, allTeams: teams)
            }
        }
    }
}

private struct TeamAdminRow: View {
    @ObservedObject var store: AdminStore
    let team: Team
    let players: [Player]
    let allTeams: [Team]
    let activeGame: Bool

    @State private var name: String = ""

    var body: some View {
        DisclosureGroup {
            TextField("Team name", text: $name)
                .onAppear { name = team.name }
            Button("Save Name") {
                Task { await store.renameTeam(team, name: name) }
            }
            .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            Button("Remove Team", role: .destructive) {
                Task { await store.removeTeam(team) }
            }
            .disabled(activeGame || allTeams.count <= 2)

            if players.isEmpty {
                Text("No players on this team")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(players) { player in
                    PlayerAdminRow(store: store, player: player, allTeams: allTeams)
                }
            }
        } label: {
            VStack(alignment: .leading) {
                Text(team.name)
                    .font(.headline)
                Text("\(players.count) players · \(team.totalPoints ?? 0) pts")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct PlayerAdminRow: View {
    @ObservedObject var store: AdminStore
    let player: Player
    let allTeams: [Team]

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(player.name)
                Text(player.isReady ? "Ready" : "Not ready")
                    .font(.caption)
                    .foregroundStyle(player.isReady ? .green : .orange)
            }
            Spacer()
            Menu("Move") {
                Button("Unassigned") {
                    Task { await store.movePlayer(player, to: 0) }
                }
                ForEach(allTeams) { team in
                    Button(team.name) {
                        Task { await store.movePlayer(player, to: team.id) }
                    }
                }
            }
            Button(role: .destructive) {
                Task { await store.kickPlayer(player) }
            } label: {
                Image(systemName: "person.crop.circle.badge.minus")
            }
        }
    }
}
