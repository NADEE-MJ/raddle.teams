import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import {
  AdminLayout,
  GameLayout,
  GlobalLayout,
  LandingLayout,
  LobbyLayout,
} from "@/layouts";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LobbyPage = lazy(() => import("@/pages/LobbyPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const GamePage = lazy(() => import("@/pages/GamePage"));

const NotFound: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
      <p className="text-gray-600 mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a
        href="/"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
      >
        Back to Home
      </a>
    </div>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

const withSuspense = (element: React.ReactElement) => (
  <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <GlobalLayout />,
    children: [
      {
        path: "",
        element: <LandingLayout />,
        children: [{ index: true, element: withSuspense(<LandingPage />) }],
      },
      {
        path: "lobby",
        element: <LobbyLayout />,
        children: [
          {
            index: true,
            element: (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Invalid Lobby Access
                  </h1>
                  <p className="text-gray-600 mb-6">
                    Please use a valid lobby link or join from the home page.
                  </p>
                  <a
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    Back to Home
                  </a>
                </div>
              </div>
            ),
          },
          { path: ":lobbyCode", element: withSuspense(<LobbyPage />) },
        ],
      },
      {
        path: "admin",
        element: <AdminLayout />,
        children: [{ index: true, element: withSuspense(<AdminPage />) }],
      },
      {
        path: "game",
        element: <GameLayout />,
        children: [
          {
            index: true,
            element: (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Invalid Game Access
                  </h1>
                  <p className="text-gray-600 mb-6">
                    Please use a valid game link or join from the home page.
                  </p>
                  <a
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    Back to Home
                  </a>
                </div>
              </div>
            ),
          },
          { path: ":gameId", element: withSuspense(<GamePage />) },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
