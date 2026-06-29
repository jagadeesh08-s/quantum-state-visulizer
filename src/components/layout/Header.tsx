import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, CircuitBoard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/general/ThemeToggle';
import CompactCache from '@/components/general/CompactCache';
import { useAuth } from '@/contexts/AuthContext';
import { useIBMQuantum } from '@/contexts/IBMQuantumContext';
import { IBMQuantumConnection } from '@/components/tools/IBMQuantumConnection';
import { Cpu, Zap } from 'lucide-react';

interface HeaderProps {
    // Add props if needed
}

export const Header: React.FC<HeaderProps> = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { isAuthenticated: isSimulatorReady } = useIBMQuantum();
    const [isIBMModalOpen, setIsIBMModalOpen] = React.useState(false);

    return (
        <>
            <motion.header
                className="relative z-50 border-b border-border bg-card shadow-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >

                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/')}
                                    className="group relative overflow-hidden rounded-md px-4 py-2 transition-all duration-200 hover:bg-muted"
                                >
                                    <Home className="w-5 h-5 mr-2 text-primary" />
                                    <span className="font-medium text-foreground">
                                        Home
                                    </span>
                                </Button>
                            </motion.div>

                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center border border-primary/20">
                                        <CircuitBoard className="w-6 h-6 text-primary" />
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <h1 className="text-xl font-bold text-foreground">
                                        Quantum State Visualizer
                                    </h1>
                                    <p className="text-sm text-muted-foreground font-medium">
                                        Interactive Quantum Circuit Simulator
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">

                            {/* Simulator Settings */}
                            <div className="hidden lg:flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsIBMModalOpen(true)}
                                    className="rounded-md px-4 py-2 border border-border hover:bg-muted transition-colors duration-200"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium text-foreground">
                                            Simulator Settings
                                        </span>
                                    </div>
                                </Button>
                            </div>

                            {/* Cache Manager */}
                            <CompactCache />

                            {/* Theme Toggle */}
                            <ThemeToggle />

                        </div>
                    </div>
                </div>
            </motion.header>

            <IBMQuantumConnection
                isOpen={isIBMModalOpen}
                onClose={() => setIsIBMModalOpen(false)}
            />
        </>
    );
};
