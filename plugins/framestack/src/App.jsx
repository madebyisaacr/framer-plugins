import { framer, Draggable } from "framer-plugin";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { tags, icons, components } from "./framestackData";
import { ComponentIcons } from "./componentIcons";
import { SearchBar, XIcon } from "@shared/components";
import Button from "@shared/Button";
import "./App.css";
import classNames from "classnames";

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
	width: 300,
	height: 500,
	minHeight: 400,
	resizable: "height",
});

const FRAMESTACK_GRADIENT = "linear-gradient(70deg, #6019FA, #00CCFF)";
const TAG_COLORS = ["#8636FF", "#3666FF", "#25A1FF", "#39C7C7", "#43D066", "#FFB300", "#FF8822", "#FF4488"];

export function App() {
	console.log(motion.div);
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
		<main className="relative size-full select-none">
			<div
				className={classNames(
					"flex flex-col flex-1 size-full overflow-hidden",
					selectedComponent && "opacity-50 pointer-events-none"
				)}
			>
				{/* <div className="absolute inset-y-3 left-[260px] w-[1px] bg-divider"></div> */}
				{/* <div className="relative flex flex-col overflow-y-auto w-[260px] p-3">
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
				</div> */}
				<SearchBar placeholder="Search Components..." value={searchText} onChange={setSearchText} className="mx-3" />
				{searchText.length ? (
					<div key="search-container" className="relative flex flex-col overflow-y-auto gap-6 p-3 flex-1">
						<TileGrid>
							{components
								.filter((component) => component.name.toLowerCase().includes(searchText.toLowerCase()))
								.map((component, _) => (
									<ComponentTile key={component.name} component={component} onClick={() => setSelectedComponent(component)} />
								))}
						</TileGrid>
					</div>
				) : (
					<div
						ref={containerRef}
						key="main-container"
						className="relative flex flex-col gap-5 px-3 pb-3 flex-1 overflow-y-scroll"
					>
						{tags.map((tag, index) => (
							<div
								key={tag}
								id={`framestack-tag-${index}`}
								className={classNames("flex flex-col gap-0", index === tags.length - 1 && "min-h-full")}
							>
								{/* <span className="w-full text-tertiary">{tag}</span> */}
								<TagHeader
									key={tag}
									text={tag}
									color={TAG_COLORS[index]}
									selected={activeIndex === index}
									onClick={() => scrollToTagSection(index)}
								/>
								<TileGrid>
									{components
										.filter((component) => component.tag === tag)
										.map((component, _) => (
											<ComponentTile key={component.name} component={component} onClick={() => setSelectedComponent(component)} />
										))}
								</TileGrid>
							</div>
						))}
					</div>
				)}
			</div>
			<div className={classNames("absolute inset-0 z-10", !selectedComponent && "pointer-events-none")}>
				<motion.div
					onClick={() => setSelectedComponent(null)}
					animate={{
						opacity: selectedComponent ? 0.5 : 0,
					}}
					initial={false}
					className="absolute inset-0 bg-primary"
				/>
				{selectedComponent && <ComponentWindow component={selectedComponent} onClose={() => setSelectedComponent(null)} />}
			</div>
		</main>
	);
}

function TagHeader(props) {
	return (
		<motion.div
			{...props}
			className="h-10 cursor-pointer text-primary font-semibold sticky top-0 z-10"
			initial={false}
			transition={TRANSITION}
		>
			<div className="relative flex flex-row items-center px-2 gap-2 h-full z-10 bg-primary">
				<div
					style={{
						background: props.color,
					}}
					className="relative rounded size-6 flex items-center justify-center text-[#FFF]"
				>
					<div
						style={{
							boxShadow: `0 4px 8px 0 ${props.color.startsWith("#") ? props.color : `#${props.color.match(/#(.{6})/)?.[1]}`}`,
						}}
						className="absolute inset-0 rounded opacity-20"
					/>
					{icons[props.text]}
				</div>
				<span className="flex-1 pt-[1px]">{props.text}</span>
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
			<div className="absolute top-[calc(100%-10px)] -left-2 right-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[25px] h-5" />
			<div className="absolute top-[calc(100%-10px)] -right-2 left-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[25px] h-5" />
		</motion.div>
	);
}

function TagButton(props) {
	return (
		<motion.div
			{...props}
			animate={{
				color: props.selected ? "var(--framer-color-text)" : "var(--framestack-color-text-middle)",
			}}
			className="relative min-h-10 max-h-10 cursor-pointer"
			initial={false}
			transition={TRANSITION}
		>
			{props.selected && (
				<motion.div
					layoutId="tag-button-background"
					className="absolute inset-0 rounded-xl bg-tertiary"
					initial={false}
					transition={TRANSITION}
				/>
			)}
			<div className="relative flex flex-row items-center gap-2 px-2 h-full z-10">
				<div
					style={{
						background: props.color,
					}}
					className="relative rounded size-6 flex items-center justify-center text-[#FFF]"
				>
					<div
						style={{
							boxShadow: `0 4px 8px 0 ${props.color.startsWith("#") ? props.color : `#${props.color.match(/#(.{6})/)?.[1]}`}`,
						}}
						className="absolute inset-0 rounded opacity-20"
					/>
					{icons[props.text]}
				</div>
				<span className="flex-1 pt-[1px]">{props.text}</span>
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
			<div className="relative z-10 min-h-[1px] w-full bg-divider my-3" />
			<span
				style={{
					color: "var(--framestack-color-text-middle)",
				}}
				className="relative z-10 pl-2 pb-2 pt-1"
			>
				{children}
			</span>
		</>
	);
}

function TileGrid({ children }) {
	return <div className="grid grid-cols-2 grid-rows-[min-content] gap-2 grid-flow-dense">{children}</div>;
}

function ComponentTile({ component, onClick }) {
	const icon = getComponentIcon(component);

	if (component.overrideCode) {
		console.log(component.overrideCode);
	}

	const element = (
		<div
			key={component.name}
			onClick={onClick}
			className="relative flex flex-col items-center justify-center w-full rounded-xl cursor-pointer bg-secondary hover:bg-tertiary transition-colors aspect-square"
		>
			{icon && <img src={icon} alt={component.name} className="w-full flex-1 pointer-events-none" />}
			<span className="w-full text-center px-1.5 pb-3 text-[11px] text-secondary font-semibold">{component.name}</span>
			{component.free && (
				<div
					style={{
						backgroundColor: TAG_COLORS[tags.indexOf(component.tag)],
					}}
					className="absolute top-1.5 right-1.5 rounded-[6px] px-1 py-0.5 font-bold text-[10px] text-reversed"
				>
					FREE
				</div>
			)}
		</div>
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
				boxShadow: "0 10px 30px 0 rgba(0,0,0,0.15)",
			}}
			className="absolute top-[50%] left-[50%] translate-[-50%,-50%] w-[350px] min-h-[420px] max-h-[480px] bg-modal rounded-xl shadow-2xl flex flex-col"
		>
			<WindowTopBar title={component.name} hideDivider onClose={onClose} />
			<div className="relative flex flex-col w-full flex-1 overflow-hidden">
				<div className="relative flex flex-col px-3 pb-3 gap-3 size-full overflow-y-auto">
					<div className="flex flex-col glex-1 w-full gap-3">
						<div className="relative w-full bg-tertiary rounded-lg flex items-center justify-center aspect-[120/63]">
							<img
								src={getComponentIcon(component)}
								alt={component.name}
								style={{
									width: component.wide ? "100%" : 240,
								}}
							/>
						</div>
						<div className="w-full flex flex-row gap-2 flex-1">
							<p className="font-semibold text-secondary flex-1">{component.description}</p>
							<div
								style={{
									background: component.free ? undefined : FRAMESTACK_GRADIENT,
								}}
								className={classNames(
									"rounded-[6px] padding-[4px_6px] font-bold text-[10px] h-fit text-tertiary",
									component.free ? "text-secondary bg-secondary" : "text-reversed"
								)}
							>
								{component.free ? "FREE" : "PRO"}
							</div>
						</div>
					</div>
				</div>
				<div className="absolute -inset-y-2 inset-x-1 rounded-[20px] border-[10px] border-modal pointer-events-none" />
			</div>
			<div className="flex flex-row gap-2 p-3">
				{(component.type == "component" || component.type == "componentAndOverride") && (
					<Button primary color={color} onClick={onInsertComponentClick}>
						Insert Component
					</Button>
				)}
				{component.type == "override" && (
					<Button primary color={color} onClick={onCopyOverrideClick}>
						Copy Code Override
					</Button>
				)}
				{component.type == "componentAndOverride" && <Button onClick={onCopyOverrideClick}>Copy Code Override</Button>}
				{component.type == "codeSnippet" && (
					<Button primary color={color} onClick={onCodeSnippetClick}>
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
			className={classNames(
				"min-h-10 max-h-10 flex flex-row items-center justify-between px-3",
				!hideDivider && "border-b border-divider"
			)}
		>
			<span className="text-primary z-20 flex-1">{title}</span>
			{children}
			<div className={classNames("flex flex-row items-center justify-end z-20", !children && "flex-1")}>
				<XIcon onClick={onClose} />
			</div>
		</div>
	);
}
