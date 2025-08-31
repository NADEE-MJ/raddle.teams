import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { TutorialItem, TutorialResponse } from '@/types';

type LadderItem = TutorialItem;

function CluesOutOfOrder({ items }: { items: LadderItem[] }) {
  const [shuffled, setShuffled] = useState<string[]>([]);

  useEffect(() => {
  const clues = items.map(i => i.clue || null).filter(Boolean) as string[];
  const copy = [...clues];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setShuffled(copy);
  }, [items]);

  if (shuffled.length === 0) return <div className='text-sm text-gray-500'>No clues available</div>;

  return (
    <ul className='space-y-2 text-sm text-gray-700'>
      {shuffled.map((c, i) => (
        <li key={i} className='rounded border border-gray-100 bg-white px-2 py-1'>
          {c}
        </li>
      ))}
    </ul>
  );
}

export default function TutorialPage() {
  const [ladder, setLadder] = useState<LadderItem[]>([]);
  const [title, setTitle] = useState('Tutorial Puzzle');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [revealedIndexes, setRevealedIndexes] = useState<number[]>([0]);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
  // Use the new public tutorial endpoint
  const data: TutorialResponse = await api.general.getTutorial();
  if (data.title) setTitle(data.title);
  // Support both ladder and words shapes
  const items = data.ladder ?? data.words ?? [];
        setLadder(items as LadderItem[]);
      } catch (err) {
        console.error('Failed to load tutorial:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className='p-8'>Loading tutorial…</div>;

  const replacePlaceholder = (text?: string | null, prevWord?: string) => {
    if (!text) return '';
    return text.replace(/<>|\{\}|\{\s*\}/g, prevWord ?? '');
  };

  const handleSubmitGuess = (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    const target = ladder[currentIndex];
    if (!target) return;
    if (guess.trim().toUpperCase() === target.word.toUpperCase()) {
      // correct
      setRevealedIndexes(prev => [...prev, currentIndex]);
      setMessage('Correct!');
      setGuess('');
      if (currentIndex + 1 < ladder.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setMessage('Tutorial complete — well done!');
      }
    } else {
      setMessage('Not quite — try again.');
    }
  };

  const prevWord = ladder[currentIndex - 1]?.word ?? '';

  return (
    <div className='w-full max-w-3xl'>
      <div className='rounded-lg bg-white p-8 shadow-xl'>
        <h2 className='mb-2 text-2xl font-bold text-gray-900'>{title}</h2>
        {/* From X to Y style header */}
        <div className='mb-6 rounded border border-gray-100 bg-gray-50 p-4'>
          <div className='text-sm text-gray-600'>From</div>
          <div className='mt-1 flex items-baseline gap-3'>
            <div className='text-3xl font-extrabold tracking-wide text-gray-900'>{ladder[0]?.word ?? '---'}</div>
            <div className='text-sm text-gray-500'>to</div>
            <div className='text-3xl font-extrabold tracking-wide text-gray-900'>{ladder[ladder.length - 1]?.word ?? '---'}</div>
          </div>
        </div>

  <div className='grid gap-4 md:grid-cols-3'>
          <div className='md:col-span-2'>
            <ol className='space-y-3 list-decimal pl-6'>
              {ladder.map((item, i) => {
                const revealed = revealedIndexes.includes(i) || i <= revealedIndexes[revealedIndexes.length - 1];
                return (
                  <li key={i} className='rounded-md border border-gray-100 p-3'>
                    <div className='flex items-baseline justify-between'>
                      <div>
                        <div className='text-sm font-mono text-gray-700'>{revealed ? item.word : '—'}</div>
                        {item.clue && (
                          <div className='mt-1 text-sm text-gray-500'>Clue: {replacePlaceholder(item.clue, ladder[i - 1]?.word)}</div>
                        )}
                      </div>
                      {item.transform && <div className='ml-4 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600'>{item.transform}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className='md:col-span-1'>
            <div className='rounded border border-gray-100 bg-gray-50 p-4'>
              {/* Clues, out of order panel */}
              <div className='mb-3 text-sm font-semibold text-gray-700'>CLUES, OUT OF ORDER</div>
              <CluesOutOfOrder items={ladder} />
              <hr className='my-3' />
              <div className='mb-2 text-sm text-gray-700'>Current clue</div>
              <div className='mb-4 text-lg font-medium text-gray-900'>
                {replacePlaceholder(ladder[currentIndex]?.clue, prevWord) || 'No clue available'}
              </div>

              <form onSubmit={handleSubmitGuess} className='space-y-3'>
                <input
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2'
                  placeholder='Type your guess'
                />
                <div className='flex gap-2'>
                  <button type='submit' className='rounded bg-blue-600 px-3 py-2 text-white'>Try guess</button>
                  <button
                    type='button'
                    onClick={() => {
                      // reveal the answer
                      setGuess(ladder[currentIndex]?.word ?? '');
                      setMessage(`Answer revealed: ${ladder[currentIndex]?.word}`);
                      setRevealedIndexes(prev => [...prev, currentIndex]);
                      if (currentIndex + 1 < ladder.length) setCurrentIndex(currentIndex + 1);
                    }}
                    className='rounded border border-gray-300 px-3 py-2'
                  >
                    Reveal & continue
                  </button>
                </div>
              </form>

              {message && <div className='mt-3 text-sm text-gray-700'>{message}</div>}
              <div className='mt-4 text-xs text-gray-500'>Transform: {ladder[currentIndex]?.transform ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
