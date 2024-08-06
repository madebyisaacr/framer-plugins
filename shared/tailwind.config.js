/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./**/*.{js,jsx,ts,tsx}", "../../shared/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {},
		backgroundColor: {
			primary: "var(--framer-color-bg)",
			secondary: "var(--color-bg-secondary)",
			tertiary: "var(--color-bg-tertiary)",
			divider: "var(--framer-color-divider)",
			"divider-secondary": "var(--color-divider-secondary)",
			tint: "var(--framer-color-tint)",
			"tint-dimmed": "var(--framer-color-tint-dimmed)",
			"tint-dark": "var(--framer-color-tint-dark)",
			"segmented-control": "var(--color-segmented-control)",
			"modal": "var(--color-bg-modal)",
			transparent: "transparent",
		},
		colors: {
			primary: "var(--framer-color-text)",
			secondary: "var(--framer-color-text-secondary)",
			tertiary: "var(--framer-color-text-tertiary)",
			inverted: "var(--framer-color-text-inverted)",
			tint: "var(--framer-color-tint)",
		},
		borderColor: {
			divider: "var(--framer-color-divider)",
			"divider-secondary": "var(--color-divider-secondary)",
			tint: "var(--framer-color-tint)",
		},
		spacing: {
			0: "0",
			0.5: "2px",
			1: "5px",
			1.5: "8px",
			2: "10px",
			2.5: "12px",
			3: "15px",
			3.5: "18px",
			4: "20px",
			4.5: "22px",
			5: "25px",
			5.5: "28px",
			6: "30px",
			7: "35px",
			8: "40px",
			9: "45px",
			10: "50px",
		},
		borderRadius: {
			none: "0",
			DEFAULT: "8px",
			sm: "5px",
			lg: "10px",
			xl: "15px",
			full: "1000px",
		},
	},
	plugins: [],
};
