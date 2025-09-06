import { useState } from 'react';
import JoinForm from './JoinForm';

export default function LandingPage() {
    const [loading, setLoading] = useState(false);

    return (
        <main className="bg-ayu-bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-ayu-bg-secondary border border-ayu-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className="text-3xl font-bold mb-6 text-ayu-text-primary" data-testid="landing-page-title">Raddle Teams</h1>
                    <p className="text-lg text-ayu-text-secondary mb-8">Team up and solve word transformation puzzles together!</p>

                    <div className="max-w-md mx-auto">
                        <JoinForm loading={loading} setLoading={setLoading} />
                    </div>
                </div>
            </div>
        </main>
    );
}
