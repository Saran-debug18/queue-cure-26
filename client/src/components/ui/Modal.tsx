import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: 'rgba(4,8,15,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`relative w-full ${maxWidth} z-10`}
            style={{
              background: '#080F1D',
              border: '1px solid #162035',
              borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(13,185,215,0.08)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between px-6 py-5"
              style={{ borderBottom: '1px solid #162035' }}
            >
              <div>
                <h2 className="text-base font-bold" style={{ color: '#E8EDF5' }}>{title}</h2>
                {subtitle && <p className="text-xs mt-0.5" style={{ color: '#3C4F6E' }}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#8C9BBB')}
                onMouseLeave={e => (e.currentTarget.style.color = '#3C4F6E')}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
