import SwiftUI

struct ContentView: View {
    @StateObject private var store = AdminStore()

    var body: some View {
        Group {
            if store.isAuthenticated {
                AdminDashboardView(store: store)
            } else {
                LoginView(store: store)
            }
        }
        .onAppear {
            store.restoreSession()
        }
    }
}

struct AdminDashboardView: View {
    @ObservedObject var store: AdminStore
    @State private var lobbyName = ""
    @State private var selectedLobby: Lobby?

    private var activeLobbyCount: Int { store.lobbies.count }
    private var totalPlayers: Int { store.selectedLobby?.players.count ?? 0 }

    var body: some View {
        NavigationStack {
            ZStack {
                RaddleBackground()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        quickStats
                        createLobbyCard
                        lobbiesSection
                    }
                    .padding(18)
                }
                .refreshable { await store.refreshLobbies() }

                if store.isLoading {
                    ProgressView()
                        .padding(18)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                }
            }
            .navigationTitle("Raddle Admin")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        Task { await store.refreshLobbies() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    Button("Logout") { store.logout() }
                }
            }
            .task { await store.refreshLobbies() }
            .sheet(item: $selectedLobby, onDismiss: store.closeSelectedLobby) { _ in
                LobbyDetailView(store: store)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Admin Control")
                        .font(.system(.largeTitle, design: .rounded).weight(.black))
                    Text("Manage live lobbies, teams, games, and rounds.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                SocketStatusPill(isConnected: store.socketConnected)
            }

            if let error = store.errorMessage {
                HStack(spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Text(error)
                        .font(.footnote.weight(.medium))
                }
                .foregroundStyle(.red)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.red.opacity(0.10), in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private var quickStats: some View {
        HStack(spacing: 12) {
            StatCard(title: "Lobbies", value: "\(activeLobbyCount)", icon: "rectangle.stack.fill", color: .orange)
            StatCard(title: "Players", value: "\(totalPlayers)", icon: "person.3.fill", color: .blue)
        }
    }

    private var createLobbyCard: some View {
        RaddleCard {
            VStack(alignment: .leading, spacing: 14) {
                Label("Create Lobby", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.orange)

                TextField("Lobby name", text: $lobbyName)
                    .textInputAutocapitalization(.words)
                    .padding(14)
                    .background(.black.opacity(0.05), in: RoundedRectangle(cornerRadius: 14))

                HStack {
                    Button {
                        Task { lobbyName = await store.generateLobbyName() }
                    } label: {
                        Label("Random", systemImage: "dice.fill")
                    }
                    .buttonStyle(.bordered)

                    Spacer()

                    Button {
                        let name = lobbyName.trimmingCharacters(in: .whitespacesAndNewlines)
                        Task {
                            await store.createLobby(name: name)
                            lobbyName = ""
                        }
                    } label: {
                        Label("Create", systemImage: "arrow.right.circle.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(lobbyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private var lobbiesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Lobbies")
                    .font(.title2.bold())
                Spacer()
                Text("\(store.lobbies.count)")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(.quaternary, in: Capsule())
            }

            if store.lobbies.isEmpty {
                RaddleCard {
                    VStack(spacing: 10) {
                        Image(systemName: "rectangle.stack.badge.plus")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No lobbies yet")
                            .font(.headline)
                        Text("Create one above to get started.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {
                ForEach(store.lobbies) { lobby in
                    Button {
                        selectedLobby = lobby
                        Task { await store.selectLobby(lobby) }
                    } label: {
                        LobbyCard(lobby: lobby)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct LobbyCard: View {
    let lobby: Lobby

    var body: some View {
        RaddleCard {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.orange.gradient)
                    Image(systemName: "ladder")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                }
                .frame(width: 52, height: 52)

                VStack(alignment: .leading, spacing: 7) {
                    Text(lobby.name)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text("Created \(lobby.createdAt.formattedDate)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text(lobby.code)
                    .font(.system(.subheadline, design: .monospaced).weight(.black))
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(.orange.opacity(0.13), in: Capsule())
            }
        }
    }
}

struct RaddleBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Color.orange.opacity(0.16), Color(.systemBackground), Color.blue.opacity(0.08)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

struct RaddleCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(.white.opacity(0.16), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.07), radius: 18, y: 10)
    }
}

struct SocketStatusPill: View {
    let isConnected: Bool

    var body: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(isConnected ? .green : .red)
                .frame(width: 9, height: 9)
                .shadow(color: isConnected ? .green : .red, radius: 5)
            Text(isConnected ? "Socket Live" : "Socket Offline")
                .font(.caption.weight(.bold))
        }
        .foregroundStyle(isConnected ? .green : .red)
        .padding(.horizontal, 11)
        .padding(.vertical, 8)
        .background((isConnected ? Color.green : Color.red).opacity(0.12), in: Capsule())
        .accessibilityLabel(isConnected ? "WebSocket connected" : "WebSocket disconnected")
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        RaddleCard {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(color)
                Text(value)
                    .font(.system(.largeTitle, design: .rounded).weight(.black))
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

extension String {
    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: self) ?? ISO8601DateFormatter().date(from: self)
        guard let date else { return self }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}
