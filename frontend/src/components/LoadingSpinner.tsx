export default function LoadingSpinner() {
    return (
        <div className='flex h-64 items-center justify-center'>
            <div className='rounded-lg bg-white dark:bg-slate-800 p-6 shadow-lg text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400'></div>
                <p className='mt-3 text-md text-gray-600 dark:text-gray-300'>Loading...</p>
            </div>
        </div>
    );
}