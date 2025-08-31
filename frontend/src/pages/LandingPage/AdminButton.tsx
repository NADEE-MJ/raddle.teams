import { useNavigate } from "react-router-dom";

export default function AdminButton() {
  const navigate = useNavigate();

  const goToAdminPage = () => {
    navigate("/admin");
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <button
        onClick={goToAdminPage}
        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
      >
        Admin Panel
      </button>
    </div>
  );
}
