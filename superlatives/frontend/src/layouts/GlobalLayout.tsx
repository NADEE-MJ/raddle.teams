import { Outlet } from 'react-router-dom';

export default function GlobalLayout() {
    return (
        <div className='min-h-screen bg-[var(--color-primary)]'>
            <Outlet />
        </div>
    );
}
