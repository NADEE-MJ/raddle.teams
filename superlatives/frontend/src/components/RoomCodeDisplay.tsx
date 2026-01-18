interface RoomCodeDisplayProps {
    code: string;
}

export default function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
    return (
        <div className='rounded-lg bg-gray-800 p-8 text-center'>
            <div className='text-xl text-gray-400'>Room Code</div>
            <div className='mt-2 font-mono text-6xl font-bold tracking-wider text-yellow-400'>{code}</div>
            <div className='mt-4 text-gray-400'>Share this code with players</div>
        </div>
    );
}
