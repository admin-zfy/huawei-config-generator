/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        huawei: {
          bg: '#0a0a0f',
          card: '#12121a',
          panel: '#1a1a2e',
          border: '#2a2a4a',
          accent: '#e60012',
          'accent-hover': '#ff1a2e',
          primary: '#00b4d8',
          'primary-dark': '#0077b6',
          success: '#06d6a0',
          warning: '#ffd166',
          danger: '#ef476f',
          text: '#e0e0e0',
          'text-dim': '#8888aa',
          'text-bright': '#ffffff',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.4s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 180, 216, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 180, 216, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
      },
      boxShadow: {
        huawei: '0 0 15px rgba(0, 180, 216, 0.1)',
        'huawei-lg': '0 0 30px rgba(0, 180, 216, 0.15)',
        neon: '0 0 20px rgba(0, 180, 216, 0.3), inset 0 0 5px rgba(0, 180, 216, 0.05)',
      },
    },
  },
  plugins: [],
};
