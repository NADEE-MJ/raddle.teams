export default function LoadingSpinner() {
    return (
        <div className='flex h-64 items-center justify-center'>
            <div className='bg-secondary border-border rounded-lg border p-6 shadow-lg'>
                <div className='border-orange mx-auto h-8 w-8 animate-spin rounded-full border-b-2'></div>
                <p className='text-tx-primary mt-3 text-sm'>Loading...</p>
            </div>
        </div>
    );
}
