import { Logo, FramerLogo } from "../assets/AppIcons";

export default function IntegrationGraphic({ integrationId }) {
	return (
		<div
			className="w-full aspect-[1.8] rounded-lg flex-row items-center justify-center gap-3 bg-no-repeat relative"
			style={{
				backgroundImage: "url(/integration-background.svg)",
			}}
		>
			<div className="flex-1 flex-row justify-end">
				<Logo size={50} id={integrationId} />
			</div>
			<svg
				width="45"
				height="45"
				viewBox="0 0 260 260"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M130 71.5012V88.9537C130 93.3408 135.265 95.4858 138.288 92.3658L165.49 65.1637C167.44 63.2137 167.44 60.1912 165.49 58.2412L138.288 31.0387C135.265 28.0162 130 30.1612 130 34.5487V52.0012C86.905 52.0012 52 86.9058 52 130.001C52 140.141 53.95 149.891 57.5575 158.764C60.19 165.296 68.575 167.051 73.5475 162.079C76.18 159.446 77.2525 155.449 75.79 151.939C72.9625 145.211 71.5 137.704 71.5 130.001C71.5 97.7287 97.7279 71.5012 130 71.5012ZM186.453 97.9237C183.82 100.556 182.747 104.651 184.21 108.064C186.94 114.889 188.5 122.299 188.5 130.001C188.5 162.274 162.272 188.501 130 188.501V171.049C130 166.661 124.735 164.516 121.712 167.636L94.51 194.839C92.56 196.789 92.56 199.811 94.51 201.761L121.712 228.964C124.735 231.986 130 229.841 130 225.551V208.001C173.095 208.001 208 173.096 208 130.001C208 119.861 206.05 110.111 202.443 101.239C199.81 94.7058 191.425 92.9508 186.453 97.9237Z"
					fill="white"
				/>
			</svg>
			<div className="flex-1 flex-row justify-start">
				<FramerLogo size={50} />
			</div>
			<div
				className="absolute inset-0 rounded-[inherit] opacity-30 pointer-events-none"
				style={{
					boxShadow: "0px 4px 16px var(--color-accent)",
				}}
			/>
		</div>
	);
}
