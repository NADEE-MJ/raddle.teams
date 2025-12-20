import { useState } from 'react';
import {
    Alert,
    Button,
    Card,
    CopyableCode,
    ErrorMessage,
    HintConfirmationModal,
    LoadingSpinner,
    Modal,
    Select,
    StatusIndicator,
    TextInput,
} from '@/components';
import { useToast } from '@/hooks/useToast';

export default function ComponentShowcasePage() {
    const [textInputValue, setTextInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [showHintModal, setShowHintModal] = useState(false);
    const [showSecondHintModal, setShowSecondHintModal] = useState(false);
    const [buttonLoading, setButtonLoading] = useState(false);
    const { addToast } = useToast();

    const handleButtonLoadingTest = () => {
        setButtonLoading(true);
        setTimeout(() => setButtonLoading(false), 2000);
    };

    return (
        <div className='mx-auto max-w-6xl space-y-12 p-6'>
            <div className='mb-8 text-center'>
                <h1 className='text-tx-primary mb-4 text-4xl font-bold'>Component Showcase</h1>
            </div>

            {/* Alert Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Alert</h2>
                <div className='grid gap-4 md:grid-cols-2'>
                    <Alert variant='error'>Error: Something went wrong!</Alert>
                    <Alert variant='warning'>Warning: Please check your input.</Alert>
                    <Alert variant='info'>Info: This is an informational message.</Alert>
                    <Alert variant='success'>Success: Operation completed successfully!</Alert>
                </div>
            </section>

            {/* Button Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Button</h2>

                <div className='space-y-4'>
                    <div>
                        <h3 className='text-tx-primary mb-3 text-lg font-medium'>Variants</h3>
                        <div className='flex flex-wrap gap-3'>
                            <Button variant='primary'>Primary</Button>
                            <Button variant='secondary'>Secondary</Button>
                            <Button variant='destructive'>Destructive</Button>
                            <Button variant='link'>Link</Button>
                            <Button variant='hint'>Hint</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className='text-tx-primary mb-3 text-lg font-medium'>Sizes</h3>
                        <div className='flex flex-wrap items-center gap-3'>
                            <Button size='sm'>Small</Button>
                            <Button size='md'>Medium</Button>
                            <Button size='lg'>Large</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className='text-tx-primary mb-3 text-lg font-medium'>States</h3>
                        <div className='flex flex-wrap gap-3'>
                            <Button disabled>Disabled</Button>
                            <Button loading={buttonLoading} onClick={handleButtonLoadingTest}>
                                Click for Loading
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Card Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Card</h2>
                <div className='grid gap-4 md:grid-cols-2'>
                    <Card variant='default'>
                        <h3 className='text-tx-primary mb-2 font-semibold'>Default Card</h3>
                        <p className='text-tx-secondary'>This is a default card with standard styling.</p>
                    </Card>

                    <Card variant='warning'>
                        <h3 className='text-orange mb-2 font-semibold'>Warning Card</h3>
                        <p className='text-tx-secondary'>This is a warning card with orange styling.</p>
                    </Card>

                    <Card variant='info'>
                        <h3 className='text-tx-primary mb-2 font-semibold'>Info Card</h3>
                        <p className='text-tx-secondary'>This is an info card with standard styling.</p>
                    </Card>

                    <Card variant='clickable' onClick={() => console.log('Card clicked!')}>
                        <h3 className='text-tx-primary mb-2 font-semibold'>Clickable Card</h3>
                        <p className='text-tx-secondary'>This card is clickable and has hover effects.</p>
                        <span className='text-tx-muted text-xs'>Click me →</span>
                    </Card>
                </div>
            </section>

            {/* TextInput Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>TextInput</h2>
                <div className='grid gap-6 md:grid-cols-2'>
                    <div className='space-y-4'>
                        <TextInput
                            label='Basic Input'
                            value={textInputValue}
                            onChange={setTextInputValue}
                            placeholder='Enter some text...'
                        />

                        <TextInput
                            label='Required Input'
                            value=''
                            onChange={() => {}}
                            placeholder='This field is required'
                            required
                        />

                        <TextInput
                            label='Password Input'
                            type='password'
                            value=''
                            onChange={() => {}}
                            placeholder='Enter password'
                        />
                    </div>

                    <div className='space-y-4'>
                        <TextInput
                            label='Email Input'
                            type='email'
                            value=''
                            onChange={() => {}}
                            placeholder='Enter email'
                        />

                        <TextInput
                            label='Number Input'
                            type='number'
                            value=''
                            onChange={() => {}}
                            placeholder='Enter number'
                            maxLength={10}
                        />

                        <TextInput label='Disabled Input' value='Cannot edit this' onChange={() => {}} disabled />

                        <TextInput
                            label='Input with Error'
                            value=''
                            onChange={() => {}}
                            placeholder='This has an error'
                            error='This field is required'
                        />
                    </div>
                </div>
            </section>

            {/* Select Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Select</h2>
                <div className='grid gap-6 md:grid-cols-2'>
                    <div className='space-y-4'>
                        <Select
                            label='Basic Select'
                            value={selectValue}
                            onChange={value => setSelectValue(String(value))}
                            placeholder='Choose an option...'
                            options={[
                                { value: 'option1', label: 'Option 1' },
                                { value: 'option2', label: 'Option 2' },
                                { value: 'option3', label: 'Option 3' },
                            ]}
                        />

                        <Select
                            label='Required Select'
                            value=''
                            onChange={() => {}}
                            placeholder='Select required option'
                            required
                            options={[
                                { value: 'a', label: 'Choice A' },
                                { value: 'b', label: 'Choice B' },
                            ]}
                        />
                    </div>

                    <div className='space-y-4'>
                        <Select
                            label='Disabled Select'
                            value='disabled'
                            onChange={() => {}}
                            disabled
                            options={[{ value: 'disabled', label: 'Cannot change this' }]}
                        />

                        <Select
                            label='Number Options'
                            value={1}
                            onChange={() => {}}
                            options={[
                                { value: 1, label: 'One' },
                                { value: 2, label: 'Two' },
                                { value: 3, label: 'Three' },
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* Other Components */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Other Components</h2>

                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    <Card>
                        <h3 className='text-tx-primary mb-3 font-semibold'>LoadingSpinner</h3>
                        <div className='flex justify-center py-4'>
                            <LoadingSpinner />
                        </div>
                    </Card>

                    <Card>
                        <h3 className='text-tx-primary mb-3 font-semibold'>StatusIndicator</h3>
                        <div className='space-y-2'>
                            <div className='flex items-center gap-2'>
                                <StatusIndicator isConnected={true} />
                                <span className='text-tx-secondary'>Connected</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <StatusIndicator isConnected={false} />
                                <span className='text-tx-secondary'>Disconnected</span>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className='text-tx-primary mb-3 font-semibold'>CopyableCode</h3>
                        <div className='space-y-2'>
                            <CopyableCode code='ABC123' />
                            <CopyableCode code='DEFGHI' className='text-sm' />
                        </div>
                    </Card>
                </div>
            </section>

            {/* ErrorMessage Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>ErrorMessage</h2>
                <div className='space-y-4'>
                    <ErrorMessage message='This is an error message' />
                    <ErrorMessage message='Another error occurred while processing your request. Please try again later.' />
                    <ErrorMessage message='' /> {/* Should not display anything */}
                </div>
            </section>

            {/* Modal Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Modal</h2>
                <div className='flex gap-2'>
                    <Button onClick={() => setShowModal(true)}>Open Modal</Button>
                    <Button onClick={() => setShowLoadingModal(true)} variant='secondary'>
                        Open Loading Modal
                    </Button>

                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} maxWidth='max-w-md'>
                        <div className='p-6'>
                            <h3 className='text-tx-primary mb-4 text-lg font-semibold'>Modal Example</h3>
                            <p className='text-tx-secondary mb-4'>
                                This is a modal dialog. You can put any content here.
                            </p>
                            <div className='flex justify-end gap-2'>
                                <Button variant='secondary' onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => setShowModal(false)}>OK</Button>
                            </div>
                        </div>
                    </Modal>

                    <Modal
                        isOpen={showLoadingModal}
                        onClose={() => setShowLoadingModal(false)}
                        maxWidth='max-w-md'
                        isLoading={true}
                    >
                        <div className='p-6'>
                            <h3 className='text-tx-primary mb-4 text-lg font-semibold'>Loading Modal</h3>
                            <p className='text-tx-secondary'>This content is hidden while loading.</p>
                        </div>
                    </Modal>
                </div>
            </section>

            {/* HintConfirmationModal Component */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>
                    HintConfirmationModal
                </h2>
                <div className='flex gap-2'>
                    <Button onClick={() => setShowHintModal(true)} variant='hint'>
                        Open First Hint Modal
                    </Button>
                    <Button onClick={() => setShowSecondHintModal(true)} variant='hint'>
                        Open Second Hint Modal
                    </Button>

                    <HintConfirmationModal
                        isOpen={showHintModal}
                        onConfirm={() => {
                            console.log('First hint confirmed');
                            setShowHintModal(false);
                        }}
                        onCancel={() => setShowHintModal(false)}
                        secondHint={false}
                    />

                    <HintConfirmationModal
                        isOpen={showSecondHintModal}
                        onConfirm={() => {
                            console.log('Second hint confirmed');
                            setShowSecondHintModal(false);
                        }}
                        onCancel={() => setShowSecondHintModal(false)}
                        secondHint={true}
                    />
                </div>
            </section>

            {/* Toast Notifications */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>
                    Toast Notifications
                </h2>
                <div className='space-y-4'>
                    <Card>
                        <h3 className='text-tx-primary mb-3 font-semibold'>Basic Toasts</h3>
                        <div className='flex flex-wrap gap-3'>
                            <Button onClick={() => addToast('This is a success message!', 'success')}>
                                Success Toast
                            </Button>
                            <Button
                                onClick={() => addToast('This is an error message!', 'error')}
                                variant='destructive'
                            >
                                Error Toast
                            </Button>
                            <Button
                                onClick={() => addToast('This is a warning message!', 'warning')}
                                variant='secondary'
                            >
                                Warning Toast
                            </Button>
                            <Button onClick={() => addToast('This is an info message!', 'info')} variant='secondary'>
                                Info Toast
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className='text-tx-primary mb-3 font-semibold'>Placement Toasts</h3>
                        <div className='flex flex-wrap gap-3'>
                            <Button onClick={() => addToast('Team Alpha finished 1st!', 'placement', 5000, 1)}>
                                1st Place 🥇
                            </Button>
                            <Button onClick={() => addToast('Team Beta finished 2nd!', 'placement', 5000, 2)}>
                                2nd Place 🥈
                            </Button>
                            <Button onClick={() => addToast('Team Gamma finished 3rd!', 'placement', 5000, 3)}>
                                3rd Place 🥉
                            </Button>
                            <Button onClick={() => addToast('Team Delta finished 4th!', 'placement', 5000, 4)}>
                                4th Place 🏁
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className='text-tx-primary mb-3 font-semibold'>Multiple Toasts (Stacking)</h3>
                        <div className='flex flex-wrap gap-3'>
                            <Button
                                onClick={() => {
                                    addToast('First notification', 'info');
                                    setTimeout(() => addToast('Second notification', 'info'), 500);
                                    setTimeout(() => addToast('Third notification', 'info'), 1000);
                                }}
                            >
                                Add 3 Toasts
                            </Button>
                            <Button
                                onClick={() => {
                                    for (let i = 1; i <= 5; i++) {
                                        setTimeout(() => addToast(`Notification #${i}`, 'success'), i * 300);
                                    }
                                }}
                                variant='secondary'
                            >
                                Add 5 Toasts Rapidly
                            </Button>
                        </div>
                        <p className='text-tx-secondary mt-3 text-sm'>
                            Toasts stack automatically and show a &quot;+N more&quot; indicator when multiple exist.
                        </p>
                    </Card>
                </div>
            </section>

            {/* Color Palette */}
            <section className='space-y-4'>
                <h2 className='text-tx-primary border-border border-b pb-2 text-2xl font-semibold'>Color Palette</h2>

                <div className='space-y-6'>
                    {/* Background Colors */}
                    <div>
                        <h3 className='text-tx-primary mb-4 text-lg font-medium'>Background Colors</h3>
                        <div className='rounded-lg bg-white p-4 shadow-sm'>
                            <div className='grid grid-cols-2'>
                                <div className='bg-primary p-6 text-center text-white'>
                                    <div className='mb-2 text-sm font-medium'>Primary</div>
                                    <div className='text-xs opacity-75'>bg-primary</div>
                                    <div className='text-xs opacity-50'>#101828 / #0d1524</div>
                                </div>
                                <div className='bg-secondary p-6 text-center text-white'>
                                    <div className='mb-2 text-sm font-medium'>Secondary</div>
                                    <div className='text-xs opacity-75'>bg-secondary</div>
                                    <div className='text-xs opacity-50'>#182440 / #1a2844</div>
                                </div>
                                <div className='bg-tertiary p-6 text-center text-white'>
                                    <div className='mb-2 text-sm font-medium'>Tertiary</div>
                                    <div className='text-xs opacity-75'>bg-tertiary</div>
                                    <div className='text-xs opacity-50'>#1f2f4c / #223559</div>
                                </div>
                                <div className='bg-elevated p-6 text-center text-white'>
                                    <div className='mb-2 text-sm font-medium'>Elevated</div>
                                    <div className='text-xs opacity-75'>bg-elevated</div>
                                    <div className='text-xs opacity-50'>#243453 / #2a3d61</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Colors */}
                    <div>
                        <h3 className='text-tx-primary mb-4 text-lg font-medium'>Text Colors</h3>
                        <div className='grid gap-4 md:grid-cols-3'>
                            <div className='rounded-lg bg-black p-6 text-center'>
                                <div className='text-tx-primary mb-2 text-lg font-semibold'>Primary Text</div>
                                <div className='text-sm text-gray-300'>text-tx-primary</div>
                                <div className='text-xs text-gray-400'>#f3f5ff / #e3e9ff</div>
                            </div>
                            <div className='rounded-lg bg-black p-6 text-center'>
                                <div className='text-tx-secondary mb-2 text-lg font-semibold'>Secondary Text</div>
                                <div className='text-sm text-gray-300'>text-tx-secondary</div>
                                <div className='text-xs text-gray-400'>#c3cee7 / #93a2c7</div>
                            </div>
                            <div className='rounded-lg bg-black p-6 text-center'>
                                <div className='text-tx-muted mb-2 text-lg font-semibold'>Muted Text</div>
                                <div className='text-sm text-gray-300'>text-tx-muted</div>
                                <div className='text-xs text-gray-400'>rgba(142, 159, 196, 0.65)</div>
                            </div>
                        </div>
                    </div>

                    {/* Border Colors */}
                    <div>
                        <h3 className='text-tx-primary mb-4 text-lg font-medium'>Border Colors</h3>
                        <div className='grid gap-4 md:grid-cols-2'>
                            <div className='bg-secondary rounded-lg p-4'>
                                <div className='border-border mb-3 rounded border-2 p-3 text-center'>
                                    <div className='text-tx-primary text-sm font-medium'>Border</div>
                                    <div className='text-tx-secondary text-xs'>border-border</div>
                                    <div className='text-tx-muted text-xs'>#304267 / #3a4d73</div>
                                </div>
                            </div>
                            <div className='bg-secondary rounded-lg p-4'>
                                <div className='border-border-light mb-3 rounded border-2 p-3 text-center'>
                                    <div className='text-tx-primary text-sm font-medium'>Border Light</div>
                                    <div className='text-tx-secondary text-xs'>border-border-light</div>
                                    <div className='text-tx-muted text-xs'>#3c4f77 / #4a5f8f</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Accent & Semantic Colors */}
                    <div>
                        <h3 className='text-tx-primary mb-4 text-lg font-medium'>Accent & Semantic Colors</h3>
                        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                            <div className='bg-accent rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Accent</div>
                                <div className='text-xs opacity-75'>bg-accent / text-accent</div>
                                <div className='text-xs opacity-50'>#e3db4d</div>
                            </div>
                            <div className='bg-green rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Green</div>
                                <div className='text-xs opacity-75'>bg-green / text-green</div>
                                <div className='text-xs opacity-50'>#7ed8c7</div>
                            </div>
                            <div className='bg-orange rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Orange</div>
                                <div className='text-xs opacity-75'>bg-orange / text-orange</div>
                                <div className='text-xs opacity-50'>#ff9b5e</div>
                            </div>
                            <div className='bg-red rounded-lg p-4 text-center text-white shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Red</div>
                                <div className='text-xs opacity-75'>bg-red / text-red</div>
                                <div className='text-xs opacity-50'>#ff6f91</div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Colors */}
                    <div>
                        <h3 className='text-tx-primary mb-4 text-lg font-medium'>Additional Colors</h3>
                        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                            <div className='bg-blue rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Blue</div>
                                <div className='text-xs opacity-75'>bg-blue / text-blue</div>
                                <div className='text-xs opacity-50'>#03598f</div>
                            </div>
                            <div className='bg-blue-bright rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Blue Bright</div>
                                <div className='text-xs opacity-75'>bg-blue-bright</div>
                                <div className='text-xs opacity-50'>#4f5ed1</div>
                            </div>
                            <div className='bg-yellow rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Yellow</div>
                                <div className='text-xs opacity-75'>bg-yellow / text-yellow</div>
                                <div className='text-xs opacity-50'>#e8b134</div>
                            </div>
                            <div className='bg-red-bright rounded-lg p-4 text-center text-white shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Red Bright</div>
                                <div className='text-xs opacity-75'>bg-red-bright / text-red-bright</div>
                                <div className='text-xs opacity-50'>#ff8ba8</div>
                            </div>
                        </div>
                        <div className='mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                            <div className='bg-purple rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Purple</div>
                                <div className='text-xs opacity-75'>bg-purple / text-purple</div>
                                <div className='text-xs opacity-50'>#272377</div>
                            </div>
                            <div className='bg-cyan rounded-lg p-4 text-center text-black shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Cyan</div>
                                <div className='text-xs opacity-75'>bg-cyan / text-cyan</div>
                                <div className='text-xs opacity-50'>#39a5d8</div>
                            </div>
                            <div className='bg-grey rounded-lg p-4 text-center text-white shadow-sm'>
                                <div className='mb-2 text-sm font-medium'>Grey</div>
                                <div className='text-xs opacity-75'>bg-grey / text-grey</div>
                                <div className='text-xs opacity-50'>#101828</div>
                            </div>
                        </div>
                    </div>

                    {/* Color Usage Examples */}
                    <div>
                        <h3 className='text-tx-primary mb-4 text-lg font-medium'>Color Usage Examples</h3>
                        <div className='space-y-4'>
                            <div className='bg-secondary border-border rounded-lg border p-4'>
                                <h4 className='text-tx-primary mb-3 font-semibold'>Common Color Combinations</h4>
                                <div className='grid gap-3 md:grid-cols-2'>
                                    <div className='bg-accent/20 text-accent rounded p-3 text-sm'>
                                        Accent text on accent background (20% opacity)
                                    </div>
                                    <div className='bg-blue/20 text-blue rounded p-3 text-sm'>
                                        Blue text on blue background (20% opacity)
                                    </div>
                                    <div className='bg-green/20 text-green rounded p-3 text-sm'>
                                        Green text on green background (20% opacity)
                                    </div>
                                    <div className='bg-orange/20 text-orange rounded p-3 text-sm'>
                                        Orange text on orange background (20% opacity)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
