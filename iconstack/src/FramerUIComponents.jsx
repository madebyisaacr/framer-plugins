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
				style={{
					position: "absolute",
					width: 1,
					height: 16,
					top: 7,
					left: `${(i + 1) * (100 / items?.length)}%`,
					backgroundColor: "var(--framer-color-divider-secondary)",
				}}
				initial={false}
				transition={transition}
			/>
		);
	}

	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "row",
				alignItems: "stretch",
				backgroundColor: "var(--framer-color-bg-secondary)",
				padding: 2,
				borderRadius: 8,
				minHeight: 30,
				...style,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 2,
				}}
			>
				<motion.div
					animate={{
						left: `${(100 / items?.length) * currentItemIndex}%`,
					}}
					style={{
						position: "absolute",
						width: `${100 / items?.length}%`,
						backgroundColor: "var(--framer-color-segmented-control)",
						borderRadius: 6,
						boxShadow: "0 2px 4px 0 rgba(0,0,0,0.15)",
						height: "100%",
					}}
					initial={false}
					transition={transition}
				/>
			</div>
			{dividers}
			{items?.map((item, index) => (
				<motion.div
					key={`${id}-${item}`}
					onClick={() => onChange(item)}
					animate={{
						color: index === currentItemIndex ? "var(--framer-color-text)" : "var(--framer-color-text-tertiary)",
					}}
					style={{
						position: "relative",
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
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
					className="framestack-text-input"
					value={value / multiplier}
					onChange={(e) => onChange(Number(e.target.value) * multiplier)}
					min={propertyControl.min}
					max={propertyControl.max}
					step={1 / multiplier}
					style={{
						backgroundColor: "var(--framer-color-bg-secondary)",
						color: "var(--framer-color-text)",
						borderRadius: 8,
						paddingLeft: 7,
						paddingBottom: 1,
						border: "none",
						height: "100%",
						...inheritFont,
					}}
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
						style={{
							position: "relative",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							backgroundColor: "var(--framer-color-bg-secondary)",
							borderRadius: 8,
							color: "var(--framer-color-text-tertiary)",
							height: "100%",
							cursor: "pointer",
						}}
					>
						<div
							onClick={() => increment(false)}
							style={{
								flex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: "100%",
							}}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style={{ display: "block" }}>
								<path
									d="M 0 4.75 C 0 4.336 0.336 4 0.75 4 L 8.75 4 C 9.164 4 9.5 4.336 9.5 4.75 L 9.5 4.75 C 9.5 5.164 9.164 5.5 8.75 5.5 L 0.75 5.5 C 0.336 5.5 0 5.164 0 4.75 Z"
									fill="currentColor"
								></path>
							</svg>
						</div>
						<div
							onClick={() => increment(true)}
							style={{
								flex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: "100%",
							}}
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10" style={{ display: "block" }}>
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
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						padding: 4,
						gap: 6,
						borderRadius: 8,
						backgroundColor: "var(--framer-color-bg-secondary)",
						cursor: "pointer",
						height: "100%",
						gridColumn: "span 2",
						flex: 1,
					}}
				>
					<div
						style={{
							height: 22,
							minWidth: 22,
							borderRadius: 4,
							border: "1px solid rgba(0,0,0,0.1)",
							backgroundColor: value,
						}}
					/>
					<span style={{ flex: 1, fontWeight: 500 }}>{value}</span>
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
					style={{
						gridColumn: "span 2",
						flex: 1,
					}}
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
					style={{
						gridColumn: "span 2",
						flex: 1,
					}}
				/>
			);
			break;
		default:
			break;
	}

	return (
		<div
			style={{
				display: label ? "grid" : "flex",
				flexDirection: "row",
				gridTemplateColumns: `minmax(0,${labelRatio}fr) repeat(2,minmax(62px,1fr))`,
				gap: 10,
				height: 30,
				alignItems: "center",
				fontWeight: 500,
			}}
		>
			{label && (
				<span
					style={{
						color: "var(--framer-color-text-secondary)",
					}}
				>
					{label}
				</span>
			)}
			{controls}
		</div>
	);
}

export function XIcon({ onClick, style = {}, color = "var(--framer-color-text-tertiary)" }) {
	return (
		<div
			onClick={onClick}
			style={{
				position: "relative",
				cursor: "pointer",
				...style,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: -5,
				}}
			/>
			<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style={{ display: "block" }}>
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
				style={{
					flex: 1,
					borderRadius,
					boxShadow: `0 0 0 ${gap}px ${backgroundColor}`,
				}}
			></div>
		);
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				pointerEvents: "none",
				display: "flex",
				flexDirection: "row",
				gap,
			}}
		>
			{elements}
		</div>
	);
}
