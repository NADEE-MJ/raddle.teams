import SwiftUI

struct LoginView: View {
    @ObservedObject var store: AdminStore
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "ladder")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(.orange)

                VStack(spacing: 8) {
                    Text("Raddle Admin")
                        .font(.largeTitle.bold())
                    Text("Enter the same admin token used on the website.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 14) {
                    SecureField("Admin Token", text: $store.token)
                        .textContentType(.password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focused)
                        .submitLabel(.go)
                        .onSubmit { Task { await store.login() } }
                        .padding(14)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 14))

                    Button {
                        Task { await store.login() }
                    } label: {
                        if store.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Login")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(store.token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isLoading)
                }

                if let error = store.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Spacer()
            }
            .padding(24)
            .navigationTitle("Admin Login")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { focused = true }
        }
    }
}
