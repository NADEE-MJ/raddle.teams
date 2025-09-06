export default function LoadingState() {
    return (
        <main className="bg-slate-100 dark:bg-ayu-bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-ayu-bg-secondary dark:border dark:border-ayu-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-ayu-text-primary'>Loading</h1>
                    <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mb-4'></div>
                    <p className='text-gray-600 dark:text-ayu-text-secondary'>Loading game...</p>
                </div>
            </div>
        </main>
    );
}
