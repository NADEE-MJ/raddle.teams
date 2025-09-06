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
        <main className="bg-ayu-bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="max-w-md mx-auto">
                    <div className='rounded-lg bg-ayu-bg-secondary border border-ayu-border shadow-sm p-4 md:p-8'>
                        <div className='mb-8 text-center'>
                            <h1 className='text-3xl font-bold mb-6 text-ayu-text-primary' data-testid='admin-login-title'>Admin Login</h1>
                            <p className='text-ayu-text-secondary'>Enter your admin token to access the admin panel</p>
                        </div>

                    <form onSubmit={handleLogin} className='space-y-6' data-testid='admin-login-form'>
                        <div>
                            <label htmlFor='adminToken' className='mb-2 block text-sm font-medium text-ayu-text-secondary'>
                                Admin Token
                            </label>
                            <input
                                type='password'
                                id='adminToken'
                                value={localAdminToken}
                                onChange={e => setLocalAdminToken(e.target.value)}
                                className='w-full rounded-lg border border-ayu-border bg-ayu-bg-tertiary text-ayu-text-primary px-3 py-2 focus:border-ayu-accent focus:ring-2 focus:ring-ayu-accent focus:outline-none'
                                placeholder='Enter admin token'
                                disabled={loading}
                                data-testid='admin-token-input'
                            />
                        </div>

                        {error && <div className='text-center text-sm text-ayu-red' data-testid='admin-login-error'>{error}</div>}

                        <button
                            type='submit'
                            disabled={loading}
                            className='w-full rounded-lg bg-ayu-accent hover:bg-ayu-accent-hover px-4 py-2 font-medium text-ayu-bg-primary transition duration-200 disabled:bg-ayu-text-muted'
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
