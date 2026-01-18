import AppRouter from '@/router';
import { ToastProvider } from '@/hooks/useToast';

function App() {
    return (
        <ToastProvider>
            <AppRouter />
        </ToastProvider>
    );
}

export default App;
