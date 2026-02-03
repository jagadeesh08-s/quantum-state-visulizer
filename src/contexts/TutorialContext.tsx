import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface LearningStep {
    id: string;
    title: string;
    description: string;
    instruction: string;
    expectedAction: {
        type: 'switch_tab' | 'add_gate' | 'run_simulation' | 'check_result';
        tab?: string;
        gate?: {
            name: string;
            qubits: number[];
            parameters?: number[];
        };
        resultCheck?: {
            expectedProbabilities?: number[];
            expectedEntanglement?: boolean;
        };
    };
    hints: string[];
    successMessage: string;
}

export interface LearningGoal {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number;
    prerequisites: string[];
    topics: string[];
    steps: LearningStep[];
}

interface InteractiveSession {
    goalId: string;
    currentStepIndex: number;
    completedSteps: string[];
    isActive: boolean;
}

export interface CircuitState {
    currentCircuit: any;
    simulationResults: any;
    activeTab: string;
}

interface TutorialContextType {
    session: InteractiveSession | null;
    selectedGoal: LearningGoal | null;
    startSession: (goal: LearningGoal) => void;
    endSession: () => void;
    completeStep: () => void;
    activeFeedback: string;
    setFeedback: (feedback: string) => void;
    updateCircuitState: (state: CircuitState) => void;
    circuitState: CircuitState | null;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<InteractiveSession | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<LearningGoal | null>(null);
    const [activeFeedback, setActiveFeedback] = useState<string>('');
    const [circuitState, setCircuitState] = useState<CircuitState | null>(null);

    const startSession = useCallback((goal: LearningGoal) => {
        setSelectedGoal(goal);
        setSession({
            goalId: goal.id,
            currentStepIndex: 0,
            completedSteps: [],
            isActive: true,
        });
        setActiveFeedback('');
    }, []);

    const endSession = useCallback(() => {
        setSession(null);
        setSelectedGoal(null);
        setActiveFeedback('');
    }, []);

    const completeStep = useCallback(() => {
        if (!session || !selectedGoal) return;

        const isLastStep = session.currentStepIndex >= selectedGoal.steps.length - 1;
        const currentStep = selectedGoal.steps[session.currentStepIndex];

        setSession(prev => prev ? {
            ...prev,
            completedSteps: [...prev.completedSteps, currentStep.id],
            currentStepIndex: isLastStep ? prev.currentStepIndex : prev.currentStepIndex + 1
        } : null);

        setActiveFeedback(currentStep.successMessage);

        if (isLastStep) {
            setTimeout(() => endSession(), 3000);
        }
    }, [session, selectedGoal, endSession]);

    const checkStepCompletion = useCallback((step: LearningStep, state: CircuitState): boolean => {
        switch (step.expectedAction.type) {
            case 'switch_tab':
                return state.activeTab === step.expectedAction.tab;

            case 'add_gate':
                if (!state.currentCircuit?.gates) return false;
                return state.currentCircuit.gates.some((gate: any) =>
                    gate.name === step.expectedAction.gate?.name &&
                    JSON.stringify(gate.qubits) === JSON.stringify(step.expectedAction.gate?.qubits)
                );

            case 'run_simulation':
                return state.simulationResults !== null;

            case 'check_result':
                if (!state.simulationResults) return false;
                if (step.expectedAction.resultCheck?.expectedProbabilities) {
                    const actualProbs = state.simulationResults.probabilities || [];
                    return step.expectedAction.resultCheck.expectedProbabilities.every(
                        (expected, index) => Math.abs(actualProbs[index] - expected) < 0.01
                    );
                }
                return true;

            default:
                return false;
        }
    }, []);

    useEffect(() => {
        if (!session || !selectedGoal || !circuitState) return;

        const currentStep = selectedGoal.steps[session.currentStepIndex];
        if (!currentStep) return;

        const isCompleted = checkStepCompletion(currentStep, circuitState);

        if (isCompleted && !session.completedSteps.includes(currentStep.id)) {
            completeStep();
        } else if (!isCompleted) {
            if (currentStep.expectedAction.type === 'switch_tab' &&
                currentStep.expectedAction.tab &&
                circuitState.activeTab !== currentStep.expectedAction.tab) {
                setActiveFeedback(`Please switch to the ${currentStep.expectedAction.tab} tab to continue.`);
            } else {
                setActiveFeedback(currentStep.instruction);
            }
        }
    }, [circuitState, session, selectedGoal, checkStepCompletion, completeStep]);

    return (
        <TutorialContext.Provider value={{
            session,
            selectedGoal,
            startSession,
            endSession,
            completeStep,
            activeFeedback,
            setFeedback: setActiveFeedback,
            updateCircuitState: setCircuitState,
            circuitState
        }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
