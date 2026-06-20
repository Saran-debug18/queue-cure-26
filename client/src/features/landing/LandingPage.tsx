import { motion } from 'framer-motion';
import { useQueueStore } from '../../store/queueStore';
import { ConnectionStatus } from '../../components/ui/ConnectionStatus';

interface Props {
  onSelect: (view: 'receptionist' | 'waiting-room' | 'diagram') => void;
}

const ROLES = [
  {
    id: 'receptionist' as const,
    icon: '🏥',
    title: 'Receptionist',
    subtitle: 'Manage the queue',
    description: 'Add patients, call tokens, handle emergencies, assign doctors, and track the full queue in real time.',
    color: '#0DB9D7',
    glow: 'rgba(13,185,215,0.15)',
    border: 'rgba(13,185,215,0.3)',
    hint: 'For clinic front desk staff',
  },
  {
    id: 'waiting-room' as const,
    icon: '📺',
    title: 'Waiting Room Display',
    subtitle: 'Patient-facing screen',
    description: 'Shows the current token being served, queue positions, and estimated wait times. Designed for a wall TV.',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.3)',
    hint: 'Open on the waiting room TV',
  },
];

export function LandingPage({ onSelect }: Props) {
  const stats = useQueueStore(s => s.stats);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: '#04080F' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(13,185,215,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(13,185,215,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top bar */}
      <div className="fixed top-5 right-5">
        <ConnectionStatus />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Logo + title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
            style={{ background: 'rgba(13,185,215,0.1)', border: '1px solid rgba(13,185,215,0.2)' }}
          >
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <rect x="14" y="4" width="4" height="24" rx="2" fill="#0DB9D7" />
              <rect x="4" y="14" width="24" height="4" rx="2" fill="#0DB9D7" />
            </svg>
          </motion.div>

          <h1 className="text-4xl font-black tracking-tight" style={{ color: '#E8EDF5' }}>
            Queue Cure
            <span className="text-lg font-bold ml-2 px-2 py-0.5 rounded-lg align-middle" style={{ background: 'rgba(13,185,215,0.1)', color: '#0DB9D7', border: '1px solid rgba(13,185,215,0.2)' }}>
              '26
            </span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6B7FA3' }}>
            Real-time clinic queue management — no more paper slips
          </p>

          {/* Live stats pill */}
          {stats.totalWaiting > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(13,185,215,0.08)', border: '1px solid rgba(13,185,215,0.2)', color: '#0DB9D7' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {stats.totalWaiting} patient{stats.totalWaiting !== 1 ? 's' : ''} currently waiting
            </motion.div>
          )}
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {ROLES.map((role, i) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(role.id)}
              className="text-left p-6 rounded-2xl transition-all duration-200 group"
              style={{
                background: '#080F1D',
                border: `1px solid #162035`,
                boxShadow: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${role.border}`;
                e.currentTarget.style.boxShadow = `0 0 40px ${role.glow}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid #162035';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="text-4xl mb-4">{role.icon}</div>
              <h2 className="text-lg font-bold mb-0.5" style={{ color: '#E8EDF5' }}>{role.title}</h2>
              <p className="text-xs font-medium mb-3" style={{ color: role.color }}>{role.subtitle}</p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B7FA3' }}>{role.description}</p>
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: role.glow, color: role.color, border: `1px solid ${role.border}` }}
              >
                <span>Open →</span>
              </div>
              <p className="text-[10px] mt-3" style={{ color: '#3C4F6E' }}>{role.hint}</p>
            </motion.button>
          ))}
        </div>

        {/* Diagram link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => onSelect('diagram')}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            border: '1px solid #162035',
            color: '#3C4F6E',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#8C9BBB'; e.currentTarget.style.borderColor = '#1E3050'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3C4F6E'; e.currentTarget.style.borderColor = '#162035'; }}
        >
          🔌 Socket Event Diagram — for hackathon judges
        </motion.button>

        <p className="text-center text-[10px] mt-6" style={{ color: '#1E3050' }}>
          Queue Cure '26 · Wooble Hackathon Submission
        </p>
      </motion.div>
    </div>
  );
}
