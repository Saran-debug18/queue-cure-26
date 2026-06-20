import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useQueueStore } from '../../store/queueStore';

export function ConnectionStatus() {
  const isConnected = useQueueStore((s) => s.isConnected);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={String(isConnected)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{
          background: isConnected ? 'rgba(13,185,215,0.12)' : 'rgba(244,63,94,0.12)',
          border: `1px solid ${isConnected ? 'rgba(13,185,215,0.3)' : 'rgba(244,63,94,0.3)'}`,
          color: isConnected ? '#0DB9D7' : '#F43F5E',
        }}
      >
        {isConnected ? (
          <Wifi size={12} strokeWidth={2.5} />
        ) : (
          <WifiOff size={12} strokeWidth={2.5} />
        )}
        <span>{isConnected ? 'Live' : 'Reconnecting…'}</span>
        {isConnected && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#0DB9D7' }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
