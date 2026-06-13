# raddle.teams/frontend/ — React + TypeScript Web App

Vite + Tailwind CSS frontend for team word puzzle game.

## Structure

- `src/pages/` — LandingPage/, LobbyPage/, GamePage/, AdminPage/, AdminLoginPage/, TutorialPage/, NotFoundPage/, ComponentShowcasePage/
- `src/components/` — Alert, Button, Card, ConnectionBadge, CopyableCode, ErrorMessage, HintConfirmationModal, LoadingSpinner, Modal, Select, StatusIndicator, TeamLeaderboard, TextInput, Toast, ToastContainer
- `src/hooks/` — useDebounce, useGameState, useGlobalOutletContext, useToast, useTutorialStateMachine, useWebSocket
- `src/layouts/GlobalLayout.tsx`
- `src/services/` — api.ts, TutorialStateMachine.ts
- `src/types/` — game.ts, tutorialStateMachine.ts
- `src/router.tsx` — lazy-loaded routes
