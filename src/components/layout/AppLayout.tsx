import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';

interface AppLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, className = "" }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={containerRef} className={`min-h-screen flex flex-col bg-background ${className} relative`}>
            {/* Background gradients */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

            {/* Global Shared 3D Canvas */}
            <Canvas
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 50
                }}
                eventSource={containerRef as React.MutableRefObject<HTMLElement>}
                className="pointer-events-none"
            >
                <View.Port />
            </Canvas>

            <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden z-10 relative">
                {/* Added overflow-hidden to prevent horizontal scrollbars from negative margins or wide elements */}
                {children}
            </main>
        </div>
    );
};
