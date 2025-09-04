import { useState } from 'react';
import JoinForm from './JoinForm';

export default function LandingPage() {
    const [loading, setLoading] = useState(false);

    return (
        <main className="bg-slate-100 dark:bg-slate-900 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white" data-testid="landing-page-title">Raddle Teams</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Team up and solve word transformation puzzles together!</p>

                    <div className="max-w-md mx-auto">
                        <JoinForm loading={loading} setLoading={setLoading} />
                    </div>
                </div>
            </div>
        </main>
    );
}
