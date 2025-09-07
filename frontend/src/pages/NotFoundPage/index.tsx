import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className="text-center mb-2">
            <h1 className='text-3xl font-bold mb-6 text-tx-primary'>Page Not Found</h1>
            <p className='mb-6 text-tx-secondary text-lg'>The page you&apos;re looking for doesn&apos;t exist.</p>
            <Link
                to='/'
                className='rounded-lg bg-accent hover:bg-accent/80 text-black px-6 py-3 transition duration-200 font-medium'
                data-testid='not-found-back-to-home-link'
            >
                Back to Home
            </Link>
        </div>
    );

}
