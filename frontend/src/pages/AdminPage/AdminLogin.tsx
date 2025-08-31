import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AdminLoginProps {
  onLogin: (token: string) => Promise<void>;
  loading: boolean;
  error: string;
}

export default function AdminLogin({ onLogin, loading, error }: AdminLoginProps) {
  const [localAdminToken, setLocalAdminToken] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localAdminToken.trim()) return;
    await onLogin(localAdminToken.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Login
            </h1>
            <p className="text-gray-600">
              Enter your admin token to access the admin panel
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="adminToken"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin Token
              </label>
              <input
                type="password"
                id="adminToken"
                value={localAdminToken}
                onChange={(e) => setLocalAdminToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin token"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
