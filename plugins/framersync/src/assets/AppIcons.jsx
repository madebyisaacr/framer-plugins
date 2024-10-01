export function Logo({id, size = 24, className = ""}) {
	return <img src={`/logos/${id}.svg`} style={{ height: size }} className={className} />
}

export function FramerLogo({ size = 24, className = "" }) {
	return <img src={`/logos/framer.svg`} style={{ height: size }} className={className} />
}
