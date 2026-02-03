import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import BlochSphere3D, { BlochProbabilities } from '../core/BlochSphere';
import type { DensityMatrix } from '@/utils/quantum/quantumSimulation';

interface BlochSphereModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: DensityMatrix[];
  mapVector: (vector: { x: number; y: number; z: number }) => { x: number; y: number; z: number };
}

const BlochSphereModal: React.FC<BlochSphereModalProps> = ({
  isOpen,
  onClose,
  results,
  mapVector
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-auto bg-slate-900/95 backdrop-blur-xl border-slate-700/50 shadow-2xl">
            <DialogHeader className="border-b border-slate-700/50 pb-4">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent text-center">
                Quantum Bloch Sphere Visualizer
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {/* Responsive Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.1,
                      ease: "easeOut"
                    }}
                    className="flex flex-col space-y-4"
                  >
                    {/* Title Label */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg px-4 py-2 border border-cyan-500/30">
                        Qubit {index}
                      </h3>
                    </div>

                    {/* Bloch Sphere Container */}
                    <div className="flex-1 flex items-center justify-center min-h-[300px] bg-gray-900/80 border border-border/30 rounded-xl backdrop-blur-sm p-4 shadow-lg">
                      <div className="w-full h-full max-w-[280px] mx-auto">
                        <BlochSphere3D
                          vector={mapVector(result.blochVector)}
                          purity={result.purity}
                          className="w-full h-full"
                          size={280}
                        />
                      </div>
                    </div>

                    {/* Data Card */}
                    <Card className="bg-slate-800/60 border-slate-600/30 backdrop-blur-sm shadow-lg">
                      <CardContent className="p-4 space-y-3">
                        {/* Vector Display */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Vector</span>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/20">
                            <div className="font-mono text-sm text-cyan-200 text-center">
                              ({result.blochVector.x.toFixed(3)}, {result.blochVector.y.toFixed(3)}, {result.blochVector.z.toFixed(3)})
                            </div>
                          </div>
                        </div>

                        {/* Purity Display */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-green-300 uppercase tracking-wide">Purity</span>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/20">
                            <div className="text-center">
                              <div className="text-xl font-bold text-green-400">
                                {result.purity?.toFixed(4) || '1.0000'}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {result.purity === 1 ? 'Pure State' : 'Mixed State'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Measurement Probabilities */}
                        <div className="pt-2 border-t border-slate-700/50">
                          <BlochProbabilities
                            vector={mapVector(result.blochVector)}
                            isDark={true}
                            className="bg-slate-900/50 border-slate-600/20"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Empty State */}
              {results.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-lg">
                    No quantum states to visualize
                  </div>
                  <div className="text-slate-500 text-sm mt-2">
                    Run a simulation to see Bloch sphere representations
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default BlochSphereModal;