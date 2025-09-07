import { useState, useEffect } from 'react';
import { api } from '@/services/api';

import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export default function AdminLoginPage() {
    const {
        setAdminApiToken,
        getAdminApiTokenFromLocalStorage,
        setAdminSessionId,
        getAdminSessionIdFromLocalStorage,
    } = useGlobalOutletContext();
    const navigate = useNavigate();

    const [localAdminApiToken, setLocalAdminApiToken] = useState('');
    const [pageLoading, setPageLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkAdminCredentials = async () => {
            const adminTokenFromStorage = getAdminApiTokenFromLocalStorage();
            const adminSessionIdFromStorage = getAdminSessionIdFromLocalStorage();

            if (adminTokenFromStorage && adminSessionIdFromStorage) {
                try {
                    const response = await api.admin.checkCredentials(adminTokenFromStorage);
                    setAdminSessionId(response.session_id);
                    setAdminApiToken(adminTokenFromStorage);
                    navigate('/admin');
                } catch (error) {
                    console.error('Error checking admin credentials:', error);
                    // Clear invalid credentials
                    setAdminApiToken(null);
                    setAdminSessionId(null);
                }
            } else {
                setAdminApiToken(null);
                setAdminSessionId(null);
            }

            setPageLoading(false);
        };

        checkAdminCredentials();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!localAdminApiToken.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await api.admin.checkCredentials(localAdminApiToken);
            setAdminApiToken(localAdminApiToken);
            setAdminSessionId(response.session_id);
            navigate('/admin');
        } catch (err) {
            setError('Invalid admin token');
            console.error('Auth error:', err);
        } finally {
            setLoading(false);
        }
    };

    return pageLoading ? <LoadingSpinner /> :
        <div className=''>
            <div className='mb-8 text-center'>
                <h1 className='text-3xl font-bold mb-6 text-tx-primary' data-testid='admin-login-title'>Admin Login</h1>
                <p className='text-tx-secondary'>Enter your admin api key to access the admin dashboard</p>
            </div>

            <form onSubmit={handleLogin} className='space-y-6' data-testid='admin-login-form'>
                <div className='text-left max-w-md mx-auto space-y-6'>
                    <label htmlFor='adminToken' className='mb-2 block text-sm font-medium text-tx-secondary'>
                        Admin Token
                    </label>
                    <input
                        type='password'
                        id='adminToken'
                        value={localAdminApiToken}
                        onChange={e => setLocalAdminApiToken(e.target.value)}
                        className='w-full rounded-lg border border-border bg-tertiary text-tx-primary px-3 py-2 focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none'
                        placeholder='Enter admin token'
                        disabled={loading}
                        data-testid='admin-token-input'
                    />
                    {error && <div className='text-center text-sm text-red' data-testid='admin-login-error'>{error}</div>}

                    <button
                        type='submit'
                        disabled={loading}
                        className='w-full rounded-lg bg-accent hover:bg-accent/80 px-4 py-2 font-medium text-primary transition duration-200 disabled:bg-tx-muted'
                        data-testid='admin-login-submit'
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </div>

            </form>
        </div>
}
