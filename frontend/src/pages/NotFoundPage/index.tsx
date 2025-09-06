import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <main className="bg-slate-100 dark:bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-secondary dark:border dark:border-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-tx-primary'>Page Not Found</h1>
                    <p className='mb-6 text-gray-600 dark:text-tx-secondary text-lg'>The page you&apos;re looking for doesn&apos;t exist.</p>
                    <Link
                        to='/'
                        className='rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-accent dark:hover:bg-accent-hover dark:text-primary px-6 py-3 text-white transition duration-200 font-medium'
                        data-testid='not-found-back-to-home-link'
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );

}
