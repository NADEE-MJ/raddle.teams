import { useState } from 'react';

interface AdminLoginProps {
    onLogin: (token: string) => Promise<void>;
    loading: boolean;
    error: string;
}

export default function AdminLogin({ onLogin, loading, error }: AdminLoginProps) {
    const [localAdminToken, setLocalAdminToken] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localAdminToken.trim()) return;
        await onLogin(localAdminToken.trim());
    };

    return (
        <main className="bg-slate-100 dark:bg-slate-900 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="max-w-md mx-auto">
                    <div className='rounded-lg bg-white dark:bg-slate-800 shadow-sm p-4 md:p-8'>
                        <div className='mb-8 text-center'>
                            <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-white' data-testid='admin-login-title'>Admin Login</h1>
                            <p className='text-gray-600 dark:text-gray-300'>Enter your admin token to access the admin panel</p>
                        </div>

                    <form onSubmit={handleLogin} className='space-y-6' data-testid='admin-login-form'>
                        <div>
                            <label htmlFor='adminToken' className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                                Admin Token
                            </label>
                            <input
                                type='password'
                                id='adminToken'
                                value={localAdminToken}
                                onChange={e => setLocalAdminToken(e.target.value)}
                                className='w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                                placeholder='Enter admin token'
                                disabled={loading}
                                data-testid='admin-token-input'
                            />
                        </div>

                        {error && <div className='text-center text-sm text-red-600 dark:text-red-400' data-testid='admin-login-error'>{error}</div>}

                        <button
                            type='submit'
                            disabled={loading}
                            className='w-full rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 font-medium text-white transition duration-200 disabled:bg-blue-400 dark:disabled:bg-blue-600'
                            data-testid='admin-login-submit'
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
        </main>
    );
}
