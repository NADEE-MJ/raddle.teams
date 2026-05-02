import SwiftUI
import UniformTypeIdentifiers

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
            ZStack {
                RaddleBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        if let error = store.errorMessage {
                            ErrorBanner(message: error)
                        }

                        if let lobbyInfo {
                            header(lobbyInfo)
                            ActiveGameDashboard(store: store)
                            standingsSection
                            gameControlsSection
                            teamBoardSection
                            playerRosterSection
                            destructiveSection
                        } else {
                            RaddleCard {
                                ProgressView("Loading lobby")
                                    .frame(maxWidth: .infinity)
                            }
                        }
                    }
                    .padding(18)
                }
                .refreshable { await store.refreshSelectedLobby() }
            }
            .navigationTitle(lobbyInfo?.lobby.name ?? "Lobby")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    SocketStatusPill(isConnected: store.socketConnected)
                    Button { Task { await store.refreshSelectedLobby() } } label: { Image(systemName: "arrow.clockwise") }
                }
            }
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

    private func header(_ lobbyInfo: LobbyInfo) -> some View {
        RaddleCard {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(lobbyInfo.lobby.name)
                            .font(.system(.title, design: .rounded).weight(.black))
                        Text("Created \(lobbyInfo.lobby.createdAt.formattedDate)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(lobbyInfo.lobby.code)
                        .font(.system(.headline, design: .monospaced).weight(.black))
                        .foregroundStyle(.orange)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.orange.opacity(0.14), in: Capsule())
                }

                HStack(spacing: 10) {
                    MiniMetric(title: "Players", value: "\(players.count)", color: .blue)
                    MiniMetric(title: "Teams", value: "\(teams.count)", color: .orange)
                    MiniMetric(title: "Ready", value: "\(players.filter(\.isReady).count)", color: .green)
                }
            }
        }
    }

    private var standingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle("Tournament", icon: "trophy.fill")
            if let leaderboard = store.leaderboard, !leaderboard.teams.isEmpty {
                VStack(spacing: 10) {
                    ForEach(Array(leaderboard.teams.enumerated()), id: \.element.id) { index, team in
                        LeaderboardCard(rank: index + 1, team: team)
                    }
                }
            } else {
                EmptyStateCard(title: "No rounds completed", icon: "flag.checkered")
            }
        }
    }

    private var gameControlsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle("Game Controls", icon: "gamecontroller.fill")
            RaddleCard {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("Difficulty", selection: $difficulty) {
                        Text("Easy").tag("easy")
                        Text("Medium").tag("medium")
                        Text("Hard").tag("hard")
                    }
                    .pickerStyle(.segmented)

                    Picker("Puzzle Mode", selection: $puzzleMode) {
                        Text("Same").tag("same")
                        Text("Different").tag("different")
                    }
                    .pickerStyle(.segmented)

                    Picker("Word Count", selection: $wordCountMode) {
                        Text("Balanced").tag("balanced")
                        Text("Exact").tag("exact")
                    }
                    .pickerStyle(.segmented)

                    Picker("Puzzle Date", selection: $selectedPuzzleDate) {
                        Text("Random").tag("")
                        ForEach(store.puzzleDates, id: \.self) { date in
                            Text(date).tag(date)
                        }
                    }

                    Toggle("Force start if players are not ready", isOn: $forceStart)

                    HStack {
                        Button(activeGame ? "Game Active" : "Start Game") {
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
                        .buttonStyle(.borderedProminent)
                        .disabled(activeGame || teams.count < 2)

                        Button("End Game", role: .destructive) {
                            Task { await store.endGame() }
                        }
                        .buttonStyle(.bordered)
                        .disabled(!activeGame)
                    }

                    Divider()

                    HStack {
                        Stepper("\(timerMinutes)m", value: $timerMinutes, in: 0...60)
                        Stepper("\(timerSeconds)s", value: $timerSeconds, in: 0...59)
                    }
                    Button("Start Timer") {
                        Task { await store.startTimer(minutes: timerMinutes, seconds: timerSeconds) }
                    }
                    .buttonStyle(.bordered)
                    .disabled(!activeGame || (timerMinutes == 0 && timerSeconds == 0) || store.timerState?.isActive == true)
                }
            }
        }
    }

    private var teamBoardSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionTitle("Team Board", icon: "person.3.sequence.fill")
                Spacer()
                Text("Drag players between teams")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            if teams.isEmpty {
                RaddleCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Stepper("Teams: \(teamCount)", value: $teamCount, in: 2...10)
                        Button("Create Teams") { Task { await store.createTeams(count: teamCount) } }
                            .buttonStyle(.borderedProminent)
                            .disabled(players.isEmpty)
                    }
                }
            } else {
                Button { Task { await store.addTeam() } } label: {
                    Label("Add Team", systemImage: "plus.circle.fill")
                }
                .buttonStyle(.bordered)
                .disabled(activeGame || teams.count >= 10)

                DropTeamCard(store: store, title: "Unassigned", subtitle: "Drop players here to remove team assignment", team: nil, players: unassignedPlayers, allPlayers: players, allTeams: teams, activeGame: activeGame)

                ForEach(teams) { team in
                    DropTeamCard(store: store, title: team.name, subtitle: "\(players.filter { $0.teamId == team.id }.count) players · \(team.totalPoints ?? 0) pts", team: team, players: players.filter { $0.teamId == team.id }, allPlayers: players, allTeams: teams, activeGame: activeGame)
                }
            }
        }
    }

    private var playerRosterSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle("Roster", icon: "list.bullet.rectangle.fill")
            if players.isEmpty {
                EmptyStateCard(title: "Waiting for players", icon: "person.crop.circle.badge.plus")
            } else {
                RaddleCard {
                    VStack(spacing: 10) {
                        ForEach(players) { player in
                            PlayerChip(store: store, player: player, allTeams: teams, compact: false)
                        }
                    }
                }
            }
        }
    }

    private var destructiveSection: some View {
        RaddleCard {
            Button("Delete Lobby", role: .destructive) { deleteConfirmation = true }
                .frame(maxWidth: .infinity)
        }
    }
}

private struct ActiveGameDashboard: View {
    @ObservedObject var store: AdminStore

    private var activeTeams: [TeamGameProgress] { store.gameState?.teams ?? [] }
    private var completedCount: Int { activeTeams.filter(\.isCompleted).count }
    private var totalSteps: Int { activeTeams.reduce(0) { $0 + $1.puzzle.ladder.count } }
    private var revealedSteps: Int { activeTeams.reduce(0) { $0 + $1.revealedSteps.count } }
    private var progress: Double { totalSteps == 0 ? 0 : Double(revealedSteps) / Double(totalSteps) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle("Live Game", icon: "bolt.fill")
            RaddleCard {
                if activeTeams.isEmpty {
                    Text("No active game. Configure options below and start when teams are ready.")
                        .foregroundStyle(.secondary)
                } else {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            MiniMetric(title: "Complete", value: "\(completedCount)/\(activeTeams.count)", color: .green)
                            MiniMetric(title: "Progress", value: "\(Int(progress * 100))%", color: .orange)
                            if let timer = store.timerState, timer.isActive {
                                MiniMetric(title: "Timer", value: timer.expiresAt?.formattedDate.components(separatedBy: ",").last?.trimmingCharacters(in: .whitespaces) ?? "Live", color: .red)
                            }
                        }
                        ProgressView(value: progress)
                            .tint(.orange)

                        ForEach(activeTeams) { team in
                            TeamProgressCard(progress: team)
                        }
                    }
                }
            }
        }
    }
}

private struct TeamProgressCard: View {
    let progress: TeamGameProgress

    private var fraction: Double {
        guard !progress.puzzle.ladder.isEmpty else { return 0 }
        return Double(progress.revealedSteps.count) / Double(progress.puzzle.ladder.count)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading) {
                    Text(progress.teamName)
                        .font(.headline)
                    Text(progress.puzzle.title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if progress.isCompleted {
                    Label("Done", systemImage: "checkmark.circle.fill")
                        .font(.caption.bold())
                        .foregroundStyle(.green)
                }
            }
            ProgressView(value: fraction)
                .tint(progress.isCompleted ? .green : .orange)
            Text("\(progress.revealedSteps.count) of \(progress.puzzle.ladder.count) ladder steps revealed")
                .font(.caption)
                .foregroundStyle(.secondary)

            DisclosureGroup("Puzzle Ladder") {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(progress.puzzle.ladder.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .top) {
                            Text("\(index + 1)")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.word)
                                    .font(.system(.body, design: .monospaced).weight(.bold))
                                if let clue = step.clue, !clue.isEmpty {
                                    Text(clue).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
                .padding(.top, 6)
            }
        }
        .padding(12)
        .background(.black.opacity(0.045), in: RoundedRectangle(cornerRadius: 18))
    }
}

private struct DropTeamCard: View {
    @ObservedObject var store: AdminStore
    let title: String
    let subtitle: String
    let team: Team?
    let players: [Player]
    let allPlayers: [Player]
    let allTeams: [Team]
    let activeGame: Bool

    @State private var isTargeted = false
    @State private var editedName = ""

    var body: some View {
        RaddleCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title).font(.headline)
                        Text(subtitle).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: isTargeted ? "arrow.down.circle.fill" : "hand.draw.fill")
                        .foregroundStyle(isTargeted ? .green : .secondary)
                }

                if let team {
                    HStack {
                        TextField("Team name", text: $editedName)
                            .onAppear { editedName = team.name }
                            .textFieldStyle(.roundedBorder)
                        Button("Save") { Task { await store.renameTeam(team, name: editedName) } }
                            .disabled(editedName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }

                if players.isEmpty {
                    Text("Drop players here")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(.black.opacity(0.04), in: RoundedRectangle(cornerRadius: 16))
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 142), spacing: 10)], spacing: 10) {
                        ForEach(players) { player in
                            PlayerChip(store: store, player: player, allTeams: allTeams, compact: true)
                        }
                    }
                }

                if let team {
                    Button("Remove Team", role: .destructive) { Task { await store.removeTeam(team) } }
                        .font(.caption.bold())
                        .disabled(activeGame || allTeams.count <= 2)
                }
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 24)
                .stroke(isTargeted ? .green : .clear, lineWidth: 2)
        }
        .onDrop(of: [UTType.text], isTargeted: $isTargeted) { providers in
            guard let provider = providers.first else { return false }
            provider.loadObject(ofClass: NSString.self) { value, _ in
                guard let raw = value as? String, let playerId = Int(raw), let player = allPlayers.first(where: { $0.id == playerId }) else {
                    return
                }
                let targetTeamId = team?.id ?? 0
                Task { @MainActor in
                    await store.movePlayer(player, to: targetTeamId)
                }
            }
            return true
        }
    }
}

private struct PlayerChip: View {
    @ObservedObject var store: AdminStore
    let player: Player
    let allTeams: [Team]
    let compact: Bool

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(player.isReady ? .green : .orange)
                .frame(width: 9, height: 9)
            VStack(alignment: .leading, spacing: 2) {
                Text(player.name)
                    .font(compact ? .caption.weight(.bold) : .body.weight(.semibold))
                    .lineLimit(1)
                Text(player.isReady ? "Ready" : "Not ready")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            Menu {
                Button("Unassigned") { Task { await store.movePlayer(player, to: 0) } }
                ForEach(allTeams) { team in
                    Button(team.name) { Task { await store.movePlayer(player, to: team.id) } }
                }
                Divider()
                Button("Kick", role: .destructive) { Task { await store.kickPlayer(player) } }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
        .padding(10)
        .background(.black.opacity(0.05), in: RoundedRectangle(cornerRadius: 16))
        .onDrag {
            NSItemProvider(object: String(player.id) as NSString)
        }
    }
}

private struct LeaderboardCard: View {
    let rank: Int
    let team: LeaderboardTeam

    var body: some View {
        HStack(spacing: 12) {
            Text("#\(rank)")
                .font(.headline.bold())
                .foregroundStyle(rank == 1 ? .orange : .secondary)
                .frame(width: 42, height: 42)
                .background((rank == 1 ? Color.orange : Color.secondary).opacity(0.13), in: Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(team.teamName).font(.headline)
                Text("\(team.roundsWon) wins · \(team.roundsPlayed) rounds")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(team.totalPoints)")
                .font(.title3.bold())
            Text("pts")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.black.opacity(0.04), in: RoundedRectangle(cornerRadius: 18))
    }
}

private struct MiniMetric: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(.headline.bold()).foregroundStyle(color)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(color.opacity(0.10), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct SectionTitle: View {
    let title: String
    let icon: String

    init(_ title: String, icon: String) {
        self.title = title
        self.icon = icon
    }

    var body: some View {
        Label(title, systemImage: icon)
            .font(.title3.bold())
    }
}

private struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text(message).font(.footnote.weight(.medium))
        }
        .foregroundStyle(.red)
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.red.opacity(0.10), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct EmptyStateCard: View {
    let title: String
    let icon: String

    var body: some View {
        RaddleCard {
            VStack(spacing: 10) {
                Image(systemName: icon).font(.title).foregroundStyle(.secondary)
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
