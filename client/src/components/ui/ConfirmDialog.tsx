import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-5"
        style={{
          background: variant === 'danger' ? 'rgba(244,63,94,0.08)' : 'rgba(245,166,35,0.08)',
          border: `1px solid ${variant === 'danger' ? 'rgba(244,63,94,0.2)' : 'rgba(245,166,35,0.2)'}`,
        }}
      >
        <AlertTriangle
          size={18}
          className="flex-shrink-0 mt-0.5"
          style={{ color: variant === 'danger' ? '#F43F5E' : '#F5A623' }}
        />
        <p className="text-sm leading-relaxed" style={{ color: '#8C9BBB' }}>{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn-ghost text-sm py-2 px-4" onClick={onClose}>Cancel</button>
        <button
          className={variant === 'danger' ? 'btn-danger text-sm py-2 px-4' : 'btn-amber text-sm py-2 px-4'}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
