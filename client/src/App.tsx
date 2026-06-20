import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useSocket } from './hooks/useSocket';
import { LandingPage } from './features/landing/LandingPage';
import { ReceptionistDashboard } from './features/receptionist/ReceptionistDashboard';
import { WaitingRoom } from './features/waiting-room/WaitingRoom';
import { SocketDiagram } from './features/docs/SocketDiagram';

type View = 'landing' | 'receptionist' | 'waiting-room' | 'diagram';

function hashToView(hash: string): View {
  if (hash === 'receptionist') return 'receptionist';
  if (hash === 'waiting') return 'waiting-room';
  if (hash === 'diagram') return 'diagram';
  return 'landing';
}

export default function App() {
  useSocket();

  const [view, setView] = useState<View>(() => hashToView(window.location.hash.slice(1)));

  function go(v: View) {
    setView(v);
    const hash = v === 'receptionist' ? 'receptionist' : v === 'waiting-room' ? 'waiting' : v === 'diagram' ? 'diagram' : '';
    window.location.hash = hash;
  }

  return (
    <>
      {view === 'landing'      && <LandingPage onSelect={go} />}
      {view === 'receptionist' && <ReceptionistDashboard onBack={() => go('landing')} />}
      {view === 'waiting-room' && <WaitingRoom onBack={() => go('landing')} />}
      {view === 'diagram'      && <SocketDiagram onBack={() => go('landing')} />}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#0C1525',
            color: '#E8EDF5',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: 'Inter, sans-serif',
            border: '1px solid #162035',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#020F18' } },
          error:   { iconTheme: { primary: '#F43F5E', secondary: '#fff' } },
        }}
      />
    </>
  );
}
