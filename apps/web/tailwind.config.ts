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
        // Cyberpunk theme colors
        cyber: {
          primary: '#00ff9f',
          secondary: '#00b8ff',
          accent: '#ff00ff',
          dark: '#0a0a0f',
          darker: '#050508',
        },
      },
    },
  },
  plugins: [],
}

export default config
