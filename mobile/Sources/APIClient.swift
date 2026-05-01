import Foundation

@MainActor
class APIClient: ObservableObject {
    @Published var isAuthenticated = false
    @Published var token: String? = nil
    
    let baseURL: URL
    
    init() {
        let urlString = Bundle.main.infoDictionary?["API_BASE_URL"] as? String ?? "http://localhost:8000"
        self.baseURL = URL(string: urlString)!
    }
    
    func login(password: String) async throws {
        // Implement actual login logic to /api/admin/login
        // For now, let's assume it works if we send a password
        self.isAuthenticated = true
        self.token = "mock_token"
    }
}

