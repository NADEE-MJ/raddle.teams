import { useState } from 'react';
import {
    Alert,
    Button,
    Card,
    CopyableCode,
    ErrorMessage,
    LoadingSpinner,
    Modal,
    Select,
    StatusIndicator,
    TextInput,
} from '@/components';

export default function ComponentShowcasePage() {
    const [textInputValue, setTextInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [buttonLoading, setButtonLoading] = useState(false);

    const handleButtonLoadingTest = () => {
        setButtonLoading(true);
        setTimeout(() => setButtonLoading(false), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-12">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-tx-primary mb-4">Component Showcase</h1>
            </div>

            {/* Alert Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">Alert</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Alert variant="error">Error: Something went wrong!</Alert>
                    <Alert variant="warning">Warning: Please check your input.</Alert>
                    <Alert variant="info">Info: This is an informational message.</Alert>
                    <Alert variant="success">Success: Operation completed successfully!</Alert>
                </div>
            </section>

            {/* Button Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">Button</h2>

                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium text-tx-primary mb-3">Variants</h3>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="primary">Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="link">Link</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-tx-primary mb-3">Sizes</h3>
                        <div className="flex flex-wrap gap-3 items-center">
                            <Button size="sm">Small</Button>
                            <Button size="md">Medium</Button>
                            <Button size="lg">Large</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-tx-primary mb-3">States</h3>
                        <div className="flex flex-wrap gap-3">
                            <Button disabled>Disabled</Button>
                            <Button loading={buttonLoading} onClick={handleButtonLoadingTest}>
                                {buttonLoading ? 'Loading...' : 'Click for Loading'}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Card Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">Card</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card variant="default">
                        <h3 className="font-semibold text-tx-primary mb-2">Default Card</h3>
                        <p className="text-tx-secondary">This is a default card with standard styling.</p>
                    </Card>

                    <Card variant="warning">
                        <h3 className="font-semibold text-orange mb-2">Warning Card</h3>
                        <p className="text-tx-secondary">This is a warning card with orange styling.</p>
                    </Card>

                    <Card variant="info">
                        <h3 className="font-semibold text-tx-primary mb-2">Info Card</h3>
                        <p className="text-tx-secondary">This is an info card with standard styling.</p>
                    </Card>

                    <Card variant="clickable" onClick={() => console.log('Card clicked!')}>
                        <h3 className="font-semibold text-tx-primary mb-2">Clickable Card</h3>
                        <p className="text-tx-secondary">This card is clickable and has hover effects.</p>
                        <span className="text-tx-muted text-xs">Click me →</span>
                    </Card>
                </div>
            </section>

            {/* TextInput Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">TextInput</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <TextInput
                            label="Basic Input"
                            value={textInputValue}
                            onChange={setTextInputValue}
                            placeholder="Enter some text..."
                        />

                        <TextInput
                            label="Required Input"
                            value=""
                            onChange={() => { }}
                            placeholder="This field is required"
                            required
                        />

                        <TextInput
                            label="Password Input"
                            type="password"
                            value=""
                            onChange={() => { }}
                            placeholder="Enter password"
                        />
                    </div>

                    <div className="space-y-4">
                        <TextInput
                            label="Email Input"
                            type="email"
                            value=""
                            onChange={() => { }}
                            placeholder="Enter email"
                        />

                        <TextInput
                            label="Number Input"
                            type="number"
                            value=""
                            onChange={() => { }}
                            placeholder="Enter number"
                            maxLength={10}
                        />

                        <TextInput
                            label="Disabled Input"
                            value="Cannot edit this"
                            onChange={() => { }}
                            disabled
                        />

                        <TextInput
                            label="Input with Error"
                            value=""
                            onChange={() => { }}
                            placeholder="This has an error"
                            error="This field is required"
                        />
                    </div>
                </div>
            </section>

            {/* Select Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">Select</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <Select
                            label="Basic Select"
                            value={selectValue}
                            onChange={(value) => setSelectValue(String(value))}
                            placeholder="Choose an option..."
                            options={[
                                { value: 'option1', label: 'Option 1' },
                                { value: 'option2', label: 'Option 2' },
                                { value: 'option3', label: 'Option 3' },
                            ]}
                        />

                        <Select
                            label="Required Select"
                            value=""
                            onChange={() => { }}
                            placeholder="Select required option"
                            required
                            options={[
                                { value: 'a', label: 'Choice A' },
                                { value: 'b', label: 'Choice B' },
                            ]}
                        />
                    </div>

                    <div className="space-y-4">
                        <Select
                            label="Disabled Select"
                            value="disabled"
                            onChange={() => { }}
                            disabled
                            options={[
                                { value: 'disabled', label: 'Cannot change this' },
                            ]}
                        />

                        <Select
                            label="Number Options"
                            value={1}
                            onChange={() => { }}
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
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">Other Components</h2>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <h3 className="font-semibold text-tx-primary mb-3">LoadingSpinner</h3>
                        <div className="flex justify-center py-4">
                            <LoadingSpinner />
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold text-tx-primary mb-3">StatusIndicator</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <StatusIndicator isConnected={true} />
                                <span className="text-tx-secondary">Connected</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusIndicator isConnected={false} />
                                <span className="text-tx-secondary">Disconnected</span>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold text-tx-primary mb-3">CopyableCode</h3>
                        <div className="space-y-2">
                            <CopyableCode code="ABC123" />
                            <CopyableCode code="DEFGHI" className="text-sm" />
                        </div>
                    </Card>
                </div>
            </section>

            {/* ErrorMessage Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">ErrorMessage</h2>
                <div className="space-y-4">
                    <ErrorMessage message="This is an error message" />
                    <ErrorMessage message="Another error occurred while processing your request. Please try again later." />
                    <ErrorMessage message="" /> {/* Should not display anything */}
                </div>
            </section>

            {/* Modal Component */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-tx-primary border-b border-border pb-2">Modal</h2>
                <div>
                    <Button onClick={() => setShowModal(true)}>Open Modal</Button>

                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        maxWidth="max-w-md"
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-tx-primary mb-4">Modal Example</h3>
                            <p className="text-tx-secondary mb-4">
                                This is a modal dialog. You can put any content here.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => setShowModal(false)}>
                                    OK
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </section>
        </div>
    );
}