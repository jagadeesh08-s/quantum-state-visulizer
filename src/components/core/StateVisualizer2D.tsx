import React, { useMemo } from 'react';
import { useTheme } from '@/components/general/ThemeProvider';

interface BlochVector {
    x: number;
    y: number;
    z: number;
}

interface StateVisualizer2DProps {
    vector?: BlochVector;
    purity?: number;
    className?: string;
    showAxes?: boolean;
}

const StateVisualizer2D: React.FC<StateVisualizer2DProps> = ({
    vector = { x: 0, y: 0, z: 1 },
    purity = 1,
    className = "",
    showAxes = true
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'quantum-dark' || theme === 'cosmic' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Normalize vector for display
    const displayVector = useMemo(() => {
        const rawLen = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
        if (rawLen < 0.001) return { x: 0, y: 0, z: 0 };
        const scale = rawLen > 1 ? 1 / rawLen : 1;
        return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
    }, [vector.x, vector.y, vector.z]);

    // Project 3D vector onto 2D plane (using x, y for direction and z for color/intensity or inner circle)
    // For standard Bloch sphere 2D projection:
    // We can view it from the top (XY plane) or side. 
    // Let's do a "Phase Disk" where the angle is phase (XY) and radius is magnitude in XY plane.
    // BUT, to show Z (0 vs 1), we often use a side view or just a simple circle with an arrow.
    // Let's stick to a standard Circle representation where:
    // Arrow points in XY direction (Phase)
    // Color/Length represents Z?

    // Actually, a better 2D representation for a qubit often used is a circle where:
    // Top is |0>, Bottom is |1>.
    // This is effectively a projection onto the YZ or XZ plane, or just the standard circle view.
    // Let's do: Up = |0>, Down = |1>, Right = |+i>, Left = |-i> (standard textbook circle notation often used in simplified diagrams)
    // Or simply map:
    // Z axis -> Vertical axis (Up = |0>, Down = |1>)
    // X axis -> Horizontal axis

    const cx = 100;
    const cy = 100;
    const r = 80;

    // Map Z to Y-pixel (flipped because SVG Y is down)
    // z=1 (|0>) -> y = cy - r
    // z=-1 (|1>) -> y = cy + r
    // x=1 (|+>) -> x = cx + r

    // Actually, let's just project the 3D vector directly.
    // View from Front (X-Z plane)?
    // Let's do a "Cross-section" view which is easy to read. 
    // Z is vertical. X is horizontal. Y is depth (faded or indicated by color).

    const endX = cx + displayVector.x * r;
    const endY = cy - displayVector.z * r; // Minus because SVG Y is down

    // Phase color (based on Y)
    const phaseIntensity = (displayVector.y + 1) / 2; // 0 to 1
    const arrowColor = isDark ? `rgba(60, 200, 255, ${0.5 + 0.5 * Math.abs(displayVector.y)})` : `rgba(0, 100, 255, 1)`;

    return (
        <div
            className={`relative rounded-xl overflow-hidden shadow-md border flex items-center justify-center p-4 ${isDark ? 'bg-[#040b19] border-white/10' : 'bg-white border-black/5'} ${className}`}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '200px'
            }}
        >
            <svg width="200" height="200" viewBox="0 0 200 200" className="max-w-full max-h-full">
                {/* Background Circle */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="2" />
                <circle cx={cx} cy={cy} r={r} fill={isDark ? "#1e293b" : "#f1f5f9"} opacity="0.2" />

                {/* Axes */}
                {showAxes && (
                    <>
                        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={isDark ? "#334155" : "#cbd5e1"} strokeDasharray="4 4" />
                        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={isDark ? "#334155" : "#cbd5e1"} strokeDasharray="4 4" />

                        {/* Labels */}
                        <text x={cx} y={cy - r - 10} textAnchor="middle" fill={isDark ? "#94a3b8" : "#475569"} fontSize="12" fontWeight="bold">|0⟩</text>
                        <text x={cx} y={cy + r + 20} textAnchor="middle" fill={isDark ? "#94a3b8" : "#475569"} fontSize="12" fontWeight="bold">|1⟩</text>
                        <text x={cx + r + 15} y={cy + 4} textAnchor="start" fill={isDark ? "#94a3b8" : "#475569"} fontSize="10">|+⟩</text>
                        <text x={cx - r - 15} y={cy + 4} textAnchor="end" fill={isDark ? "#94a3b8" : "#475569"} fontSize="10">|-⟩</text>
                    </>
                )}

                {/* State Vector */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={endX}
                    y2={endY}
                    stroke={arrowColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* Arrow Head */}
                <circle cx={endX} cy={endY} r="6" fill={arrowColor} />
            </svg>

            {/* 2D Badge */}
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800/50 text-[10px] text-slate-400 border border-slate-700">
                2D View
            </div>
        </div>
    );
};

export default StateVisualizer2D;
