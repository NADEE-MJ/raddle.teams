const LoadingSpinner: React.FC = () => (
    <div className='flex h-64 items-center justify-center'>
        <div className='rounded-lg bg-white p-6 shadow-lg'>
            <div className='text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
                <p className='mt-3 text-sm text-gray-600'>Loading...</p>
            </div>
        </div>
    </div>
);

export default LoadingSpinner;