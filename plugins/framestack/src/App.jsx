import { framer, Draggable } from "framer-plugin";
import { useState, useRef, useEffect, Fragment, useMemo } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
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
	const [selectedComponent, setSelectedComponent] = useState(null);
	const [activeComponent, setActiveComponent] = useState(null);
	const [searchText, setSearchText] = useState("");
	const [tagMenuOpen, setTagMenuOpen] = useState(false);
	const containerRef = useRef(null);
	const searchContainerRef = useRef(null);
	const tagRefs = useRef([]);
	const selectedTagIndexRef = useRef(-1);
	const selectedComponentButtonRef = useRef(null);

	const tagMotionValues = tags.map(() => useMotionValue(0));

	useEffect(() => {
		const scrollContainer = (searchText ? searchContainerRef : containerRef).current;

		if (tagMenuOpen) {
			let scrollTop = scrollContainer.scrollTop;

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
				prevScrollTop = scrollContainer.scrollTop;
				scrollTop = tagElement.offsetTop;
				scrollContainer.scrollTop = scrollTop;
			}

			for (let i = 0; i < tags.length; i++) {
				tagMotionValues[i].set(tagMotionValues[i].get() + (scrollTop - prevScrollTop));
				setTimeout(() => animate(tagMotionValues[i], 0, TRANSITION), 40);
			}
		}
	}, [tagMenuOpen]);

	useEffect(() => {
		if (searchContainerRef.current) {
			searchContainerRef.current.scrollTop = 0;
		}
	}, [searchText]);

	const onTagClick = (index) => {
		setTagMenuOpen(!tagMenuOpen);
		selectedTagIndexRef.current = index;
	};

	const onComponentClick = (component, event) => {
		setSelectedComponent(component);
		setActiveComponent(component);
		selectedComponentButtonRef.current = event.currentTarget;
	};

	const onComponentTransitionEnd = () => {
		if (activeComponent && !selectedComponent) {
			setActiveComponent(null);
			console.log("activeComponent", activeComponent);
		}
	};

	return (
		<main className="relative size-full select-none">
			<motion.div
				className={classNames("flex flex-col gap-2 flex-1 size-full overflow-hidden", selectedComponent && "pointer-events-none")}
				animate={{
					scale: selectedComponent ? 0.95 : 1,
				}}
				initial={false}
				transition={TRANSITION}
				onTransitionEnd={onComponentTransitionEnd}
			>
				<SearchBar placeholder="Search Components..." value={searchText} onChange={setSearchText} className="mx-3" />
				<div key="search-container" className={classNames("relative flex-1 overflow-hidden", !searchText && "hidden")}>
					<div ref={searchContainerRef} className="relative flex flex-col overflow-y-auto gap-6 px-3 h-full">
						<TileGrid>
							{components
								.filter((component) => component.name.toLowerCase().includes(searchText.toLowerCase()))
								.map((component, _) => (
									<ComponentTile
										key={component.name}
										component={component}
										active={activeComponent === component}
										onClick={(event) => onComponentClick(component, event)}
									/>
								))}
						</TileGrid>
					</div>
					<div className="absolute -top-2 left-1 right-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[25px] h-5" />
					<div className="absolute -top-2 right-1 left-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[25px] h-5" />
				</div>
				<div className={classNames("relative w-full flex flex-col flex-1 overflow-hidden", searchText && "hidden")}>
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
									<div className="relative flex flex-row items-center px-2 pb-3 pt-2 gap-2 h-full z-30">
										<div className="absolute inset-x-0 bottom-1 top-0 z-0 rounded-xl bg-secondary opacity-0 transition-opacity hover:opacity-100" />
										<div
											style={{
												background: TAG_COLORS[index],
											}}
											className="relative rounded size-6 flex items-center justify-center text-reversed pointer-events-none"
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
										<motion.svg
											xmlns="http://www.w3.org/2000/svg"
											width="10"
											height="10"
											className="pointer-events-none relative"
											animate={{
												rotate: tagMenuOpen ? 0 : 90,
											}}
											initial={false}
											transition={TRANSITION}
										>
											<path
												d="M 7 0 L 3.5 3.5 L 0 0"
												transform="translate(1.5 3.5) rotate(-90 3.5 1.75)"
												fill="transparent"
												strokeWidth="1.5"
												stroke="var(--framer-color-text-tertiary)"
												strokeLinecap="round"
												strokeLinejoin="round"
											></path>
										</motion.svg>
									</div>
								</motion.div>
								<motion.div
									className={classNames("w-full origin-top", tagMenuOpen && "pointer-events-none")}
									animate={{
										opacity: tagMenuOpen ? 0 : 1,
										scale: tagMenuOpen ? 0.95 : 1,
									}}
									style={{ y: tagMotionValues[selectedTagIndexRef.current] }}
									initial={false}
									transition={TRANSITION}
								>
									<TileGrid className="pt-1">
										{components
											.filter((component) => component.tag === tag)
											.map((component, _) => (
												<ComponentTile
													key={component.name}
													component={component}
													active={activeComponent === component}
													onClick={(event) => onComponentClick(component, event)}
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
			</motion.div>
			<AnimatePresence onExitComplete={onComponentTransitionEnd}>
				{selectedComponent && (
					<ComponentWindow
						component={selectedComponent}
						element={selectedComponentButtonRef.current}
						containerOffsetTop={(searchText ? searchContainerRef : containerRef).current.getBoundingClientRect().top}
						onClose={() => setSelectedComponent(null)}
					/>
				)}
			</AnimatePresence>
		</main>
	);
}

function TileGrid({ children, className = "" }) {
	return (
		<div className={classNames("grid grid-cols-2 grid-rows-[min-content] gap-2 grid-flow-dense mb-3 bg-primary", className)}>
			{children}
		</div>
	);
}

function ComponentTile({ component, active, className = "", onClick = null }) {
	const icon = getComponentIcon(component);

	const element = (
		<div
			key={component.name}
			onClick={onClick}
			className={classNames(
				"relative flex flex-col items-center justify-center w-full rounded-xl bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.08)] transition-colors aspect-square",
				active ? "opacity-0" : "opacity-100",
				onClick && "cursor-pointer",
				className
			)}
		>
			{icon && <img src={icon} alt={component.name} className="w-full flex-1 pointer-events-none" />}
			<span className="w-full text-center px-1.5 pb-3 text-[11px] text-primary font-semibold">{component.name}</span>
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

function ComponentWindow({ component, element, containerOffsetTop, onClose }) {
	const imgRef = useRef(null);
	const session = null;

	const [offsetTop, setOffsetTop] = useState(0);
	const offsetTopValue = useMotionValue(0);

	const [loading, setLoading] = useState(false);

	const [clipTop, imgHeight] = useMemo(() => {
		if (!element) {
			return [0, 0];
		}

		return [Math.max(0, containerOffsetTop - element.getBoundingClientRect().top), element.offsetHeight];
	}, []);

	useEffect(() => {
		if (!element || !imgRef.current) {
			return;
		}

		const elementRect = element.getBoundingClientRect();
		const imgRect = imgRef.current.getBoundingClientRect();

		const offset = Math.max(containerOffsetTop, elementRect.top) - imgRect.top;

		offsetTopValue.jump(offset);
		animate(offsetTopValue, 0, TRANSITION);
		setOffsetTop(offset);
	}, []);

	const onButtonClick = async () => {
		if (component.url) {
			setLoading(true);

			if (component.detach) {
				await framer.addDetachedComponentLayers({ url: component.url, layout: true });
			} else {
				await framer.addComponentInstance({ url: component.url });
			}

			onClose?.();
		}
	};

	const isLocked = !session || (component.pro && tier !== "pro");

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

	const left = getChildIndex(element) % 2 == 0;

	return (
		<motion.div
			className="absolute inset-0 flex flex-col justify-center"
			initial={{ backdropFilter: "blur(0px)" }}
			exit={{ backdropFilter: "blur(0px)" }}
			animate={{ backdropFilter: "blur(8px)" }}
			transition={TRANSITION}
		>
			<motion.div
				onClick={onClose}
				className="absolute inset-0"
				initial={{ opacity: 0 }}
				exit={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={TRANSITION}
			>
				<div className="absolute inset-0 bg-primary opacity-40 dark:opacity-70" />
			</motion.div>
			<motion.div
				className="relative flex flex-col gap-3 justify-center px-3 pointer-events-none"
				style={{ translateY: offsetTopValue }}
				exit={{ translateY: offsetTop }}
				transition={TRANSITION}
			>
				<div className={classNames("flex flex-col gap-2", left ? "items-start" : "items-end")}>
					<motion.div
						ref={imgRef}
						initial={{ height: imgHeight - clipTop }}
						exit={{ height: imgHeight - clipTop }}
						animate={{ height: imgHeight }}
						className="rounded-xl overflow-hidden w-[calc(50%-5px)] relative flex flex-col justify-end"
						transition={TRANSITION}
					>
						<ComponentTile component={component} className="pointer-events-auto shrink-0" />
					</motion.div>
					<motion.div
						className={classNames(
							"w-fit max-w-full flex flex-col gap-2 bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.08)] p-2 rounded-xl",
							left ? "mr-3 origin-top-left" : "ml-3 origin-top-right"
						)}
						initial={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
						exit={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
						animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
						transition={TRANSITION}
					>
						<div className="w-full flex flex-row gap-2 p-1">
							<p className="font-semibold text-primary flex-1">{component.description}</p>
						</div>
						{(component.type == "component" || component.type == "componentAndOverride") && (
							<Button primary style={{ backgroundColor: color }} shadowColor={color} onClick={onInsertComponentClick}>
								Insert Component
							</Button>
						)}
						{component.type == "override" && (
							<Button primary style={{ backgroundColor: color }} shadowColor={color} onClick={onCopyOverrideClick}>
								Copy Code Override
							</Button>
						)}
						{component.type == "componentAndOverride" && <Button onClick={onCopyOverrideClick}>Copy Code Override</Button>}
						{component.type == "codeSnippet" && (
							<Button primary style={{ backgroundColor: color }} shadowColor={color} onClick={onCodeSnippetClick}>
								Add Code Snippet to Site Settings
							</Button>
						)}
					</motion.div>
				</div>
			</motion.div>
		</motion.div>
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

function getChildIndex(child) {
	if (!child) {
		return -1;
	}

	let parent = child.parentNode;
	if (!parent) {
		return -1; // Child has no parent
	}

	let children = parent.children;
	for (let i = 0; i < children.length; i++) {
		if (children[i] === child) {
			return i;
		}
	}

	return -1; // Child not found in parent
}
