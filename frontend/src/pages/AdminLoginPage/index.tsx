import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import { useNavigate } from 'react-router-dom';

export default function AdminLoginPage() {
    const { setAdminApiToken, getAdminApiTokenFromLocalStorage, setAdminSessionId, getAdminSessionIdFromLocalStorage } =
        useGlobalOutletContext();
    const navigate = useNavigate();

    const [localAdminApiToken, setLocalAdminApiToken] = useState('');
    const [pageLoading, setPageLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const checkAdminCredentials = useCallback(async () => {
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
    }, [
        getAdminApiTokenFromLocalStorage,
        getAdminSessionIdFromLocalStorage,
        navigate,
        setAdminApiToken,
        setAdminSessionId,
    ]);

    useEffect(() => {
        checkAdminCredentials();
    }, [checkAdminCredentials]);

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

    return pageLoading ? (
        <LoadingSpinner />
    ) : (
        <div className=''>
            <div className='mb-8 text-center'>
                <h1 className='text-tx-primary mb-6 text-3xl font-bold' data-testid='admin-login-title'>
                    Admin Login
                </h1>
                <p className='text-tx-secondary'>Enter your admin api key to access the admin dashboard</p>
            </div>

            <form onSubmit={handleLogin} className='space-y-6' data-testid='admin-login-form'>
                <div className='mx-auto max-w-md space-y-6'>
                    <TextInput
                        id='adminToken'
                        type='password'
                        label='Admin Token'
                        value={localAdminApiToken}
                        onChange={setLocalAdminApiToken}
                        placeholder='Enter admin token'
                        disabled={loading}
                        error={error}
                        data-testid='admin-token-input'
                    />

                    <Button
                        type='submit'
                        variant='primary'
                        size='lg'
                        disabled={loading}
                        loading={loading}
                        className='w-full'
                        data-testid='admin-login-submit'
                    >
                        {loading ? 'Logging in' : 'Login'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
