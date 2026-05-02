import SwiftUI

struct LoginView: View {
    @ObservedObject var store: AdminStore
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                RaddleBackground()

                VStack(spacing: 26) {
                    Spacer()

                    ZStack {
                        RoundedRectangle(cornerRadius: 34, style: .continuous)
                            .fill(.orange.gradient)
                            .frame(width: 104, height: 104)
                            .shadow(color: .orange.opacity(0.35), radius: 24, y: 12)
                        Image(systemName: "ladder")
                            .font(.system(size: 48, weight: .black))
                            .foregroundStyle(.white)
                    }

                    VStack(spacing: 8) {
                        Text("Raddle Admin")
                            .font(.system(.largeTitle, design: .rounded).weight(.black))
                        Text("Native controls for the same admin API and live socket used by the web dashboard.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    RaddleCard {
                        VStack(spacing: 16) {
                            SecureField("Admin Token", text: $store.token)
                                .textContentType(.password)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .focused($focused)
                                .submitLabel(.go)
                                .onSubmit { Task { await store.login() } }
                                .padding(14)
                                .background(.black.opacity(0.05), in: RoundedRectangle(cornerRadius: 14))

                            Button {
                                Task { await store.login() }
                            } label: {
                                if store.isLoading {
                                    ProgressView().frame(maxWidth: .infinity)
                                } else {
                                    Label("Login", systemImage: "arrow.right.circle.fill")
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                            .disabled(store.token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isLoading)
                        }
                    }

                    if let error = store.errorMessage {
                        Text(error)
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }

                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle("Admin Login")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { focused = true }
        }
    }
}
