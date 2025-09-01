import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className='w-full max-w-md'>
            <div className='rounded-lg bg-white p-8 shadow-xl text-center'>
                <h1 className='mb-4 text-3xl font-bold text-gray-900'>Page Not Found</h1>
                <p className='mb-6 text-gray-600'>The page you&apos;re looking for doesn&apos;t exist.</p>
                <Link
                    to='/'
                    className='rounded-lg bg-blue-600 px-4 py-2 text-white transition duration-200 hover:bg-blue-700'
                    data-testid='back-to-home-link'
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );

}
