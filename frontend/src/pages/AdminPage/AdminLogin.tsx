import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminLoginProps {
    onLogin: (token: string) => Promise<void>;
    loading: boolean;
    error: string;
}

export default function AdminLogin({ onLogin, loading, error }: AdminLoginProps) {
    const [localAdminToken, setLocalAdminToken] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localAdminToken.trim()) return;
        await onLogin(localAdminToken.trim());
    };

    return (
        <div className='flex min-h-screen items-center justify-center bg-gray-50 p-4'>
            <div className='w-full max-w-md'>
                <div className='rounded-lg bg-white p-8 shadow-xl'>
                    <div className='mb-8 text-center'>
                        <h1 className='mb-2 text-3xl font-bold text-gray-900'>Admin Login</h1>
                        <p className='text-gray-600'>Enter your admin token to access the admin panel</p>
                    </div>

                    <form onSubmit={handleLogin} className='space-y-6'>
                        <div>
                            <label htmlFor='adminToken' className='mb-2 block text-sm font-medium text-gray-700'>
                                Admin Token
                            </label>
                            <input
                                type='password'
                                id='adminToken'
                                value={localAdminToken}
                                onChange={e => setLocalAdminToken(e.target.value)}
                                className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                                placeholder='Enter admin token'
                                disabled={loading}
                            />
                        </div>

                        {error && <div className='text-center text-sm text-red-600'>{error}</div>}

                        <button
                            type='submit'
                            disabled={loading}
                            className='w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition duration-200 hover:bg-blue-700 disabled:bg-blue-400'
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className='mt-6 border-t border-gray-200 pt-6'>
                        <button
                            onClick={() => navigate('/')}
                            className='w-full rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition duration-200 hover:bg-gray-700'
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
