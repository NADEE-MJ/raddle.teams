import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <main className="bg-slate-100 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6'>Page Not Found</h1>
                    <p className='mb-6 text-gray-600 text-lg'>The page you&apos;re looking for doesn&apos;t exist.</p>
                    <Link
                        to='/'
                        className='rounded-lg bg-blue-600 px-6 py-3 text-white transition duration-200 hover:bg-blue-700 font-medium'
                        data-testid='not-found-back-to-home-link'
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );

}
