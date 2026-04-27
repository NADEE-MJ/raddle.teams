import { useNavigate } from 'react-router-dom';
import { Button } from '@/components';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className='mb-2 text-center'>
            <h1 className='text-tx-primary mb-6 text-3xl font-bold'>Page Not Found</h1>
            <p className='text-tx-secondary mb-6 text-lg'>The page you&apos;re looking for doesn&apos;t exist.</p>
            <Button
                onClick={() => navigate('/')}
                variant='primary'
                size='lg'
                className='px-6 py-3'
                data-testid='not-found-back-to-home-link'
            >
                Back to Home
            </Button>
        </div>
    );
}
