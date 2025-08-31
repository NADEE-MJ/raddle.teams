import { useNavigate } from 'react-router-dom';

export default function AdminButton() {
    const navigate = useNavigate();

    const goToAdminPage = () => {
        navigate('/admin');
    };

    return (
        <div className='mt-6 border-t border-gray-200 pt-6'>
            <button
                onClick={goToAdminPage}
                className='w-full rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition duration-200 hover:bg-gray-700'
            >
                Admin Panel
            </button>
        </div>
    );
}
