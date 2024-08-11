import { framer, Draggable } from "framer-plugin";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { tags, icons, components } from "./framestackData";
import { ComponentIcons } from "./componentIcons";
import { SearchBar, XIcon } from "@shared/components";
import Button from "@shared/Button";
import "./App.css";

const TRANSITION = {
	type: "spring",
	stiffness: "1000",
	damping: "80",
	delay: 0,
	mass: 1,
};

framer.showUI({
	title: "Framestack",
	position: "center",
	width: 760,
	height: 600,
	minHeight: 300,
	resizable: "height",
});

const FRAMESTACK_GRADIENT = "linear-gradient(70deg, #6019FA, #00CCFF)";
const TAG_COLORS = ["#8636FF", "#3666FF", "#25A1FF", "#39C7C7", "#43D066", "#FFB300", "#FF8822", "#FF4488"];

export function App() {
	const [activeIndex, setActiveIndex] = useState(-1);
	const [selectedComponent, setSelectedComponent] = useState(null);
	const [searchText, setSearchText] = useState("");
	const activeIndexRef = useRef(activeIndex);
	const containerRef = useRef(null);

	useEffect(() => {
		if (searchText.length) {
			setActiveIndex(-1);
		} else {
			const container = containerRef.current;
			if (container) {
				const onScroll = () => {
					const sections = tags.map((_tag, index) => document.getElementById(`framestack-tag-${index}`));

					let index = 0;
					if (sections.some((element) => element !== null)) {
						index = sections.findIndex((section) => section.offsetTop + section.offsetHeight - container.scrollTop >= 40);
					}

					if (index === -1) {
						index = tags.length - 1;
					} else if (container.scrollTop <= 0) {
						// Top of page
						index = -1;
					}

					if (index !== activeIndexRef.current) {
						const newIndex = index;
						setActiveIndex(newIndex);
						activeIndexRef.current = newIndex;
					}
				};

				container.addEventListener("scroll", onScroll);

				return () => {
					container?.removeEventListener("scroll", onScroll);
				};
			}
		}
	}, [searchText.length == 0]);

	const scrollToTagSection = (tagIndex) => {
		if (containerRef.current) {
			if (tagIndex === -1) {
				containerRef.current.scrollTop = 0;
			} else if (tagIndex === 0) {
				containerRef.current.scrollTop = 1;
			} else {
				const element = document.getElementById(`framestack-tag-${tagIndex}`);
				if (element) {
					containerRef.current.scrollTop = element.offsetTop;
				}
			}
		}
	};

	return (
		<main
			style={{
				position: "relative",
				userSelect: "none",
				width: "100%",
				height: "100%",
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 15,
					right: 15,
					height: 1,
					backgroundColor: "var(--framer-color-divider)",
				}}
			></div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					opacity: selectedComponent ? 0.5 : 1,
					pointerEvents: selectedComponent ? "none" : "auto",
					flex: 1,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						position: "absolute",
						top: 15,
						left: 260,
						bottom: 15,
						width: 1,
						backgroundColor: "var(--framer-color-divider)",
					}}
				></div>
				<div
					className="hide-scrollbar"
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						overflowY: "auto",
						width: 260,
						padding: 15,
					}}
				>
					<TagButton
						text="Home"
						color={FRAMESTACK_GRADIENT}
						selected={activeIndex === -1}
						onClick={() => scrollToTagSection(-1)}
					/>
					<SectionDivider>Components</SectionDivider>
					{tags.map((tag, index) => (
						<TagButton
							key={tag}
							text={tag}
							color={TAG_COLORS[index]}
							selected={activeIndex === index}
							onClick={() => scrollToTagSection(index)}
						/>
					))}
					{/* <SectionDivider>Plugins</SectionDivider>
								<TagButton text="Image Studio" color="#575757" />
								<TagButton text="IconStack" color="#282828" />
								<TagButton text="FramerForms" color="#473DFE" />
								<TagButton text="Superfields" color="#FFAC83" /> */}
				</div>
				{searchText.length ? (
					<div
						className="hide-scrollbar"
						key="search-container"
						style={{
							position: "relative",
							display: "flex",
							flexDirection: "column",
							overflowY: "auto",
							gap: 30,
							padding: 15,
							flex: 1,
						}}
					>
						<TileGrid>
							{components
								.filter((component) => component.name.toLowerCase().includes(searchText.toLowerCase()))
								.map((component, _) => (
									<ComponentTile component={component} onClick={() => setSelectedComponent(component)} />
								))}
						</TileGrid>
					</div>
				) : (
					<div
						ref={containerRef}
						key="main-container"
						className="hide-scrollbar"
						style={{
							position: "relative",
							display: "flex",
							flexDirection: "column",
							overflowY: "auto",
							gap: 15,
							padding: 15,
							paddingTop: 0,
							flex: 1,
						}}
					>
						{tags.map((tag, index) => (
							<div
								key={tag}
								id={`framestack-tag-${index}`}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 15,
									paddingTop: 15,
									minHeight: index === tags.length - 1 && "100%",
								}}
							>
								<span
									style={{
										width: "100%",
										color: "var(--framer-color-text-tertiary)",
									}}
								>
									{tag}
								</span>
								<TileGrid>
									{components
										.filter((component) => component.tag === tag)
										.map((component, _) => (
											<ComponentTile component={component} onClick={() => setSelectedComponent(component)} />
										))}
								</TileGrid>
							</div>
						))}
					</div>
				)}
			</div>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					pointerEvents: selectedComponent ? "auto" : "none",
					zIndex: 1,
				}}
			>
				<motion.div
					onClick={() => setSelectedComponent(null)}
					animate={{
						opacity: selectedComponent ? 0.5 : 0,
					}}
					initial={false}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: "var(--framer-color-bg)",
					}}
				/>
				{selectedComponent && <ComponentWindow component={selectedComponent} onClose={() => setSelectedComponent(null)} />}
			</div>
		</main>
	);
}

function TagButton(props) {
	return (
		<motion.div
			{...props}
			animate={{
				color: props.selected ? "var(--framer-color-text)" : "var(--framestack-color-text-middle)",
			}}
			style={{
				position: "relative",
				minHeight: 50,
				maxHeight: 50,
				cursor: "pointer",
			}}
			initial={false}
			transition={TRANSITION}
		>
			{props.selected && (
				<motion.div
					layoutId="tag-button-background"
					style={{
						position: "absolute",
						inset: 0,
						borderRadius: 15,
						backgroundColor: "var(--framestack-color-bg-tertiary)",
					}}
					initial={false}
					transition={TRANSITION}
				/>
			)}
			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					padding: "0px 10px",
					gap: 10,
					height: "100%",
					zIndex: 1,
				}}
			>
				<div
					style={{
						position: "relative",
						borderRadius: 8,
						width: 30,
						height: 30,
						background: props.color,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							borderRadius: 8,
							boxShadow: `0 4px 8px 0 ${props.color.startsWith("#") ? props.color : `#${props.color.match(/#(.{6})/)?.[1]}`}`,
							opacity: 0.2,
						}}
					/>
					{icons[props.text]}
				</div>
				<span style={{ flex: 1, paddingTop: 1 }}>{props.text}</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
					<path
						d="M 7 0 L 3.5 3.5 L 0 0"
						transform="translate(1.5 3.5) rotate(-90 3.5 1.75)"
						fill="transparent"
						strokeWidth="1.5"
						stroke="var(--framestack-color-text-middle)"
						strokeLinecap="round"
						strokeLinejoin="round"
					></path>
				</svg>
			</div>
		</motion.div>
	);
}

function SectionDivider({ children }) {
	return (
		<>
			<div
				style={{
					position: "relative",
					zIndex: 1,
					minHeight: 1,
					width: "100%",
					backgroundColor: "var(--framer-color-divider)",
					margin: "15px 0",
				}}
			/>
			<span
				style={{
					position: "relative",
					zIndex: 1,
					color: "var(--framestack-color-text-middle)",
					paddingLeft: 10,
					paddingBottom: 10,
					paddingTop: 5,
				}}
			>
				{children}
			</span>
		</>
	);
}

function TileGrid({ children }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 1fr)",
				gridTemplateRows: "min-content",
				gridAutoFlow: "dense",
				gap: 10,
			}}
		>
			{children}
		</div>
	);
}

function ComponentTile({ component, onClick }) {
	const icon = getComponentIcon(component);

	if (component.overrideCode) {
		console.log(component.overrideCode);
	}

	const element = (
		<motion.div
			key={component.name}
			onClick={onClick}
			whileHover={{
				backgroundColor: "var(--framestack-color-bg-secondary)",
			}}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "flex-end",
				gridColumn: component.wide && "span 2",
				width: "100%",
				backgroundColor: "var(--framestack-color-bg-tertiary)",
				height: 150,
				borderRadius: 15,
				cursor: "pointer",
			}}
		>
			{icon && (
				<img
					src={icon}
					alt={component.name}
					style={{
						width: "100%",
						pointerEvents: "none",
					}}
				/>
			)}
			<span
				style={{
					width: "100%",
					textAlign: "center",
					paddingLeft: 8,
					paddingRight: 8,
					paddingBottom: 15,
					fontSize: 11,
					color: "var(--framer-color-text-secondary)",
				}}
			>
				{component.name}
			</span>
			{component.free && (
				<div
					style={{
						position: "absolute",
						top: 10,
						right: 10,
						backgroundColor: TAG_COLORS[tags.indexOf(component.tag)],
						borderRadius: 5,
						padding: "3px 4px",
						fontWeight: 700,
						fontSize: 10,
						lineHeight: 1.1,
						color: "var(--framer-color-text-reversed)",
					}}
				>
					FREE
				</div>
			)}
		</motion.div>
	);

	return component.type == "component" ? (
		<Draggable
			data={{
				type: "component",
				moduleUrl: component.componentURL,
			}}
		>
			{element}
		</Draggable>
	) : (
		element
	);
}

function ComponentWindow({ component, onClose }) {
	const color = TAG_COLORS[tags.indexOf(component.tag)];

	function onInsertComponentClick() {
		framer.addComponent(component.componentURL);
		framer.closePlugin(`${component.name} component inserted`, {
			variant: "success",
		});
	}

	function onCopyOverrideClick() {
		let code = component.code;
		for (const propertyId in component.controls) {
			const property = component.controls[propertyId];
			code = code.replace(`[[${propertyId}]]`, property.defaultValue);
		}

		navigator.clipboard.writeText(code);
	}

	function onCodeSnippetClick() {
		let code = component.code;
		for (const propertyId in component.controls) {
			const property = component.controls[propertyId];
			code = code.replace(`[[${propertyId}]]`, property.defaultValue);
		}

		framer.setCustomCode({ html: code, location: "headStart" });
	}

	return (
		<div
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				width: 350,
				minHeight: 420,
				maxHeight: 480,
				backgroundColor: "var(--framestack-color-bg-modal)",
				borderRadius: 16,
				boxShadow: "0 10px 30px 0 rgba(0,0,0,0.15)",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<WindowTopBar title={component.name} hideDivider onClose={onClose} />
			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: "100%",
					flex: 1,
					overflow: "hidden",
				}}
			>
				<div
					className="hide-scrollbar"
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						padding: 15,
						paddingTop: 0,
						gap: 15,
						width: "100%",
						height: "100%",
						overflowY: "auto",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							flex: 1,
							width: "100%",
							gap: 15,
						}}
					>
						<div
							style={{
								position: "relative",
								width: "100%",
								aspectRatio: "120 / 63",
								backgroundColor: "var(--framestack-color-bg-tertiary)",
								borderRadius: 10,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<img
								src={getComponentIcon(component)}
								alt={component.name}
								style={{
									width: component.wide ? "100%" : 240,
								}}
							/>
						</div>
						<div
							style={{
								width: "100%",
								display: "flex",
								flexDirection: "row",
								gap: 10,
								flex: 1,
							}}
						>
							<p
								style={{
									fontWeight: 500,
									lineHeight: 1.5,
									color: "var(--framer-color-text-secondary)",
									flex: 1,
								}}
							>
								{component.description}
							</p>
							<div
								style={{
									background: component.free ? "var(--framestack-color-bg-secondary)" : FRAMESTACK_GRADIENT,
									borderRadius: 6,
									padding: "4px 6px",
									fontWeight: 700,
									fontSize: 10,
									lineHeight: 1.1,
									height: "fit-content",
									color: component.free ? "var(--framer-color-text-secondary)" : "var(--framer-color-text-reversed)",
								}}
							>
								{component.free ? "FREE" : "PRO"}
							</div>
						</div>
					</div>
				</div>
				<div
					style={{
						position: "absolute",
						top: -10,
						bottom: -10,
						left: 5,
						right: 5,
						borderRadius: 20,
						border: "10px solid var(--framestack-color-bg-modal)",
						pointerEvents: "none",
					}}
				/>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					gap: 10,
					padding: 15,
				}}
			>
				{(component.type == "component" || component.type == "componentAndOverride") && (
					<Button primary color={color} style={{ flex: 1 }} onClick={onInsertComponentClick}>
						Insert Component
					</Button>
				)}
				{component.type == "override" && (
					<Button primary color={color} style={{ flex: 1 }} onClick={onCopyOverrideClick}>
						Copy Code Override
					</Button>
				)}
				{component.type == "componentAndOverride" && (
					<Button style={{ flex: 1 }} onClick={onCopyOverrideClick}>
						Copy Code Override
					</Button>
				)}
				{component.type == "codeSnippet" && (
					<Button primary color={color} style={{ flex: 1 }} onClick={onCodeSnippetClick}>
						Add Code Snippet to Site Settings
					</Button>
				)}
			</div>
		</div>
	);
}

function getComponentIcon(component) {
	let icon = ComponentIcons[component.name];
	if (icon) {
		const color = TAG_COLORS[tags.indexOf(component.tag)];
		icon = icon.replace(/#0075FF/g, color);

		if (icon.includes('<feColorMatrix type="matrix"')) {
			icon = icon.replace(/0 0 0 0 0 0 0 0 0 0.458824 0 0 0 0 1 0 0 0 0.2 0/g, hexToColorMatrixWithOpacity(color));
		}

		if (icon.includes("#AEAEAE")) {
			icon = icon
				.replace(/#AEAEAE/g, "var(--theme-color)")
				.replace(
					"</svg>",
					`<style>* { --theme-color: ${color}; } @media (prefers-color-scheme: dark) { * { --theme-color: #fff; } }</style></svg>`
				);
		}

		icon = encodeURIComponent(icon).replace(/'/g, "%27").replace(/"/g, "%22");
		icon = `data:image/svg+xml,${icon}`;
	}

	return icon;
}

function hexToColorMatrixWithOpacity(hex) {
	// Ensure the hex code is in the correct format
	hex = hex.startsWith("#") ? hex.substring(1) : hex;

	// Parse the hex string into RGB components
	const r = parseInt(hex.substring(0, 2), 16) / 255;
	const g = parseInt(hex.substring(2, 4), 16) / 255;
	const b = parseInt(hex.substring(4, 6), 16) / 255;

	// Construct the color matrix values
	return `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 0.25 0`;
}

export function WindowTopBar({ title, children = null, hideDivider = false, onClose = null }) {
	return (
		<div
			style={{
				minHeight: 50,
				maxHeight: 50,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "0 15px",
				borderBottom: !hideDivider && "1px solid var(--framer-color-divider)",
			}}
		>
			<span
				style={{
					color: "var(--framer-color-text)",
					zIndex: 2,
					flex: 1,
				}}
			>
				{title}
			</span>
			{children}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "flex-end",
					flex: children ? 1 : undefined,
					zIndex: 2,
				}}
			>
				<XIcon onClick={onClose} />
			</div>
		</div>
	);
}
