/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif:  ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:   ['"Outfit"', 'system-ui', 'sans-serif'],
        mono:   ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        base:    'hsl(var(--bg-base))',
        surface: 'hsl(var(--bg-surface))',
        raised:  'hsl(var(--bg-raised))',
        border:  'hsl(var(--border))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          light:   'hsl(var(--accent-light))',
          muted:   'hsl(var(--accent-muted))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          muted:   'hsl(var(--ink-muted))',
          faint:   'hsl(var(--ink-faint))',
        },
        danger: 'hsl(var(--danger))',
        warn:   'hsl(var(--warn))',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out',
        'blink':   'blink 1s step-end infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
