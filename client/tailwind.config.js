/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#04080F',
        surface:  '#080F1D',
        raised:   '#0C1525',
        border:   '#162035',
        'border-hi': '#1E3050',
        teal:     '#0DB9D7',
        'teal-dim': '#065368',
        amber:    '#F5A623',
        rose:     '#F43F5E',
        emerald:  '#10B981',
        'text-base': '#E8EDF5',
        'text-soft': '#8C9BBB',
        'text-dim':  '#3C4F6E',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        teal:  '0 0 30px rgba(13,185,215,0.3)',
        amber: '0 0 30px rgba(245,166,35,0.2)',
        deep:  '0 8px 32px rgba(0,0,0,0.7)',
      },
      backgroundImage: {
        'teal-gradient': 'linear-gradient(135deg, #065368 0%, #0C1525 60%, #04080F 100%)',
        'card-gradient': 'linear-gradient(145deg, #0C1525 0%, #080F1D 100%)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};
