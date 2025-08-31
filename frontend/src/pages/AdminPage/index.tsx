import { useState, useEffect, useCallback, useRef } from "react";
import { useAdminOutletContext } from "@/hooks/useAdminOutletContext";
import { api } from "@/services/api";
import { LobbyInfo } from "@/types";

import AdminLogin from "./AdminLogin";
import DashboardHeader from "./DashboardHeader";
import CreateLobbyForm from "./CreateLobbyForm";
import LobbiesList from "./LobbiesList";
import LobbyDetails from "./LobbyDetails";

export default function AdminPage() {
  const {
    isAdmin,
    adminToken,
    setAdminToken,
    lobbies,
    refreshLobbies,
    isLoading: contextLoading,
    error: contextError,
    sendWebSocketMessage,
    onLobbyUpdate,
    offLobbyUpdate,
  } = useAdminOutletContext();

  const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedLobbyRef = useRef<LobbyInfo | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedLobbyRef.current = selectedLobby;
  }, [selectedLobby]);

  const handleLogin = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      await api.admin.checkCredentials(token);
      setAdminToken(token);
    } catch (err) {
      setError("Invalid admin token");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setSelectedLobby(null);
  };

  const createLobby = async (name: string) => {
    if (!adminToken) return;

    try {
      setLoading(true);
      await api.admin.lobby.create(name, adminToken);
      await refreshLobbies();
    } catch (err) {
      setError("Failed to create lobby");
      console.error("Error creating lobby:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLobbyUpdate = useCallback(
    (lobbyId: number) => {
      // Use current state instead of closure to avoid dependency issues
      setSelectedLobby((current) => {
        if (current && current.lobby.id === lobbyId && adminToken) {
          // Refresh the selected lobby
          api.admin.lobby
            .getInfo(current.lobby.id, adminToken)
            .then((lobbyInfo) => {
              setSelectedLobby(lobbyInfo);
            })
            .catch((err) => {
              console.error("Error refreshing selected lobby:", err);
            });
        }
        return current;
      });
    },
    [adminToken],
  );

  const viewLobbyDetails = async (lobbyId: number) => {
    if (!adminToken) return;

    try {
      setLoading(true);
      const lobbyInfo = await api.admin.lobby.getInfo(lobbyId, adminToken);
      setSelectedLobby(lobbyInfo);

      // Subscribe to lobby updates via WebSocket
      if (sendWebSocketMessage) {
        sendWebSocketMessage({
          action: "subscribe_lobby",
          lobby_id: lobbyId,
        });
      }
    } catch (err) {
      setError("Failed to load lobby details");
      console.error("Error loading lobby details:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeLobbyDetails = () => {
    if (selectedLobby && sendWebSocketMessage) {
      // Unsubscribe from lobby updates
      sendWebSocketMessage({
        action: "unsubscribe_lobby",
        lobby_id: selectedLobby.lobby.id,
      });
    }
    setSelectedLobby(null);
  };

  const deleteLobby = async (lobbyId: number) => {
    if (!adminToken) return;

    try {
      setLoading(true);
      await api.admin.lobby.delete(lobbyId, adminToken);
      await refreshLobbies();
      if (selectedLobby?.lobby.id === lobbyId) {
        // Unsubscribe before closing
        if (sendWebSocketMessage) {
          sendWebSocketMessage({
            action: "unsubscribe_lobby",
            lobby_id: lobbyId,
          });
        }
        setSelectedLobby(null);
      }
    } catch (err) {
      setError("Failed to delete lobby");
      console.error("Error deleting lobby:", err);
    } finally {
      setLoading(false);
    }
  };

  // Register/unregister lobby update callback
  useEffect(() => {
    if (onLobbyUpdate && offLobbyUpdate) {
      onLobbyUpdate(handleLobbyUpdate);
      return () => {
        offLobbyUpdate(handleLobbyUpdate);
      };
    }
  }, [handleLobbyUpdate, onLobbyUpdate, offLobbyUpdate]);

  // Cleanup subscription on component unmount
  useEffect(() => {
    return () => {
      // Use ref to get current value at cleanup time
      if (selectedLobbyRef.current && sendWebSocketMessage) {
        sendWebSocketMessage({
          action: "unsubscribe_lobby",
          lobby_id: selectedLobbyRef.current.lobby.id,
        });
      }
    };
  }, [sendWebSocketMessage]);

  if (!isAdmin) {
    return (
      <AdminLogin 
        onLogin={handleLogin}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <DashboardHeader onLogout={handleLogout} />

          {(error || contextError) && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error || contextError}
            </div>
          )}

          <CreateLobbyForm 
            onCreateLobby={createLobby}
            loading={loading}
            contextLoading={contextLoading}
          />

          <LobbiesList 
            lobbies={lobbies}
            onRefresh={refreshLobbies}
            onViewDetails={viewLobbyDetails}
            onDeleteLobby={deleteLobby}
            loading={loading}
            contextLoading={contextLoading}
          />
        </div>

        {selectedLobby && (
          <LobbyDetails 
            selectedLobby={selectedLobby}
            onClose={closeLobbyDetails}
          />
        )}
      </div>
    </div>
  );
}
