const NotFound: React.FC = () => (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
            <h1 className='mb-4 text-3xl font-bold text-gray-900'>Page Not Found</h1>
            <p className='mb-6 text-gray-600'>The page you&apos;re looking for doesn&apos;t exist.</p>
            <a
                href='/'
                className='rounded-lg bg-blue-600 px-4 py-2 text-white transition duration-200 hover:bg-blue-700'
            >
                Back to Home
            </a>
        </div>
    </div>
);

export default NotFound;