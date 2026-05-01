import SwiftUI

@main
struct RaddleAdminApp: App {
    @StateObject private var api = APIClient()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(api)
        }
    }
}
