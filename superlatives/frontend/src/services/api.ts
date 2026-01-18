import type { PlayerJoinResponse, Question, RoomInfo, Vote, VoteResults } from '@/types';

const API_BASE = '';

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('session_token');
    if (!token) {
        return {};
    }
    return {
        Authorization: `Bearer ${token}`,
    };
}

// Room API
export const roomApi = {
    async join(name: string, roomCode: string): Promise<PlayerJoinResponse> {
        const response = await fetch(`${API_BASE}/api/room`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, room_code: roomCode }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to join room');
        }

        const data = await response.json();
        // Store session token
        localStorage.setItem('session_token', data.session_id);
        return data;
    },

    async getCurrent(): Promise<RoomInfo> {
        const response = await fetch(`${API_BASE}/api/room`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get room info');
        }

        return response.json();
    },

    async getByCode(roomCode: string): Promise<RoomInfo> {
        const response = await fetch(`${API_BASE}/api/room/${roomCode}`);

        if (!response.ok) {
            throw new Error('Failed to get room info');
        }

        return response.json();
    },

    async leave(): Promise<void> {
        await fetch(`${API_BASE}/api/room`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        localStorage.removeItem('session_token');
    },
};

// Game API
export const gameApi = {
    async getState() {
        const response = await fetch(`${API_BASE}/api/game/state`, {
            headers: getAuthHeaders(),
        });
        return response.json();
    },

    async submitQuestion(questionText: string): Promise<{ question: Question }> {
        const response = await fetch(`${API_BASE}/api/game/submit-question`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question_text: questionText }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit question');
        }

        return response.json();
    },

    async submitVote(questionId: number, votedForName: string): Promise<{ vote: Vote }> {
        const response = await fetch(`${API_BASE}/api/game/submit-vote`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question_id: questionId, voted_for_name: votedForName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit vote');
        }

        return response.json();
    },

    async getResults(questionId: number): Promise<VoteResults> {
        const response = await fetch(`${API_BASE}/api/game/results/${questionId}`, {
            headers: getAuthHeaders(),
        });
        return response.json();
    },
};

// Host API
export const hostApi = {
    async createLobby(roomName?: string): Promise<{ room_code: string; room_name: string }> {
        const response = await fetch(`${API_BASE}/api/host/lobby`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ room_name: roomName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create lobby');
        }

        return response.json();
    },

    async createRoom(hostName: string, roomName?: string): Promise<PlayerJoinResponse> {
        const response = await fetch(`${API_BASE}/api/host/room`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ host_name: hostName, room_name: roomName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create room');
        }

        const data = await response.json();
        localStorage.setItem('session_token', data.session_id);
        return data;
    },

    async addPersonToPool(personName: string): Promise<void> {
        const response = await fetch(`${API_BASE}/api/host/people-pool`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ person_name: personName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add person');
        }
    },

    async removePersonFromPool(name: string): Promise<void> {
        await fetch(`${API_BASE}/api/host/people-pool/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
    },

    async kickPlayer(playerId: number): Promise<void> {
        await fetch(`${API_BASE}/api/host/player/${playerId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
    },

    async startGame(): Promise<void> {
        const response = await fetch(`${API_BASE}/api/host/start-game`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to start game');
        }
    },

    async startRound(roundNumber: number): Promise<void> {
        await fetch(`${API_BASE}/api/host/start-round`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ round_number: roundNumber }),
        });
    },

    async startVoting(questionId: number): Promise<void> {
        await fetch(`${API_BASE}/api/host/start-voting`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question_id: questionId }),
        });
    },

    async endVoting(questionId: number): Promise<void> {
        await fetch(`${API_BASE}/api/host/end-voting`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question_id: questionId }),
        });
    },
};

// Admin API
export const adminApi = {
    async checkAuth(token: string): Promise<boolean> {
        const response = await fetch(`${API_BASE}/api/admin/check`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.ok;
    },

    async listRooms(token: string) {
        const response = await fetch(`${API_BASE}/api/admin/room`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.json();
    },

    async getRoomDetails(roomId: number, token: string): Promise<RoomInfo> {
        const response = await fetch(`${API_BASE}/api/admin/room/${roomId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.json();
    },

    async deleteRoom(roomId: number, token: string): Promise<void> {
        await fetch(`${API_BASE}/api/admin/room/${roomId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    },
};
