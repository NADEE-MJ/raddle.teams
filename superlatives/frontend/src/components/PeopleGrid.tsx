import type { PersonInPool } from '@/types';

interface PeopleGridProps {
    people: PersonInPool[];
    onSelect: (personName: string) => void;
    selectedName?: string;
}

export default function PeopleGrid({ people, onSelect, selectedName }: PeopleGridProps) {
    return (
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
            {people.map(person => (
                <button
                    key={person.id}
                    onClick={() => onSelect(person.name)}
                    className={`rounded-lg p-4 text-center text-lg font-semibold transition ${
                        selectedName === person.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                >
                    {person.name}
                    {person.is_player && ' 👤'}
                </button>
            ))}
        </div>
    );
}
