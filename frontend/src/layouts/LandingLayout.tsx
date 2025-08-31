import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

const LandingLayout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const sessionId = localStorage.getItem("raddle_session_id");
    if (sessionId) {
      navigate("/lobby");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <Outlet />
    </div>
  );
};

export default LandingLayout;
