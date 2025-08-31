import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export default function DashboardHeader({ onLogout }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Admin Dashboard
      </h1>
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          Home
        </button>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
