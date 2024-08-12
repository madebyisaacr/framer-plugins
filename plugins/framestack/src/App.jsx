import { framer, Draggable } from "framer-plugin";
import { useState, useRef, useEffect, Fragment } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
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
	height: 550,
	minHeight: 400,
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
	const tagRefs = useRef([]);

	const [tagMenuOpen, setTagMenuOpen] = useState(false);
	const selectedTagIndexRef = useRef(-1);

	const tagMotionValues = tags.map(() => useMotionValue(0));

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

	useEffect(() => {
		if (tagMenuOpen) {
			let scrollTop = containerRef.current.scrollTop;

			for (let i = 0; i < tags.length; i++) {
				const element = tagRefs.current[i];
				const offset = -element.offsetTop + scrollTop + i * 50;

				animate(tagMotionValues[i], offset, TRANSITION);
			}
		} else {
			let scrollTop = 0;
			let prevScrollTop = 0;

			const tagElement = tagRefs.current[selectedTagIndexRef.current];
			if (tagElement) {
				prevScrollTop = containerRef.current.scrollTop;
				scrollTop = tagElement.offsetTop;
				containerRef.current.scrollTop = scrollTop;
			}

			for (let i = 0; i < tags.length; i++) {
				tagMotionValues[i].set(tagMotionValues[i].get() + (scrollTop - prevScrollTop));
				setTimeout(() => animate(tagMotionValues[i], 0, TRANSITION), 40);
			}
		}
	}, [tagMenuOpen]);

	const onTagClick = (index) => {
		setTagMenuOpen(!tagMenuOpen);
		selectedTagIndexRef.current = index;
	};

	return (
		<main className="relative size-full select-none">
			<div
				className={classNames(
					"flex flex-col gap-2 flex-1 size-full overflow-hidden",
					selectedComponent && "opacity-50 pointer-events-none"
				)}
			>
				<SearchBar placeholder="Search Components..." value={searchText} onChange={setSearchText} className="mx-3" />
				{searchText.length ? (
					<div key="search-container" className="relative flex-1 overflow-hidden pt-2">
						<div className="relative flex flex-col overflow-y-auto gap-6 px-3 h-full">
							<TileGrid>
								{components
									.filter((component) => component.name.toLowerCase().includes(searchText.toLowerCase()))
									.map((component, _) => (
										<ComponentTile key={component.name} component={component} onClick={() => setSelectedComponent(component)} />
									))}
							</TileGrid>
						</div>
					</div>
				) : (
					<div className="relative w-full flex flex-col flex-1 overflow-hidden">
						<motion.div
							ref={containerRef}
							key="main-container"
							className={classNames(
								"relative flex flex-col px-3 pt-0 flex-1",
								tagMenuOpen ? "overflow-y-hidden" : "overflow-y-scroll"
							)}
						>
							{tags.map((tag, index) => (
								<Fragment key={tag}>
									<motion.div
										key={tag}
										ref={(ref) => (tagRefs.current[index] = ref)}
										onClick={() => onTagClick(index)}
										className="cursor-pointer text-primary font-semibold z-10"
										style={{ y: tagMotionValues[index] }}
									>
										<div className="relative flex flex-row items-center px-2 pb-3 pt-2 gap-2 h-full z-30 bg-primary">
											<div className="absolute inset-x-0 bottom-1 top-0 z-0 rounded-xl bg-secondary opacity-0 transition-opacity hover:opacity-100" />
											<div
												style={{
													background: TAG_COLORS[index],
												}}
												className="relative rounded size-6 flex items-center justify-center text-[#FFF] pointer-events-none"
											>
												<div
													style={{
														boxShadow: `0 4px 8px 0 ${TAG_COLORS[index]}`,
													}}
													className="absolute inset-0 rounded opacity-20"
												/>
												{icons[tag]}
											</div>
											<span className="relative flex-1 pt-[1px] pointer-events-none">{tag}</span>
											<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" className="rotate-90 pointer-events-none">
												<path
													d="M 7 0 L 3.5 3.5 L 0 0"
													transform="translate(1.5 3.5) rotate(-90 3.5 1.75)"
													fill="transparent"
													strokeWidth="1.5"
													stroke="var(--framer-color-text-tertiary)"
													strokeLinecap="round"
													strokeLinejoin="round"
												></path>
											</svg>
										</div>
										<motion.div
											className="absolute -top-3 h-3 inset-x-0 bg-gradient-to-t from-[var(--framer-color-bg)] to-transparent pointer-events-none"
											animate={{
												opacity: tagMenuOpen ? 0 : 1,
											}}
											initial={false}
											transition={TRANSITION}
										/>
									</motion.div>
									<motion.div
										className={classNames("w-full", tagMenuOpen && "pointer-events-none")}
										animate={{
											opacity: tagMenuOpen ? 0 : 1,
										}}
										style={{ y: tagMotionValues[index] }}
										initial={false}
										transition={TRANSITION}
									>
										<TileGrid>
											{components
												.filter((component) => component.tag === tag)
												.map((component, _) => (
													<ComponentTile
														key={component.name}
														component={component}
														onClick={() => setSelectedComponent(component)}
													/>
												))}
										</TileGrid>
									</motion.div>
								</Fragment>
							))}
						</motion.div>
						<div className="absolute -top-2 left-1 right-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[25px] h-5" />
						<div className="absolute -top-2 right-1 left-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[25px] h-5" />
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

function TileGrid({ children }) {
	return <div className="grid grid-cols-2 grid-rows-[min-content] gap-2 grid-flow-dense mb-3 pt-1 bg-primary">{children}</div>;
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
