import { useState } from "react";

interface CreateLobbyFormProps {
  onCreateLobby: (name: string) => Promise<void>;
  loading: boolean;
  contextLoading: boolean;
}

export default function CreateLobbyForm({ 
  onCreateLobby, 
  loading, 
  contextLoading 
}: CreateLobbyFormProps) {
  const [newLobbyName, setNewLobbyName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLobbyName.trim()) return;
    
    await onCreateLobby(newLobbyName.trim());
    setNewLobbyName("");
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Create New Lobby
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          value={newLobbyName}
          onChange={(e) => setNewLobbyName(e.target.value)}
          placeholder="Lobby name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading || contextLoading}
        />
        <button
          type="submit"
          disabled={loading || contextLoading || !newLobbyName.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition duration-200"
        >
          Create Lobby
        </button>
      </form>
    </div>
  );
}
