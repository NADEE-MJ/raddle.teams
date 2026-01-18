import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export default function AdminLoginPage() {
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token.trim()) {
            addToast('Please enter admin token', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const isValid = await adminApi.checkAuth(token);
            if (isValid) {
                localStorage.setItem('admin_token', token);
                addToast('Login successful', 'success');
                navigate('/admin');
            } else {
                addToast('Invalid admin token', 'error');
            }
        } catch (error) {
            addToast('Invalid admin token', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='flex min-h-screen items-center justify-center p-4'>
            <div className='w-full max-w-md space-y-6 rounded-lg bg-gray-800 p-8'>
                <div className='text-center'>
                    <h1 className='text-3xl font-bold text-white'>Admin Login</h1>
                    <p className='mt-2 text-gray-400'>Enter your admin token</p>
                </div>

                <form onSubmit={handleLogin} className='space-y-4'>
                    <input
                        type='password'
                        placeholder='Admin Token'
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        className='w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400'
                    />
                    <button
                        type='submit'
                        disabled={isLoading}
                        className='w-full rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50'
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className='text-center'>
                    <a href='/' className='text-sm text-gray-400 hover:text-gray-300'>
                        ← Back to home
                    </a>
                </div>
            </div>
        </div>
    );
}
