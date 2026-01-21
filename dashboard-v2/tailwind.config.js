/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-red': 'rgb(var(--brand-rgb) / <alpha-value>)',
                'dark-bg': '#0a0a0c',
                'dark-card': '#16161a',
            },
        },
    },
    plugins: [],
}
