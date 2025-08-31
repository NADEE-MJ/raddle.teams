import { useState } from 'react';
import Header from './Header';
import JoinForm from './JoinForm';
import AdminButton from './AdminButton';

export default function LandingPage() {
    const [loading, setLoading] = useState(false);

    return (
        <div className='w-full max-w-md'>
            <div className='rounded-lg bg-white p-8 shadow-xl'>
                <Header />
                <JoinForm loading={loading} setLoading={setLoading} />
                <AdminButton />
            </div>
        </div>
    );
}
