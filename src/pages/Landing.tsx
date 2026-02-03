import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowRight, Box, Cpu, Activity, Share2, Layers,
    Zap, Brain, Network, MousePointerClick, ChevronDown,
    Globe, Shield, PlayCircle
} from 'lucide-react';
import BlochSphere3D from '@/components/core/BlochSphere';
import { Header } from '@/components/layout/Header';

const Landing = () => {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

    // Smooth scroll progress
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Auto-rotation for visual effect
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(prev => ({
                x: prev.x + 0.005,
                y: prev.y + 0.01,
                z: prev.z + 0.002
            }));
        }, 16);
        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-poppins selection:bg-primary/20 overflow-x-hidden">

            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 origin-left z-50"
                style={{ scaleX }}
            />

            <Header />

            {/* Decorative Floating Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[80px] animate-pulse delay-700" />
            </div>

            <main className="container mx-auto px-6 pt-24 lg:pt-32 pb-20">

                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center gap-12 mb-32">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="space-y-8"
                    >
                        <motion.div variants={itemVariants}>
                            <Badge variant="outline" className="px-4 py-2 rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-default backdrop-blur-sm">
                                <Zap className="w-3 h-3 mr-2 animate-bounce" />
                                Now with IBM Quantum Integration
                            </Badge>
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="text-5xl md:text-7xl font-bold font-outfit leading-[1.1] tracking-tight"
                        >
                            Visualize the <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-gradient-x">
                                Quantum Realm
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={itemVariants}
                            className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg"
                        >
                            Dive into the subatomic world. Build circuits, visualize states,
                            and run real experiments on IBM Quantum hardware with our
                            interactive 3D playground.
                        </motion.p>

                        <motion.div
                            variants={itemVariants}
                            className="flex flex-col sm:flex-row gap-4 pt-4"
                        >
                            <Button
                                size="lg"
                                onClick={() => navigate('/workspace')}
                                className="h-14 px-8 text-lg rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                            >
                                Start Experimenting
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="h-14 px-8 text-lg rounded-2xl border-2 hover:bg-muted/50 transition-all duration-300 hover:scale-105"
                            >
                                <PlayCircle className="mr-2 w-5 h-5" />
                                Watch Demo
                            </Button>
                        </motion.div>

                        {/* Stats Section */}
                        <motion.div
                            variants={itemVariants}
                            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border/40 w-full max-w-3xl mx-auto"
                        >
                            <StatItem number="10k+" label="Experiments Run" delay={0} />
                            <StatItem number="50+" label="Quantum Gates" delay={0.1} />
                            <StatItem number="99%" label="Visualization Accuracy" delay={0.2} />
                        </motion.div>
                    </motion.div>

                    {/* 3D Visual Hero REMOVED as per user request */}
                    <div className="hidden lg:block"></div>
                </div>

                {/* Features Scroll Section */}
                <div id="features" className="relative py-24">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-4 py-1.5 text-sm font-medium rounded-full">
                            Features
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold font-outfit">
                            Everything needed to master <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                Quantum Mechanics
                            </span>
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            Powerful tools designed for researchers, students, and enthusiasts alike.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={index}
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                                color={feature.color}
                                delay={index * 0.1}
                            />
                        ))}
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-20 relative rounded-3xl overflow-hidden p-12 text-center bg-gradient-sphere">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold text-white font-outfit">
                            Ready to explore the unknown?
                        </h2>
                        <p className="text-white/80 text-lg max-w-2xl mx-auto">
                            Join thousands of others visualizing the future of computing today.
                            No account required to start simulating.
                        </p>
                        <Button
                            className="h-14 px-10 rounded-full bg-white text-purple-600 hover:bg-white/90 font-semibold text-lg hover:scale-105 transition-all shadow-xl"
                            onClick={() => navigate('/workspace')}
                        >
                            Launch Workspace
                        </Button>
                    </div>
                </div>
            </main>

            <footer className="border-t border-border/40 bg-muted/30">
                <div className="container mx-auto px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-80">
                        <Box className="w-6 h-6 text-primary" />
                        <span className="font-bold font-outfit text-xl">BlochVerse</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        © {new Date().getFullYear()} Quantum State Visualizer. Crafted with <span className="text-red-400">❤</span> for science.
                    </p>
                </div>
            </footer>
        </div>
    );
};

const StatItem = ({ number, label, delay }: { number: string; label: string; delay: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="text-center"
    >
        <div className="text-3xl font-bold font-outfit text-foreground mb-1">{number}</div>
        <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
);

const FloatingCard = ({ icon, text, className, delay }: { icon: React.ReactNode; text: string; className: string; delay: number }) => (
    <motion.div
        className={`bg-card/80 backdrop-blur-md border border-border/50 p-4 rounded-xl shadow-lg flex items-center gap-3 ${className}`}
        animate={{
            y: [0, -10, 0],
        }}
        transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay
        }}
    >
        <div className="p-2 bg-background rounded-lg shadow-sm">
            {icon}
        </div>
        <span className="font-medium text-sm text-foreground pr-2">{text}</span>
    </motion.div>
);

const FeatureCard = ({ icon, title, description, color, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        whileHover={{ y: -5 }}
    >
        <Card className="h-full border-transparent bg-white/50 hover:bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 backdrop-blur-xl group overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${color}`} />
            <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    <div className="text-white">
                        {React.cloneElement(icon, { className: "w-7 h-7" })}
                    </div>
                </div>
                <h3 className="text-xl font-bold mb-3 font-outfit group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </CardContent>
        </Card>
    </motion.div>
);

const features = [
    {
        icon: <Box />,
        title: "3D Bloch Sphere",
        description: "Interactive real-time visualization of single-qubit states with full 360° rotation and phase indicators.",
        color: "from-cyan-400 to-blue-500"
    },
    {
        icon: <Cpu />,
        title: "Circuit Builder",
        description: "Professional drag-and-drop interface. Build, edit, and test quantum circuits with immediate feedback.",
        color: "from-purple-400 to-indigo-500"
    },
    {
        icon: <Activity />,
        title: "Live Simulation",
        description: "High-performance simulation engine for testing algorithms before running on actual hardware.",
        color: "from-pink-400 to-rose-500"
    },
    {
        icon: <Globe />,
        title: "IBM Integration",
        description: "Connect directly to IBM Quantum Experience to run your circuits on real quantum computers.",
        color: "from-blue-400 to-cyan-500"
    },
    {
        icon: <Share2 />,
        title: "Collaboration",
        description: "Export your experiments to QASM, share via unique links, or generate report-ready visualizations.",
        color: "from-violet-400 to-purple-500"
    },
    {
        icon: <Brain />,
        title: "AI Assistant",
        description: "Smart debugging suggestions and circuit optimization tips powered by advanced AI models.",
        color: "from-fuchsia-400 to-pink-500"
    }
];

export default Landing;
