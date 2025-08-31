import { useNavigate } from "react-router-dom";

export default function ErrorState() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-red-600 mb-4">Failed to load lobby information</p>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
