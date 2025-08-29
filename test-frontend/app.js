// Test Frontend for Raddle Teams Lobby API
class TestFrontend {
  constructor() {
    this.currentView = "home";
    this.isAdminAuthenticated = localStorage.getItem("admin_authenticated") === "true";
    this.adminPassword = localStorage.getItem("admin_password") || "";
    this.webSessionId = this.getOrCreateSessionId("admin_session_id");
    this.playerSessionId = this.getOrCreateSessionId("player_session_id");
    this.adminWebsocket = null;
    this.playerWebsocket = null;
    this.lobbies = [];
    this.currentLobby = null;
    this.currentPlayer = null;

    this.init();
  }

  getOrCreateSessionId(key) {
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = this.generateUUID();
      localStorage.setItem(key, sessionId);
    }
    return sessionId;
  }

  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  init() {
    // If already authenticated as admin, connect to WebSocket and load lobbies
    if (this.isAdminAuthenticated && this.adminPassword) {
      this.connectAdminWebSocket();
      this.loadLobbies();
      this.currentView = "admin";
    }
    this.render();
  }

  async apiCall(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    // If adminAuth is true and we have a password, add Authorization header
    if (options.adminAuth && this.adminPassword) {
      defaultHeaders["Authorization"] = `Bearer ${this.adminPassword}`;
    }

    // Merge headers, allowing options.headers to override defaults
    const headers = { ...defaultHeaders, ...options.headers };

    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Admin Methods
  async adminLogin(password) {
    try {
      // Set the password for testing authentication
      this.adminPassword = password;

      // Test authentication by trying to get lobbies
      await this.apiCall("/lobby", { adminAuth: true });

      // If successful, save the authentication
      this.isAdminAuthenticated = true;
      localStorage.setItem("admin_authenticated", "true");
      localStorage.setItem("admin_password", password);

      console.log("Admin login successful, connecting WebSocket...");
      this.connectAdminWebSocket();
      this.currentView = "admin";
      await this.loadLobbies();
      this.render();
      return true;
    } catch (error) {
      // Clear password on failure
      this.adminPassword = "";
      console.error("Authentication failed:", error);
      return false;
    }
  }

  adminLogout() {
    this.isAdminAuthenticated = false;
    this.adminPassword = "";
    localStorage.removeItem("admin_authenticated");
    localStorage.removeItem("admin_password");

    if (this.adminWebsocket) {
      this.adminWebsocket.close();
      this.adminWebsocket = null;
    }

    this.currentView = "admin-login";
    this.render();
  }

  connectAdminWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/admin/${this.webSessionId}?token=${encodeURIComponent(this.adminPassword)}`;

    this.adminWebsocket = new WebSocket(wsUrl);

    this.adminWebsocket.onopen = () => {
      console.log("Admin WebSocket connected");
      this.render(); // Update UI to show connected status
    };

    this.adminWebsocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Admin WebSocket message:", data);
      // Reload lobbies on updates
      this.loadLobbies();
    };

    this.adminWebsocket.onclose = (event) => {
      console.log("Admin WebSocket disconnected", event.code, event.reason);
      this.render(); // Update UI to show disconnected status
      // Auto-reconnect if still authenticated and not a auth failure
      if (this.isAdminAuthenticated && event.code !== 4001) {
        setTimeout(() => this.connectAdminWebSocket(), 3000);
      } else if (event.code === 4001) {
        // Authentication failed, logout
        console.log("Admin WebSocket authentication failed, logging out");
        this.adminLogout();
      }
    };

    this.adminWebsocket.onerror = (error) => {
      console.error("Admin WebSocket error:", error);
      this.render(); // Update UI to show error status
    };
  }

  async loadLobbies() {
    try {
      this.lobbies = await this.apiCall("/lobby", {
        adminAuth: true,
      });
      this.render();
    } catch (error) {
      console.error("Failed to load lobbies:", error);
    }
  }

  async createLobby(name) {
    try {
      await this.apiCall("/lobby", {
        method: "POST",
        body: JSON.stringify({ name }),
        adminAuth: true,
      });
      await this.loadLobbies();
    } catch (error) {
      console.error("Failed to create lobby:", error);
      alert("Failed to create lobby");
    }
  }

  // Player Methods
  async joinLobby(lobbyCode, playerName) {
    try {
      const player = await this.apiCall(`/lobby/${lobbyCode}/join`, {
        method: "POST",
        body: JSON.stringify({
          name: playerName,
          session_id: this.playerSessionId,
        }),
      });

      this.currentPlayer = player;
      console.log("Joined lobby successfully, connecting WebSocket...");
      this.connectPlayerWebSocket(player.lobby_id);
      await this.loadLobbyInfo(player.lobby_id);
      this.currentView = "lobby";
      this.render();
      return true;
    } catch (error) {
      console.error("Failed to join lobby:", error);
      return false;
    }
  }

  connectPlayerWebSocket(lobbyId) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${lobbyId}/${this.playerSessionId}`;

    this.playerWebsocket = new WebSocket(wsUrl);

    this.playerWebsocket.onopen = () => {
      console.log("Player WebSocket connected to lobby", lobbyId);
      this.render(); // Update UI to show connected status
    };

    this.playerWebsocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Player WebSocket message:", data);
      // Handle lobby updates
      if (this.currentPlayer) {
        this.loadLobbyInfo(this.currentPlayer.lobby_id);
      }
    };

    this.playerWebsocket.onclose = (event) => {
      console.log("Player WebSocket disconnected", event.code, event.reason);
      this.render(); // Update UI to show disconnected status
      // Auto-reconnect if in lobby
      if (this.currentPlayer) {
        setTimeout(() => this.connectPlayerWebSocket(this.currentPlayer.lobby_id), 3000);
      }
    };

    this.playerWebsocket.onerror = (error) => {
      console.error("Player WebSocket error:", error);
      this.render(); // Update UI to show error status
    };
  }

  async loadLobbyInfo(lobbyId) {
    try {
      this.currentLobby = await this.apiCall(`/lobby/${lobbyId}`);
      this.render();
    } catch (error) {
      console.error("Failed to load lobby info:", error);
    }
  }

  leaveLobby() {
    this.currentPlayer = null;
    this.currentLobby = null;

    if (this.playerWebsocket) {
      this.playerWebsocket.close();
      this.playerWebsocket = null;
    }

    this.currentView = "home";
    this.render();
  }

  // Helper methods for WebSocket status
  getWebSocketStatusColor() {
    if (!this.adminWebsocket) return "text-gray-500";
    switch (this.adminWebsocket.readyState) {
      case WebSocket.CONNECTING:
        return "text-yellow-600";
      case WebSocket.OPEN:
        return "text-green-600";
      case WebSocket.CLOSING:
        return "text-orange-600";
      case WebSocket.CLOSED:
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  }

  getWebSocketStatusText() {
    if (!this.adminWebsocket) return "Not connected";
    switch (this.adminWebsocket.readyState) {
      case WebSocket.CONNECTING:
        return "Connecting...";
      case WebSocket.OPEN:
        return "Connected";
      case WebSocket.CLOSING:
        return "Closing...";
      case WebSocket.CLOSED:
        return "Disconnected";
      default:
        return "Unknown";
    }
  }

  getWebSocketReadyStateText() {
    if (!this.adminWebsocket) return "N/A";
    switch (this.adminWebsocket.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  }

  // Player WebSocket status helpers
  getPlayerWebSocketStatusColor() {
    if (!this.playerWebsocket) return "text-gray-500";
    switch (this.playerWebsocket.readyState) {
      case WebSocket.CONNECTING:
        return "text-yellow-600";
      case WebSocket.OPEN:
        return "text-green-600";
      case WebSocket.CLOSING:
        return "text-orange-600";
      case WebSocket.CLOSED:
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  }

  getPlayerWebSocketStatusText() {
    if (!this.playerWebsocket) return "Not connected";
    switch (this.playerWebsocket.readyState) {
      case WebSocket.CONNECTING:
        return "Connecting...";
      case WebSocket.OPEN:
        return "Connected";
      case WebSocket.CLOSING:
        return "Closing...";
      case WebSocket.CLOSED:
        return "Disconnected";
      default:
        return "Unknown";
    }
  }

  getPlayerWebSocketDotColor() {
    if (!this.playerWebsocket) return "bg-gray-500";
    switch (this.playerWebsocket.readyState) {
      case WebSocket.CONNECTING:
        return "bg-yellow-500";
      case WebSocket.OPEN:
        return "bg-green-500";
      case WebSocket.CLOSING:
        return "bg-orange-500";
      case WebSocket.CLOSED:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  // Rendering Methods
  render() {
    const app = document.getElementById("app");

    switch (this.currentView) {
      case "home":
        app.innerHTML = this.renderHome();
        break;
      case "admin-login":
        app.innerHTML = this.renderAdminLogin();
        break;
      case "admin":
        app.innerHTML = this.renderAdmin();
        break;
      case "lobby":
        app.innerHTML = this.renderLobby();
        break;
      default:
        app.innerHTML = this.renderHome();
    }

    this.attachEventListeners();
  }

  renderHome() {
    return `
            <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Raddle Teams</h1>
                        <p class="text-gray-600">Test Frontend</p>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <h2 class="text-xl font-semibold mb-4">Join Lobby</h2>
                            <form id="join-lobby-form" class="space-y-4">
                                <input
                                    type="text"
                                    id="player-name"
                                    placeholder="Your name"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <input
                                    type="text"
                                    id="lobby-code"
                                    placeholder="Lobby code"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <button
                                    type="submit"
                                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                                >
                                    Join Lobby
                                </button>
                            </form>
                        </div>

                        <div class="border-t pt-4">
                            <button
                                id="admin-btn"
                                class="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
                            >
                                Admin Panel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  renderAdminLogin() {
    return `
            <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600">
                <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
                        <p class="text-gray-600">Enter admin password</p>
                    </div>

                    <form id="admin-login-form" class="space-y-6">
                        <input
                            type="password"
                            id="admin-password"
                            placeholder="Admin password"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                        <button
                            type="submit"
                            class="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            id="back-btn"
                            class="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                        >
                            Back
                        </button>
                    </form>
                </div>
            </div>
        `;
  }

  renderAdmin() {
    return `
            <div class="min-h-screen bg-gray-100 p-8">
                <div class="max-w-6xl mx-auto">
                    <div class="flex justify-between items-center mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                        <button id="admin-logout-btn" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                            Logout
                        </button>
                    </div>

                    <!-- Create Lobby Section -->
                    <div class="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 class="text-xl font-semibold mb-4">Create New Lobby</h2>
                        <form id="create-lobby-form" class="flex gap-4">
                            <input
                                type="text"
                                id="new-lobby-name"
                                placeholder="Lobby name"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                            <button
                                type="submit"
                                class="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
                            >
                                Create Lobby
                            </button>
                        </form>
                    </div>

                    <!-- Lobbies List -->
                    <div class="bg-white rounded-lg shadow">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h2 class="text-xl font-semibold">Active Lobbies</h2>
                        </div>
                        <div class="divide-y divide-gray-200">
                            ${
                              this.lobbies.length === 0
                                ? '<div class="p-8 text-center text-gray-500">No lobbies found</div>'
                                : this.lobbies
                                    .map(
                                      (lobby) => `
                                    <div class="p-6">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h3 class="text-lg font-medium text-gray-900">${lobby.name}</h3>
                                                <p class="text-sm text-gray-500">
                                                    Code: <span class="font-mono font-bold">${lobby.code}</span>
                                                </p>
                                                <p class="text-sm text-gray-500">
                                                    Created: ${new Date(lobby.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                `
                                    )
                                    .join("")
                            }
                        </div>
                    </div>

                    <!-- Debug/Status Information -->
                    <div class="bg-white rounded-lg shadow mt-8">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h2 class="text-xl font-semibold">Connection Status</h2>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="font-medium">Admin Password:</span>
                                    <span class="text-gray-600">${this.adminPassword ? "••••••••" : "Not set"}</span>
                                </div>
                                <div>
                                    <span class="font-medium">WebSocket:</span>
                                    <span class="${this.getWebSocketStatusColor()}">
                                        ${this.getWebSocketStatusText()}
                                    </span>
                                    ${this.adminWebsocket ? `<span class="text-xs text-gray-400 ml-1">(${this.getWebSocketReadyStateText()})</span>` : ""}
                                </div>
                                <div>
                                    <span class="font-medium">Session ID:</span>
                                    <span class="text-gray-600 font-mono text-xs">${this.webSessionId}</span>
                                </div>
                                <div>
                                    <span class="font-medium">Lobbies Count:</span>
                                    <span class="text-gray-600">${this.lobbies.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  renderLobby() {
    if (!this.currentLobby || !this.currentPlayer) {
      return '<div class="p-8 text-center">Loading lobby...</div>';
    }

    return `
            <div class="min-h-screen bg-gray-100 p-8">
                <div class="max-w-4xl mx-auto">
                    <div class="flex justify-between items-center mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">Lobby: ${this.currentLobby.lobby.name}</h1>
                        <button id="leave-lobby-btn" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                            Leave Lobby
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Lobby Info -->
                        <div class="bg-white rounded-lg shadow p-6">
                            <h2 class="text-xl font-semibold mb-4">Lobby Information</h2>
                            <div class="space-y-2">
                                <p><strong>Code:</strong> <span class="font-mono">${this.currentLobby.lobby.code}</span></p>
                                <p><strong>Your Name:</strong> ${this.currentPlayer.name}</p>
                                <p><strong>Session ID:</strong> <span class="font-mono text-sm">${this.playerSessionId}</span></p>
                            </div>
                        </div>

                        <!-- Players -->
                        <div class="bg-white rounded-lg shadow p-6">
                            <h2 class="text-xl font-semibold mb-4">Players (${this.currentLobby.players.length})</h2>
                            <div class="space-y-2">
                                ${this.currentLobby.players
                                  .map(
                                    (player) => `
                                    <div class="flex justify-between items-center p-2 ${player.id === this.currentPlayer.id ? "bg-blue-50 border-l-4 border-blue-500" : "bg-gray-50"}">
                                        <span>${player.name}</span>
                                        ${player.id === this.currentPlayer.id ? '<span class="text-blue-600 text-sm">(You)</span>' : ""}
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>
                    </div>

                    <!-- WebSocket Status -->
                    <div class="mt-8 bg-white rounded-lg shadow p-6">
                        <h2 class="text-xl font-semibold mb-4">Connection Status</h2>
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full ${this.getPlayerWebSocketDotColor()} mr-2"></div>
                                <span class="${this.getPlayerWebSocketStatusColor()}">WebSocket: ${this.getPlayerWebSocketStatusText()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  attachEventListeners() {
    // Home page events
    const joinLobbyForm = document.getElementById("join-lobby-form");
    if (joinLobbyForm) {
      joinLobbyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const playerName = document.getElementById("player-name").value;
        const lobbyCode = document.getElementById("lobby-code").value;

        const success = await this.joinLobby(lobbyCode, playerName);
        if (!success) {
          alert("Failed to join lobby. Please check the lobby code.");
        }
      });
    }

    const adminBtn = document.getElementById("admin-btn");
    if (adminBtn) {
      adminBtn.addEventListener("click", () => {
        this.currentView = this.isAdminAuthenticated ? "admin" : "admin-login";
        this.render();
      });
    }

    // Admin login events
    const adminLoginForm = document.getElementById("admin-login-form");
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("admin-password").value;

        const success = await this.adminLogin(password);
        if (!success) {
          alert("Invalid password");
        }
      });
    }

    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.currentView = "home";
        this.render();
      });
    }

    // Admin panel events
    const createLobbyForm = document.getElementById("create-lobby-form");
    if (createLobbyForm) {
      createLobbyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const lobbyName = document.getElementById("new-lobby-name").value;
        await this.createLobby(lobbyName);
        document.getElementById("new-lobby-name").value = "";
      });
    }

    const adminLogoutBtn = document.getElementById("admin-logout-btn");
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", () => {
        this.adminLogout();
      });
    }

    // Lobby events
    const leaveLobbyBtn = document.getElementById("leave-lobby-btn");
    if (leaveLobbyBtn) {
      leaveLobbyBtn.addEventListener("click", () => {
        this.leaveLobby();
      });
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new TestFrontend();
});
