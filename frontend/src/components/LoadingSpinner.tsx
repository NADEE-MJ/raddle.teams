export default function LoadingSpinner() {
    return (
        <div className='flex h-64 items-center justify-center'>
            <div className='rounded-lg bg-ayu-bg-secondary border border-ayu-border p-6 shadow-lg text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-ayu-accent'></div>
                <p className='mt-3 text-md text-ayu-text-secondary'>Loading...</p>
            </div>
        </div>
    );
}