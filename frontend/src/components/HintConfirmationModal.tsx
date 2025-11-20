import { Modal, Button } from '@/components';

interface HintConfirmationModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    secondHint?: boolean;
}

export default function HintConfirmationModal({ isOpen, onConfirm, onCancel, secondHint }: HintConfirmationModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} maxWidth='max-w-md'>
            <div className='p-6 pt-2'>
                <h2 className='text-tx-primary mb-4 text-lg font-bold'>Reveal clue?</h2>
                {secondHint ? (
                    <p className='text-tx-secondary mb-6'>
                        This will reveal the <span className='text-tx-primary font-bold'>answer</span> for this step of
                        the ladder.
                    </p>
                ) : (
                    <p className='text-tx-secondary mb-6'>
                        This will reveal which <span className='text-tx-primary font-bold'>clue</span> is related to
                        this step of the ladder.
                    </p>
                )}
                <div className='flex justify-center'>
                    <Button
                        onClick={onConfirm}
                        variant='primary'
                        size='lg'
                        className='w-1/2'
                        data-testid='hint-confirmation-yes'
                    >
                        Yes
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
