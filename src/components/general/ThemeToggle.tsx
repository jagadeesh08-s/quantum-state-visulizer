import React from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import { useTheme, Theme } from '@/components/general/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const getIcon = (themeName: Theme) => {
    switch (themeName) {
      case 'quantum-light':
        return <Sun className="h-4 w-4" />;
      case 'quantum-dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      case 'cosmic':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const themes: { value: Theme; label: string }[] = [
    { value: 'quantum-dark', label: 'Quantum Dark' },
    { value: 'quantum-light', label: 'Quantum Light' },
    { value: 'system', label: 'System' },
    { value: 'cosmic', label: 'Cosmic' },
  ];

  return (
    <Select value={theme} onValueChange={(value: Theme) => setTheme(value)}>
      <SelectTrigger className="w-32 h-8 border border-primary/20 hover:bg-primary/10 transition-colors relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {getIcon(theme)}
          </motion.div>
          <span className="text-sm truncate">
            {themes.find(t => t.value === theme)?.label || 'Theme'}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent className="z-50">
        {themes.map((themeOption) => (
          <SelectItem key={themeOption.value} value={themeOption.value}>
            <div className="flex items-center gap-2">
              {getIcon(themeOption.value)}
              <span className="truncate">{themeOption.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ThemeToggle;
