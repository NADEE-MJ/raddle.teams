export default function LoadingSpinner() {
    return (
        <div className='flex h-64 items-center justify-center'>
            <div className='rounded-lg bg-secondary border border-border p-6 shadow-lg'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-orange'></div>
                <p className='mt-3 text-sm text-tx-primary'>Loading...</p>
            </div>
        </div>
    );
}