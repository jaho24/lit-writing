export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Zotero-style academic palette
        zotero: {
          blue: '#2D6DA4',
          'blue-light': '#e8f0fe',
          'blue-hover': '#1E5A87',
          toolbar: '#f5f5f5',
          panel: '#ffffff',
          sidebar: '#fafafa',
          star: '#FF9800',
          text: '#1a1a1a',
          'text-secondary': '#666666',
          'text-tertiary': '#999999',
          border: '#e0e0e0',
          'border-light': '#ebebeb',
          'hover-bg': '#f0f0f0',
          'selected-bg': '#e8f0fe',
          separator: '#d4d4d4',
        },
        // Keep primary for backward compat (mapped to zotero blue)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2D6DA4',
          600: '#1E5A87',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sidebar: '#fafafa',
        panel: '#ffffff',
      },
      fontSize: {
        'acad': '13px',
        'acad-sm': '12px',
        'acad-xs': '11px',
        'toolbar': '12px',
      },
    },
  },
  plugins: [],
};