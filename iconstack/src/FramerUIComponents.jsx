import { motion } from "framer-motion";

const inheritFont = {
	fontFamily: "inherit",
	fontSize: "inherit",
	fontWeight: "500",
};

export function Button({
	primary = false,
	newTab = false,
	square = false,
	color = "var(--framer-color-tint)",
	children,
	className = "",
	style = {},
	href = "",
	onClick = null,
}) {
	const Element = href.length ? "a" : "button";
	const elementProps = href.length ? { href, target: newTab ? "_blank" : undefined } : { onClick };

	return (
		<Element
			className={className}
			style={{
				position: "relative",
				display: "flex",
				backgroundColor: primary ? color : "var(--framer-color-bg-secondary)",
				color: primary ? "var(--framer-color-text-reversed)" : "var(--framer-color-text)",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: 8,
				fontWeight: 600,
				cursor: "pointer",
				border: "none",
				fontSize: "inherit",
				padding: !square && "0 10px",
				minHeight: 30,
				maxHeight: 30,
				minWidth: square && 30,
				maxWidth: square && 30,
				textDecoration: "none",
				...style,
			}}
			{...elementProps}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: "inherit",
					boxShadow: primary ? `0px 4px 8px 0px ${color}` : "none",
					opacity: 0.2,
					pointerEvents: "none",
				}}
			/>
			{children}
		</Element>
	);
}

export function Dropdown({ options, optionTitles = null, onChange, style = {} }) {
	return (
		<select
			onChange={(e) => onChange(e.target.value)}
			defaultValue={options?.[0]?.value ?? ""}
			style={{
				backgroundColor: "var(--framer-color-bg-secondary)",
				borderRadius: 8,
				height: 30,
				minHeight: 30,
				padding: "0 16px 1px 7px",
				border: "none",
				color: "inherit",
				...inheritFont,
				...style,
			}}
		>
			{options?.map((option, index) => (
				<option key={option} value={option}>
					{optionTitles ? optionTitles[index] : option}
				</option>
			))}
		</select>
	);
}

export function SearchBar({ placeholder = "Search...", background = true, style = {}, value, onChange, onSubmit = null }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				gap: 6,
				alignItems: "center",
				height: 30,
				minHeight: 30,
				color: "var(--framer-color-text-tertiary)",
				fontWeight: 500,
				padding: background && "0 10px",
				backgroundColor: background && "var(--framer-color-bg-secondary)",
				borderRadius: background && 8,
				...style,
			}}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12">
				<path
					d="M 5 0 C 7.761 0 10 2.239 10 5 C 10 6.046 9.679 7.017 9.13 7.819 L 11.164 9.854 C 11.457 10.146 11.457 10.621 11.164 10.914 C 10.871 11.207 10.396 11.207 10.104 10.914 L 8.107 8.918 C 7.254 9.595 6.174 10 5 10 C 2.239 10 0 7.761 0 5 C 0 2.239 2.239 0 5 0 Z M 1.5 5 C 1.5 6.933 3.067 8.5 5 8.5 C 6.933 8.5 8.5 6.933 8.5 5 C 8.5 3.067 6.933 1.5 5 1.5 C 3.067 1.5 1.5 3.067 1.5 5 Z"
					fill="var(--framer-color-text-tertiary)"
				></path>
			</svg>
			<input
				type="text"
				className="framestack-text-input"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyPress={(e) => {
					if (e.key === "Enter") {
						onSubmit?.();
					}
				}}
				style={{
					flex: 1,
					backgroundColor: "transparent",
					border: "none",
					color: "var(--framer-color-text)",
					...inheritFont,
				}}
			/>
			{value?.length ? <XIcon onClick={() => onChange("")} /> : null}
		</div>
	);
}

export function SegmentedControl({ items, id, itemTitles = null, currentItem, onChange, style = null }) {
	const transition = { type: "spring", stiffness: "900", damping: "60" };

	const currentItemIndex = items?.indexOf(currentItem) ?? 0;

	const dividers = [];
	for (let i = 0; i < items?.length - 1; i++) {
		dividers.push(
			<motion.div
				key={`${id}-divider-${i}`}
				animate={{
					opacity: i === currentItemIndex || i + 1 === currentItemIndex ? 0 : 1,
				}}
				className="absolute w-[1px] h-[16px] top-[7px] bg-divider-secondary"
				style={{
					left: `${(i + 1) * (100 / items?.length)}%`,
				}}
				initial={false}
				transition={transition}
			/>
		);
	}

	return (
		<div
			className="relative flex flex-row items-stretch bg-bg-secondary p-0.5 rounded min-h-6"
			style={{
				...style,
			}}
		>
			{currentItemIndex >= 0 && (
				<div className="absolute inset-0.5">
					<motion.div
						animate={{
							left: `${(100 / items?.length) * currentItemIndex}%`,
						}}
						className="absolute rounded-[6px] h-full"
						style={{
							width: `${100 / items?.length}%`,
							backgroundColor: "var(--framer-color-segmented-control)",
							boxShadow: "0 2px 4px 0 rgba(0,0,0,0.15)",
						}}
						initial={false}
						transition={transition}
					/>
				</div>
			)}
			{dividers}
			{items?.map((item, index) => (
				<motion.div
					key={`${id}-${item}`}
					onClick={() => onChange(item)}
					animate={{
						color: index === currentItemIndex ? "var(--framer-color-text)" : "var(--framer-color-text-tertiary)",
					}}
					className="relative flex flex-1 items-center justify-center cursor-pointer"
					style={{
						fontWeight: index === currentItemIndex && "600",
					}}
					initial={false}
					transition={transition}
				>
					<span style={{ zIndex: 1 }}>{itemTitles ? itemTitles[index] : item}</span>
				</motion.div>
			))}
		</div>
	);
}

export function PropertyControl({ propertyControl, value, onChange, label, labelRatio = 1.5 }) {
	const type = propertyControl?.type ?? "";
	const multiplier = propertyControl?.multiplier ?? 1;

	const controls = [];
	switch (type) {
		case "number":
			controls.push(
				<input
					type="number"
					key="number"
					value={value / multiplier}
					onChange={(e) => onChange(Number(e.target.value) * multiplier)}
					min={propertyControl.min}
					max={propertyControl.max}
					step={1 / multiplier}
					className="bg-bg-secondary text-color-base rounded pl-[7px] pb-[1px] border-none h-full"
					style={inheritFont}
				/>
			);

			if (propertyControl.displayStepper) {
				function increment(plus) {
					if (plus) {
						if (propertyControl.max) {
							onChange(Math.min(propertyControl.max * multiplier, value + 1));
						} else {
							onChange(value + 1);
						}
					} else {
						if (propertyControl.min) {
							onChange(Math.max(propertyControl.min * multiplier, value - 1));
						} else {
							onChange(value - 1);
						}
					}
				}

				controls.push(
					<div
						key="stepper"
						className="relative flex flex-row items-center h-full cursor-pointer bg-bg-secondary rounded text-color-tertiary"
					>
						<div onClick={() => increment(false)} className="flex-1 flex items-center justify-center h-full">
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" className="block">
								<path
									d="M 0 4.75 C 0 4.336 0.336 4 0.75 4 L 8.75 4 C 9.164 4 9.5 4.336 9.5 4.75 L 9.5 4.75 C 9.5 5.164 9.164 5.5 8.75 5.5 L 0.75 5.5 C 0.336 5.5 0 5.164 0 4.75 Z"
									fill="currentColor"
								></path>
							</svg>
						</div>
						<div onClick={() => increment(true)} className="flex-1 flex items-center justify-center h-full">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10" className="block">
								<path
									d="M 4 0.75 C 4 0.336 4.336 0 4.75 0 C 5.164 0 5.5 0.336 5.5 0.75 L 5.5 4 L 8.75 4 C 9.164 4 9.5 4.336 9.5 4.75 C 9.5 5.164 9.164 5.5 8.75 5.5 L 5.5 5.5 L 5.5 8.75 C 5.5 9.164 5.164 9.5 4.75 9.5 C 4.336 9.5 4 9.164 4 8.75 L 4 5.5 L 0.75 5.5 C 0.336 5.5 0 5.164 0 4.75 C 0 4.336 0.336 4 0.75 4 L 4 4 Z"
									fill="currentColor"
								></path>
							</svg>
						</div>
						<div
							style={{
								position: "absolute",
								left: "calc(50% - 0.5px)",
								top: "calc(50% - 7px)",
								width: 1,
								height: 14,
								backgroundColor: "var(--framer-color-divider-secondary)",
								pointerEvents: "none",
							}}
						></div>
					</div>
				);
			}
			break;
		case "color":
			controls.push(
				<div
					key="color"
					className="flex flex-row items-center p-[4px] gap-[6px] rounded bg-bg-secondary cursor-pointer h-full col-span-2 flex-1"
				>
					<div
						className="h-[22px] min-w-[22px] rounded-[4px] border border-[#000]/10 "
						style={{
							backgroundColor: value,
						}}
					/>
					<span className="flex-1 font-medium">{value}</span>
				</div>
			);
			break;
		case "enum":
			controls.push(
				<SegmentedControl
					key="segmented-control"
					items={propertyControl.options}
					itemTitles={propertyControl.optionTitles}
					currentItem={value}
					onChange={onChange}
					className="col-span-2 flex-1"
				/>
			);
			break;
		case "boolean":
			controls.push(
				<SegmentedControl
					key="boolean"
					items={[true, false]}
					itemTitles={["Yes", "No"]}
					currentItem={value}
					onChange={onChange}
					className="col-span-2 flex-1"
				/>
			);
			break;
		default:
			break;
	}

	return (
		<div
			className={`${label ? "flex flex-row" : "grid"} gap-2 h-6 items-center font-medium`}
			style={{
				gridTemplateColumns: `minmax(0,${labelRatio}fr) repeat(2,minmax(62px,1fr))`,
			}}
		>
			{label && <span className="text-color-secondary">{label}</span>}
			{controls}
		</div>
	);
}

export function XIcon({ onClick, className = "", color = "var(--framer-color-text-tertiary)" }) {
	return (
		<div onClick={onClick} className={`${className.includes("absolute") ? "" : "relative"} cursor-pointer ${className}`}>
			<div className="absolute -inset-1" />
			<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" className="block">
				<path
					d="M 8 2 L 2 8 M 2 2 L 8 8"
					fill="transparent"
					strokeWidth="1.5"
					stroke={color}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeDasharray=""
				></path>
			</svg>
		</div>
	);
}

export function RoundedClip({ columns, gap = 10, borderRadius, backgroundColor = "var(--framer-color-bg)" }) {
	const elements = [];
	for (let i = 0; i < columns; i++) {
		elements.push(
			<div
				key={i}
				className="flex-1"
				style={{
					borderRadius,
					boxShadow: `0 0 0 ${gap}px ${backgroundColor}`,
				}}
			></div>
		);
	}

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-row" style={{ gap }}>
			{elements}
		</div>
	);
}
