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

    var body: some View {
        NavigationStack {
            List {
                if let error = store.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }

                Section("Create Lobby") {
                    TextField("Lobby name", text: $lobbyName)
                    HStack {
                        Button("Random Name") {
                            Task { lobbyName = await store.generateLobbyName() }
                        }
                        Spacer()
                        Button("Create") {
                            let name = lobbyName.trimmingCharacters(in: .whitespacesAndNewlines)
                            Task {
                                await store.createLobby(name: name)
                                lobbyName = ""
                            }
                        }
                        .disabled(lobbyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }

                Section("All Lobbies") {
                    if store.lobbies.isEmpty {
                        Text("No lobbies created yet")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(store.lobbies) { lobby in
                            Button {
                                selectedLobby = lobby
                                Task { await store.selectLobby(lobby) }
                            } label: {
                                LobbyRow(lobby: lobby)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .navigationTitle("Raddle Admin")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Label(store.socketConnected ? "Connected" : "Disconnected", systemImage: store.socketConnected ? "bolt.horizontal.fill" : "bolt.horizontal")
                        .foregroundStyle(store.socketConnected ? .green : .orange)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        Task { await store.refreshLobbies() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    Button("Logout") { store.logout() }
                }
            }
            .refreshable { await store.refreshLobbies() }
            .task { await store.refreshLobbies() }
            .sheet(item: $selectedLobby, onDismiss: store.closeSelectedLobby) { _ in
                LobbyDetailView(store: store)
            }
            .overlay {
                if store.isLoading {
                    ProgressView()
                        .padding(18)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }
}

private struct LobbyRow: View {
    let lobby: Lobby

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(lobby.name)
                    .font(.headline)
                Spacer()
                Text(lobby.code)
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.orange.opacity(0.18), in: Capsule())
            }
            Text("Created \(lobby.createdAt.formattedDate)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
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
