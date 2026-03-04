import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0a0a0f',
        'bg-surface': '#12121a',
        'bg-elevated': '#1a1a28',
        border: '#2a2a3d',
        'accent-primary': '#00d4ff',
        'accent-secondary': '#7c3aed',
        'accent-success': '#10b981',
        'accent-warning': '#f59e0b',
        'accent-danger': '#ef4444',
        'text-primary': '#ffffff',
        'text-muted': '#9ca3af',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(0, 212, 255, 0.6)' },
        },
        'scan-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'flow-dots': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 1.5s ease-in-out infinite',
        'flow-dots': 'flow-dots 1s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
