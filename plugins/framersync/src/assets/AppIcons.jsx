export function Logo({id, size = 24, className = ""}) {
	return <img src={`/logos/${id}.svg`} style={{ height: size }} className={className} />
}

export function FramerLogo({ size = 24, className = "" }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={Math.ceil((size * 2) / 3)}
			height={Math.ceil(size)}
			viewBox="4 0 16 24"
			className={className}
		>
			<path fill="currentColor" d="M20 0v8h-8L4 0ZM4 8h8l8 8h-8v8l-8-8Z" />
		</svg>
	);
}
