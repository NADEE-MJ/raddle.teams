// import { Link } from 'react-router-dom';
// import Tutorial from './Tutorial';
import { useState } from 'react';

export default function TutorialPage() {
    const [completed, setCompleted] = useState(false);

    return null;

    // return (
    //     <div className="max-w-6xl mx-auto text-center">
    //         <div className="text-center md:text-left flex flex-col md:flex-row w-full md:px-2 lg:px-8 mb-2 md:mb-6">
    //             <div className="w-full text-center mb-4 md:mb-0">
    //                 <h2 className="text-2xl md:text-3xl font-semibold mb-1 text-gray-900 dark:text-white">Learn how to Raddle</h2>
    //                 <div className="text-sm flex align-middle justify-center items-center">
    //                     <Link
    //                         to="/"
    //                         className="text-sm px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-md cursor-pointer"
    //                     >
    //                         Skip tutorial
    //                     </Link>
    //                 </div>
    //             </div>
    //         </div>

    //         <Tutorial
    //             completed={completed}
    //             setCompleted={setCompleted}
    //         />

    //         {completed && (
    //             <div className="mt-8 text-center">
    //                 <Link
    //                     to='/'
    //                     className='inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition duration-200'
    //                 >
    //                     Ready to Play with Teams! →
    //                 </Link>
    //             </div>
    //         )}
    //     </div>
    // );
}
