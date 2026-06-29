import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight, Cpu, Activity, Share2, Layers,
    Zap, Brain, Network, ChevronDown, Shield,
    CircuitBoard, Atom, BarChart3, Code2, Sparkles,
    Play, CheckCircle, Globe, Box
} from 'lucide-react';
import BlochSphere3D from '@/components/core/BlochSphere';
import { Header } from '@/components/layout/Header';

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView) return;
        const startTime = performance.now();
        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [inView, target, duration]);

    return <span ref={ref} className="stat-number">{count.toLocaleString()}{suffix}</span>;
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, color, delay }: {
    icon: React.ElementType; title: string; description: string; color: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass-panel hover:quantum-glow rounded-xl p-6 flex flex-col gap-4 cursor-default transition-all duration-300 group"
        >
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <h3 className="font-semibold text-foreground mb-1.5 text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
}

// ─── Particle Field ────────────────────────────────────────────────────────────
function ParticleField() {
    return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Landing = () => {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.4]);

    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    useEffect(() => {
        const id = setInterval(() => {
            setRotation(p => ({ x: p.x + 0.005, y: p.y + 0.01, z: p.z + 0.002 }));
        }, 16);
        return () => clearInterval(id);
    }, []);

    const FEATURES = [
        { icon: CircuitBoard, title: 'Drag-and-Drop Circuit Builder', description: 'Visually compose quantum circuits with 15+ gates. Real-time state propagation shows the output at every step.', color: 'bg-gradient-to-br from-blue-500 to-blue-600', delay: 0 },
        { icon: Box,          title: '3D Bloch Sphere Visualizer',   description: 'Watch qubits evolve in real-time on an interactive 3D Bloch sphere with precision orbit controls.', color: 'bg-gradient-to-br from-violet-500 to-purple-600', delay: 0.1 },
        { icon: Activity,     title: 'Noise & Error Modeling',        description: 'Simulate T1/T2 decoherence, depolarizing and thermal noise. Apply error mitigation techniques in one click.', color: 'bg-gradient-to-br from-emerald-500 to-teal-600', delay: 0.2 },
        { icon: Brain,        title: 'AI Quantum Tutor',             description: 'Gemini-powered AI assistant explains quantum concepts, debugs circuits, and walks you through algorithms.', color: 'bg-gradient-to-br from-orange-500 to-amber-600', delay: 0.3 },
        { icon: BarChart3,    title: 'Advanced Analytics',           description: 'Entanglement maps, density matrices, Wigner functions, and quantum state fidelity analysis.', color: 'bg-gradient-to-br from-rose-500 to-pink-600', delay: 0.4 },
        { icon: Code2,        title: 'Qiskit Code Editor',           description: 'Write and run Qiskit Python code directly in the browser. Instantly visualize the output state.', color: 'bg-gradient-to-br from-cyan-500 to-sky-600', delay: 0.5 },
        { icon: Zap,          title: 'VQE Playground',               description: 'Explore Variational Quantum Eigensolvers with configurable ansatz and observables in real-time.', color: 'bg-gradient-to-br from-yellow-500 to-orange-500', delay: 0.6 },
        { icon: Shield,       title: 'Local-First Execution',        description: 'All circuits run on the local Qiskit/Aer simulator. No cloud account, no API keys, no data leaves your machine.', color: 'bg-gradient-to-br from-slate-500 to-slate-600', delay: 0.7 },
    ];

    const STATS = [
        { value: 15,    suffix: '+', label: 'Quantum Gates' },
        { value: 100,   suffix: '',  label: 'Max Qubits' },
        { value: 16384, suffix: '',  label: 'Max Shots' },
        { value: 6,     suffix: '+', label: 'Noise Models' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">

            {/* SEO */}
            <title>Quantum State Visualizer — Local Quantum Circuit Simulator</title>

            {/* Scroll Progress */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-secondary origin-left z-50"
                style={{ scaleX }}
            />

            <Header />

            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section className="relative min-h-[calc(100vh-72px)] flex items-center justify-center overflow-hidden">
                <ParticleField />

                <motion.div
                    style={{ y: heroY, opacity: heroOpacity }}
                    className="relative z-10 container mx-auto px-6 pt-16 pb-24"
                >
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left — Copy */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
                            className="space-y-8"
                        >
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                            >
                                <Badge
                                    variant="outline"
                                    className="float-badge gap-2 px-4 py-1.5 border-primary/30 bg-primary/5 text-primary font-medium"
                                    id="hero-badge"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Local Simulator — No Cloud Required
                                </Badge>
                            </motion.div>

                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
                            >
                                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight">
                                    <span className="text-primary">Quantum</span>
                                    <br />
                                    <span className="text-foreground">State Visualizer</span>
                                </h1>
                                <p className="mt-6 text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
                                    Build, simulate, and analyze quantum circuits entirely in your browser.
                                    Interactive 3D visualization, AI assistance, and noise modeling — all local,
                                    all instant.
                                </p>
                            </motion.div>

                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } } }}
                                className="flex flex-wrap gap-4"
                            >
                                <Button
                                    id="hero-launch-btn"
                                    size="lg"
                                    onClick={() => navigate('/workspace')}
                                    className="gap-2.5 px-8 py-6 text-base font-semibold rounded-full shadow-lg hover:quantum-glow transition-all duration-300 bg-primary text-white"
                                >
                                    <Play className="w-5 h-5" />
                                    Launch Workspace
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                                <Button
                                    id="hero-learn-btn"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="gap-2 px-8 py-6 text-base rounded-md border-border hover:bg-muted transition-colors duration-200"
                                >
                                    Explore Features
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </motion.div>

                            {/* Trust signals */}
                            <motion.div
                                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, delay: 0.3 } } }}
                                className="flex flex-wrap gap-6 text-sm text-muted-foreground"
                            >
                                {[
                                    { icon: Shield,  text: 'Local-first — data never leaves your machine' },
                                    { icon: Zap,     text: 'Qiskit/Aer powered' },
                                    { icon: Globe,   text: 'Open source' },
                                ].map(({ icon: Icon, text }) => (
                                    <div key={text} className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Right — Bloch Sphere */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="relative flex items-center justify-center"
                        >
                            <div className="relative w-[450px] h-[450px] rounded-full glass-panel quantum-glow-cyan flex items-center justify-center overflow-hidden p-8 backdrop-blur-2xl">
                                <div className="w-full h-full rounded-full overflow-hidden">
                                    <BlochSphere3D
                                        theta={rotation.x * 20}
                                        phi={rotation.y * 20}
                                        autoRotate={true}
                                        showAxes={true}
                                    />
                                </div>
                            </div>
                            {/* Floating info chips */}
                            {[
                                { label: '|ψ⟩ Superposition', x: '-20%', y: '15%',  delay: 0.8 },
                                { label: 'Entangled',          x: '85%',  y: '65%',  delay: 1.0 },
                                { label: 'Aer Simulator',      x: '-10%', y: '78%',  delay: 1.2 },
                            ].map(({ label, x, y, delay }) => (
                                <motion.div
                                    key={label}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay }}
                                    style={{ position: 'absolute', left: x, top: y }}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary/20 bg-card text-primary whitespace-nowrap float-badge"
                                >
                                    {label}
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Scroll indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 text-xs"
                    >
                        <span>Scroll to explore</span>
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </motion.div>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
            <section className="relative py-16 border-y border-border bg-muted/20 overflow-hidden">
                <div className="data-stream-line" />
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {STATS.map(({ value, suffix, label }) => (
                            <motion.div
                                key={label}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-center"
                            >
                                <p className="text-3xl lg:text-4xl font-bold text-foreground mb-1">
                                    <AnimatedCounter target={value} suffix={suffix} />
                                </p>
                                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────────────────────── */}
            <section id="features" className="py-28 relative">
                <div className="absolute inset-0 quantum-grid-bg opacity-20 pointer-events-none" />
                <div className="container mx-auto px-6 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16 space-y-4"
                    >
                        <Badge variant="outline" className="gap-2 border-accent/30 bg-accent/5 text-accent">
                            <Layers className="w-3.5 h-3.5" />
                            Full Feature Suite
                        </Badge>
                        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                            Everything you need to<br />
                            <span className="text-primary">explore quantum computing</span>
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            A complete quantum development environment — from circuit design to
                            advanced analytics — running entirely on your local machine.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
                    </div>
                </div>
            </section>

            {/* ── CTA ───────────────────────────────────────────────────────────── */}
            <section className="py-28 relative overflow-hidden">
                <div className="absolute inset-0 bg-background" />
                <div className="container mx-auto px-6 relative text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="space-y-6"
                    >
                        <div className="w-20 h-20 mx-auto rounded-md bg-card border border-border flex items-center justify-center">
                            <Atom className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                            Ready to start<br />
                            <span className="text-primary">exploring quantum worlds?</span>
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                            No sign-up. No cloud account. No token required.
                            Just open the workspace and start building.
                        </p>
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Button
                                id="cta-launch-btn"
                                size="lg"
                                onClick={() => navigate('/workspace')}
                                className="gap-3 px-12 py-7 text-lg font-semibold rounded-md shadow-sm hover:bg-primary/90 transition-colors duration-200"
                            >
                                <CircuitBoard className="w-6 h-6" />
                                Open Workspace
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────────────── */}
            <footer className="border-t border-border/30 py-10 text-center text-muted-foreground text-sm">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <CircuitBoard className="w-4 h-4 text-primary" />
                        Quantum State Visualizer
                    </div>
                    <p>Built with Qiskit · React · Three.js · Framer Motion</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-green-600 dark:text-green-400 font-medium">Local Simulator Active</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
