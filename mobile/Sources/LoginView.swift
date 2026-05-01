import SwiftUI

struct LoginView: View {
    @EnvironmentObject var api: APIClient
    @State private var password = ""
    
    var body: some View {
        VStack {
            Text("Raddle Admin")
                .font(.largeTitle)
                .padding()
            
            SecureField("Admin Password", text: $password)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding()
            
            Button("Login") {
                Task {
                    try? await api.login(password: password)
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
