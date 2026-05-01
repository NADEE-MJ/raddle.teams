import SwiftUI

struct ContentView: View {
    @EnvironmentObject var api: APIClient
    
    var body: some View {
        if api.isAuthenticated {
            TabView {
                NavigationView {
                    DashboardView()
                }
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar")
                }
                
                NavigationView {
                    PuzzlesView()
                }
                .tabItem {
                    Label("Puzzles", systemImage: "puzzlepiece")
                }
                
                NavigationView {
                    TeamsView()
                }
                .tabItem {
                    Label("Teams", systemImage: "person.3")
                }
            }
        } else {
            LoginView()
        }
    }
}
