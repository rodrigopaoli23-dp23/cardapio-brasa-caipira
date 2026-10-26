import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Brasa Caipira inspirada na identidade oficial
        brasa: {
          50: '#fff5f5',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#c21e1e', // Vermelho-brasa oficial do cartaz
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        ouro: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Amarelo caipira oficial
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        folha: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d', // Verde escuro caipira
          950: '#052e16',
        },
        creme: {
          50: '#ffffff',
          100: '#fdfbf7', // Fundo creme oficial
          200: '#f7f2e7',
          300: '#ece3d0',
          400: '#ded0b5',
          500: '#cfbc9a',
        },
      },
    },
  },
  plugins: [],
}

export default config
