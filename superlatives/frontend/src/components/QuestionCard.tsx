interface QuestionCardProps {
    questionText: string;
    playerName?: string;
}

export default function QuestionCard({ questionText, playerName }: QuestionCardProps) {
    return (
        <div className='rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 p-8 text-center shadow-2xl'>
            <div className='text-5xl font-bold text-white'>{questionText}</div>
            {playerName && <div className='mt-4 text-xl text-gray-200'>Asked by: {playerName}</div>}
        </div>
    );
}
