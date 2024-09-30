import { framer, Draggable } from "framer-plugin";
import { useState, useRef, useEffect, Fragment } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { tags, icons, components } from "./framestackData";
import { ComponentIcons } from "./componentIcons";
import { SearchBar } from "@shared/components";
import Button from "@shared/Button";
import "./App.css";
import classNames from "classnames";
import { useSupabase } from "./supabase";
import Tier from "./tier";

const TRANSITION = {
	type: "spring",
	stiffness: "1000",
	damping: "80",
	delay: 0,
	mass: 1,
};

framer.showUI({
	position: "top left",
	width: 300,
	height: 550,
	minHeight: 400,
	resizable: "height",
});

const FRAMESTACK_GRADIENT = "linear-gradient(70deg, #6019FA, #00CCFF)";
const TAG_COLORS = [
	"#8636FF",
	"#3666FF",
	"#25A1FF",
	"#39C7C7",
	"#43D066",
	"#FFB300",
	"#FF8822",
	"#FF4488",
];

export function App() {
	const [selectedComponent, setSelectedComponent] = useState(null);
	const [searchText, setSearchText] = useState("");
	const [tagMenuOpen, setTagMenuOpen] = useState(false);
	const containerRef = useRef(null);
	const searchContainerRef = useRef(null);
	const tagRefs = useRef([]);
	const selectedTagIndexRef = useRef(-1);
	const { tier } = useSupabase();

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

	return (
		<main className="relative size-full select-none">
			<motion.div
				className={classNames(
					"flex flex-col gap-2 flex-1 size-full overflow-hidden",
					selectedComponent && "pointer-events-none"
				)}
				animate={{
					scale: selectedComponent ? 0.95 : 1,
				}}
				transition={TRANSITION}
			>
				<SearchBar
					placeholder="Search Components..."
					value={searchText}
					onChange={setSearchText}
					className="mx-3"
				/>
				<div
					key="search-container"
					className={classNames("relative flex-1 overflow-hidden", !searchText && "hidden")}
				>
					<div
						ref={searchContainerRef}
						className="relative flex flex-col overflow-y-auto gap-6 px-3 h-full"
					>
						<TileGrid>
							{components
								.filter((component) =>
									component.name.toLowerCase().includes(searchText.toLowerCase())
								)
								.map((component, _) => (
									<ComponentTile
										key={component.name}
										component={component}
										onClick={() => setSelectedComponent(component)}
									/>
								))}
						</TileGrid>
					</div>
					<RoundedOverlay />
				</div>
				<div
					className={classNames(
						"relative w-full flex flex-col flex-1 overflow-hidden",
						searchText && "!hidden"
					)}
				>
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
										<span className="relative flex-1 pt-px pointer-events-none">{tag}</span>
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
													onClick={() => setSelectedComponent(component)}
												/>
											))}
									</TileGrid>
								</motion.div>
							</Fragment>
						))}
					</motion.div>
					<RoundedOverlay />
				</div>
				<div className="flex flex-row gap-2 px-3 pb-3">
					{tier == Tier.NoUser ? (
						<>
							<Button className="flex-1">Log In</Button>
							<Button primary className="flex-1">
								Sign Up
							</Button>
						</>
					) : (
						<Button primary>Upgrade to Pro</Button>
					)}
				</div>
			</motion.div>
			<AnimatePresence>
				{selectedComponent && (
					<ComponentWindow
						component={selectedComponent}
						onClose={() => setSelectedComponent(null)}
					/>
				)}
			</AnimatePresence>
		</main>
	);
}

function TileGrid({ children, className = "" }) {
	return (
		<div
			className={classNames(
				"grid grid-cols-2 grid-rows-[min-content] gap-2 grid-flow-dense mb-3 bg-primary",
				className
			)}
		>
			{children}
		</div>
	);
}

function ComponentTile({ component, className = "", onClick = null }) {
	const icon = getComponentIcon(component);

	return (
		<ComponentDraggable component={component}>
			<div
				key={component.name}
				onClick={onClick}
				className={classNames(
					"relative flex flex-col items-center justify-center w-full rounded-lg bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.08)] transition-colors aspect-square",
					onClick && "cursor-pointer",
					className
				)}
			>
				{icon && (
					<img src={icon} alt={component.name} className="w-full flex-1 pointer-events-none" />
				)}
				<span className="w-full text-center px-1.5 pb-3 text-[11px] text-primary font-semibold">
					{component.name}
				</span>
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
		</ComponentDraggable>
	);
}

function ComponentWindow({ component, onClose }) {
	const { tier } = useSupabase();

	const [loading, setLoading] = useState(false);

	const isLocked = component.free ? tier < Tier.Free : tier < Tier.Pro;

	const color = TAG_COLORS[tags.indexOf(component.tag)];
	const icon = getComponentIcon(component);

	useEffect(() => {
		const handleEscapeKey = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscapeKey);

		return () => {
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, []);

	const motionProps = (index) => ({
		variants: {
			in: {
				opacity: 1,
				y: 0,
				filter: "blur(0px)",
				scale: 1,
				transition: {
					type: "spring",
					duration: 0.4,
					bounce: 0,
					delay: index * 0.025,
				},
			},
			out: {
				opacity: 0,
				y: 30,
				filter: "blur(5px)",
				scale: 0.9,
				transition: { type: "spring", duration: 0.2, bounce: 0 },
			},
		},
		initial: "out",
		animate: "in",
		exit: "out",
	});

	async function onInsertComponentClick() {
		setLoading(true);
		await framer.addComponentInstance({ url: component.componentURL });
		framer.notify(`Inserted ${component.name}`, {
			variant: "success",
		});
		setLoading(false);
		onClose();
	}

	async function onCopyOverrideClick() {
		setLoading(true);
		let code = component.code;
		for (const propertyId in component.controls) {
			const property = component.controls[propertyId];
			code = code.replace(`[[${propertyId}]]`, property.defaultValue);
		}

		await navigator.clipboard.writeText(code);
		framer.notify(`Copied ${component.name} code to clipboard`, {
			variant: "success",
		});
		setLoading(false);
	}

	async function onCodeSnippetClick() {
		setLoading(true);
		let code = component.code;
		for (const propertyId in component.controls) {
			const property = component.controls[propertyId];
			code = code.replace(`[[${propertyId}]]`, property.defaultValue);
		}

		await framer.setCustomCode({ html: code, location: "headStart" });
		setLoading(false);
	}

	return (
		<motion.div
			className="absolute inset-0 flex flex-col justify-center z-10"
			variants={{
				in: { backdropFilter: "blur(8px)" },
				out: { backdropFilter: "blur(0px)" },
			}}
			initial="out"
			animate="in"
			exit="out"
			transition={TRANSITION}
		>
			<motion.div
				onClick={onClose}
				className="absolute inset-0"
				variants={{
					in: { opacity: 1 },
					out: { opacity: 0 },
				}}
				initial="out"
				animate="in"
				exit="out"
				transition={TRANSITION}
			>
				<div className="absolute inset-0 bg-primary opacity-80" />
			</motion.div>
			<motion.div className="relative flex flex-col gap-3 justify-center px-3">
				<motion.div className="flex flex-col w-full gap-2" {...motionProps(0)}>
					<span
						onClick={onClose}
						className={`text-tertiary flex-row items-center gap-1 cursor-pointer w-max pr-1`}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
							<g transform="translate(1.5 1)">
								<path
									d="M 3.5 0 L 0 4 L 3.5 7.5"
									fill="transparent"
									strokeWidth="1.5"
									stroke="currentColor"
									strokeLinecap="round"
								></path>
							</g>
						</svg>
						Back
					</span>
					<motion.h1 className="text-primary text-xl font-bold">{component.name}</motion.h1>
				</motion.div>
				<motion.div
					className="rounded-xl overflow-hidden w-full relative flex flex-col justify-end"
					{...motionProps(1)}
				>
					<div className="relative flex flex-col items-center justify-center w-full rounded-xl bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.08)] transition-colors aspect-[3/2]">
						{icon && (
							<img src={icon} alt={component.name} className="w-full flex-1 pointer-events-none" />
						)}
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
				</motion.div>
				<motion.p className="text-secondary w-full" {...motionProps(1)}>
					{component.description}
				</motion.p>
				<motion.div className="flex flex-col gap-2 w-full" {...motionProps(3)}>
					{isLocked ? (
						<Button customColor={color} className="text-reversed">
							{component.free ? "Sign Up to Unlock for Free" : "Upgrade to Pro"}
						</Button>
					) : (
						<>
							{(component.type == "component" || component.type == "componentAndOverride") && (
								<Button
									customColor={color}
									onClick={onInsertComponentClick}
									loading={loading}
									className="text-reversed"
								>
									Insert Component
								</Button>
							)}
							{component.type == "override" && (
								<Button
									customColor={color}
									onClick={onCopyOverrideClick}
									loading={loading}
									className="text-reversed"
								>
									Copy Code Override
								</Button>
							)}
							{component.type == "componentAndOverride" && (
								<Button onClick={onCopyOverrideClick} loading={loading}>
									Copy Code Override
								</Button>
							)}
							{component.type == "codeSnippet" && (
								<Button
									customColor={color}
									onClick={onCodeSnippetClick}
									loading={loading}
									className="text-reversed"
								>
									Add Code Snippet to Site Settings
								</Button>
							)}
						</>
					)}
				</motion.div>
			</motion.div>
		</motion.div>
	);
}

function ComponentDraggable({ component, children }) {
	const { tier } = useSupabase();

	const isLocked = component.free ? tier < Tier.Free : tier < Tier.Pro;

	return component.type === "component" && !isLocked ? (
		<Draggable
			data={{
				type: "component",
				moduleUrl: component.componentURL,
			}}
		>
			{children}
		</Draggable>
	) : (
		children
	);
}

function RoundedOverlay() {
	return (
		<>
			<div className="absolute -top-2 left-1 right-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[20px] h-4 pointer-events-none" />
			<div className="absolute -top-2 right-1 left-[calc(50%-5px)] border-[10px] border-b-[0px] border-primary rounded-t-[20px] h-4 pointer-events-none" />
			<div className="absolute -bottom-2 left-1 right-[calc(50%-5px)] border-[10px] border-t-[0px] border-primary rounded-b-[20px] h-4 pointer-events-none" />
			<div className="absolute -bottom-2 right-1 left-[calc(50%-5px)] border-[10px] border-t-[0px] border-primary rounded-b-[20px] h-4 pointer-events-none" />
		</>
	);
}

function getComponentIcon(component) {
	let icon = ComponentIcons[component.name];
	if (icon) {
		const color = TAG_COLORS[tags.indexOf(component.tag)];
		icon = icon.replace(/#0075FF/g, color);

		if (icon.includes('<feColorMatrix type="matrix"')) {
			icon = icon.replace(
				/0 0 0 0 0 0 0 0 0 0.458824 0 0 0 0 1 0 0 0 0.2 0/g,
				hexToColorMatrixWithOpacity(color)
			);
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
