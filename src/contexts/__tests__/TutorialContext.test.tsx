import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TutorialProvider, useTutorial, LearningGoal, CircuitState } from '../TutorialContext';
import React from 'react';

// Mock goal
const mockGoal: LearningGoal = {
    id: 'test_goal',
    title: 'Test Goal',
    description: 'Testing',
    difficulty: 'beginner',
    estimatedTime: 10,
    prerequisites: [],
    topics: ['Test'],
    steps: [
        {
            id: 'step1',
            title: 'Step 1',
            description: 'Step 1 desc',
            instruction: 'Go to circuit tab',
            expectedAction: {
                type: 'switch_tab',
                tab: 'circuit'
            },
            hints: ['Hint 1'],
            successMessage: 'Step 1 done'
        },
        {
            id: 'step2',
            title: 'Step 2',
            description: 'Step 2 desc',
            instruction: 'Add H gate',
            expectedAction: {
                type: 'add_gate',
                gate: { name: 'H', qubits: [0] }
            },
            hints: ['Hint 2'],
            successMessage: 'Step 2 done'
        }
    ]
};

describe('TutorialContext', () => {
    it('should start a session correctly', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <TutorialProvider>{children}</TutorialProvider>
        );
        const { result } = renderHook(() => useTutorial(), { wrapper });

        act(() => {
            result.current.startSession(mockGoal);
        });

        expect(result.current.session).not.toBeNull();
        expect(result.current.session?.goalId).toBe('test_goal');
        expect(result.current.session?.currentStepIndex).toBe(0);
        expect(result.current.session?.isActive).toBe(true);
        expect(result.current.selectedGoal).toEqual(mockGoal);
    });

    it('should auto-complete step 1 when conditions are met', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <TutorialProvider>{children}</TutorialProvider>
        );
        const { result } = renderHook(() => useTutorial(), { wrapper });

        act(() => {
            result.current.startSession(mockGoal);
        });

        // Simulate circuit state update that satisfies step 1
        act(() => {
            // @ts-ignore
            result.current.updateCircuitState({
                activeTab: 'circuit',
                currentCircuit: { gates: [] },
                simulationResults: null
            } as CircuitState);
        });

        expect(result.current.session?.completedSteps).toContain('step1');
        expect(result.current.session?.currentStepIndex).toBe(1); // Should advance to next step
        // The feedback immediately updates to the next step's instruction
        expect(result.current.activeFeedback).toBe('Add H gate');
    });

    it('should auto-complete step 2 when gate is added', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <TutorialProvider>{children}</TutorialProvider>
        );
        const { result } = renderHook(() => useTutorial(), { wrapper });

        act(() => {
            result.current.startSession(mockGoal);
        });

        // Complete step 1 first
        act(() => {
            // @ts-ignore
            result.current.updateCircuitState({
                activeTab: 'circuit',
                currentCircuit: { gates: [] },
                simulationResults: null
            } as CircuitState);
        });

        // Now complete step 2
        act(() => {
            // @ts-ignore
            result.current.updateCircuitState({
                activeTab: 'circuit',
                currentCircuit: {
                    gates: [{ name: 'H', qubits: [0] }]
                },
                simulationResults: null
            } as CircuitState);
        });

        expect(result.current.session?.completedSteps).toContain('step2');
        // Since it's the last step, index stays at last step (or handled by logic)
        expect(result.current.session?.currentStepIndex).toBe(1);
    });
});
