
import { Theme } from '@/components/general/ThemeProvider';

export interface ThemeLayoutConfig {
    circuitBuilderColSpan: string;
    analysisColSpan: string;
    orderReversed: boolean;
    isVertical: boolean;
    containerClass?: string;
    circuitBuilderClass?: string;
    analysisClass?: string;
}

export const themeLayouts: Record<Theme, ThemeLayoutConfig> = {
    'quantum-dark': {
        circuitBuilderColSpan: 'xl:col-span-7',
        analysisColSpan: 'xl:col-span-5',
        orderReversed: false,
        isVertical: false,
        containerClass: 'gap-4',
    },
    'quantum-light': {
        circuitBuilderColSpan: 'xl:col-span-7',
        analysisColSpan: 'xl:col-span-5',
        orderReversed: false,
        isVertical: false,
        containerClass: 'gap-4',
    },
    system: {
        circuitBuilderColSpan: 'xl:col-span-7',
        analysisColSpan: 'xl:col-span-5',
        orderReversed: false,
        isVertical: false,
        containerClass: 'gap-4',
    },
    cosmic: {
        circuitBuilderColSpan: 'xl:col-span-7',
        analysisColSpan: 'xl:col-span-5',
        orderReversed: false,
        isVertical: false,
        containerClass: 'gap-6',
    },
};
