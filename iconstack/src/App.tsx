import { framer, CanvasNode } from "framer-plugin";
import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";

import { motion } from "framer-motion";
import { iconPacks } from "./IconstackData.jsx";
import { SearchBar, Button, PropertyControl, XIcon, SegmentedControl } from "./FramerUIComponents.jsx";

import TablerIcons from "./icon-packs/TablerIcons.json";
import FeatherIcons from "./icon-packs/FeatherIcons.json";
import LucideIcons from "./icon-packs/LucideIcons.json";
import AkarIcons from "./icon-packs/AkarIcons.json";
import BasilIcons from "./icon-packs/BasilIcons.json";
import Iconoir from "./icon-packs/Iconoir.json";
import Pixelarticons from "./icon-packs/PixelartIcons.json";
import GameIcons from "./icon-packs/GameIcons.json";
import Heroicons from "./icon-packs/Heroicons.json";
import CarbonIcons from "./icon-packs/CarbonIcons.json";
import JamIcons from "./icon-packs/JamIcons.json";
import SimpleIcons from "./icon-packs/SimpleIcons.json";
import Ionicons from "./icon-packs/IonIcons.json";
import FluentUIIcons from "./icon-packs/FluentUIIcons.json";
import Octicons from "./icon-packs/Octicons.json";
import MaterialIcons from "./icon-packs/MaterialIcons.json";
import RemixIcon from "./icon-packs/RemixIcon.json";
import Majesticons from "./icon-packs/Majesticons.json";
import RadixIcons from "./icon-packs/RadixIcons.json";
import Streamline from "./icon-packs/Streamline.json";
import AntDesign from "./icon-packs/AntDesign.json";
import BootstrapIcons from "./icon-packs/BootstrapIcons.json";
import BoxIcons from "./icon-packs/BoxIcons.json";
import CircumIcons from "./icon-packs/CircumIcons.json";
import CssGG from "./icon-packs/CssGG.json";
import EvaIcons from "./icon-packs/EvaIcons.json";
import Gridicons from "./icon-packs/Gridicons.json";

const ICON_HEIGHT = 56;
const ICONS_PER_ROW = 8;
const ICON_ROWS_VISIBLE = 10;

const ICON_PACKS = {
	"Tabler Icons": TablerIcons,
	"Feather Icons": FeatherIcons,
	"Lucide Icons": LucideIcons,
	"Akar Icons": AkarIcons,
	"Basil Icons": BasilIcons,
	Iconoir: Iconoir,
	Pixelarticons: Pixelarticons,
	"Game Icons": GameIcons,
	"Fluent UI Icons": FluentUIIcons,
	"Material Icons": MaterialIcons,
	Octicons: Octicons,
	Heroicons: Heroicons,
	"Carbon Icons": CarbonIcons,
	"Jam Icons": JamIcons,
	"Simple Icons": SimpleIcons,
	Ionicons: Ionicons,
	"Remix Icon": RemixIcon,
	Majesticons: Majesticons,
	"Radix Icons": RadixIcons,
	Streamline: Streamline,
	"Ant Design Icons": AntDesign,
	"Bootstrap Icons": BootstrapIcons,
	"Box Icons": BoxIcons,
	"Circum Icons": CircumIcons,
	"css.gg": CssGG,
	"Eva Icons": EvaIcons,
	Gridicons: Gridicons,
};

framer.showUI({
	title: "Iconstack",
	position: "top left",
	width: 315,
	height: 500,
});

function useSelection() {
	const [selection, setSelection] = useState<CanvasNode[]>([]);

	useEffect(() => {
		return framer.subscribeToSelection(setSelection);
	}, []);

	return selection;
}

export function App() {
	const selection = useSelection();
	const layer = selection.length === 1 ? "layer" : "layers";

	const handleAddSvg = async () => {
		await framer.addSVG({
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="#999" d="M20 0v8h-8L4 0ZM4 8h8l8 8h-8v8l-8-8Z"/></svg>`,
			name: "Logo.svg",
		});
	};

	const [selectedIconPack, setSelectedIconPack] = useState(iconPacks[0]);
	const [iconSize, setIconSize] = useState(24);
	const [iconColor, setIconColor] = useState("#0099FF");
	const [iconStroke, setIconStroke] = useState(20); // Multiplier of 10
	const [iconPackSearch, setIconPackSearch] = useState("");
	const [pinnedIconPacks, setPinnedIconPacks] = useState([]);

	const icons = ICON_PACKS[selectedIconPack?.name];
	const iconNames = icons?.iconNames || icons?.iconIds;

	let iconPacksList = iconPackSearch.length
		? iconPacks.filter((iconPack) => iconPack.name.toLowerCase().includes(iconPackSearch.toLowerCase()))
		: iconPacks;

	if (pinnedIconPacks.length) {
		const pinned = [];
		const notPinned = [];

		for (const iconPack of iconPacksList) {
			if (pinnedIconPacks.includes(iconPack)) {
				pinned.push(iconPack);
			} else {
				notPinned.push(iconPack);
			}
		}
		iconPacksList = [...pinned, ...notPinned];
	}

	function resetCustomization() {
		setIconSize(24);
		setIconColor("#0099FF");
		setIconStroke(20);
	}

	function changeSelectedIconPack(iconPack) {
		if (iconPack !== selectedIconPack) {
			setSelectedIconPack(iconPack);
		}
	}

	useEffect(() => {
		let newIconGroups = {};

		if (icons?.types) {
			for (const iconType of icons.types) {
				newIconGroups[iconType[1]] = [];
			}

			const endingIconTypes = icons.types.map((type) => type[1]).filter((type) => typeof type === "string");

			for (const iconName of iconNames) {
				let group = null;
				for (const ending of endingIconTypes) {
					if (iconName.endsWith(ending)) {
						group = ending;
						break;
					}
				}

				newIconGroups[group]?.push(iconName);
			}
		} else {
			newIconGroups[null] = iconNames;
		}

		// setIconGroups(newIconGroups);
	}, [selectedIconPack]);

	function onIconPackSearchSubmit() {
		if (iconPackSearch.length) {
			changeSelectedIconPack(iconPacksList[0]);
			setIconPackSearch("");
		}
	}

	function onIconPackPinClick(iconPack) {
		if (pinnedIconPacks.includes(iconPack)) {
			setPinnedIconPacks(pinnedIconPacks.filter((item) => item !== iconPack));
		} else {
			setPinnedIconPacks([...pinnedIconPacks, iconPack]);
		}
	}

	return (
		<main className="flex flex-col size-full select-none text-color-base">
			<div className="flex flex-row overflow-hidden flex-1">
				{/* <div
					style={{
						display: "flex",
						flexDirection: "column",
						width: 244,
						borderRight: "1px solid var(--framer-color-divider)",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							padding: 15,
							paddingTop: 10,
							gap: 15,
							borderBottom: "1px solid var(--framer-color-divider)",
						}}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								width: "100%",
								minHeight: 30,
								alignItems: "center",
							}}
						>
							<span style={{ flex: 1 }}>Customize Icons</span>
							<div
								onClick={resetCustomization}
								title="Reset Customization"
								style={{
									cursor: "pointer",
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									style={{
										display: "block",
										pointerEvents: "none",
										color: "var(--framer-color-text)",
									}}
								>
									<path
										d="M 11.628 7.607 C 11.322 9.935 9.335 11.674 6.986 11.667 C 4.638 11.66 2.661 9.909 2.37 7.579 C 2.079 5.249 3.564 3.066 5.838 2.481 C 8.112 1.898 10.467 3.068 11.336 5.25"
										fill="transparent"
										strokeWidth="1.5"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeDasharray=""
									></path>
									<path
										d="M 11.667 2.333 L 11.667 5.25 L 8.75 5.25"
										fill="transparent"
										strokeWidth="1.5"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeDasharray=""
									></path>
								</svg>
							</div>
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 10,
								paddingLeft: 10,
							}}
						>
							<PropertyControl
								label="Size"
								propertyControl={{
									type: "number",
									displayStepper: true,
									min: 1,
									max: 1000,
								}}
								value={iconSize}
								onChange={setIconSize}
							/>
							<PropertyControl
								label="Stroke"
								propertyControl={{
									type: "number",
									displayStepper: true,
									min: 0.1,
									max: 5,
									multiplier: 10,
								}}
								value={iconStroke}
								onChange={setIconStroke}
							/>
							<PropertyControl
								label="Color"
								propertyControl={{
									type: "color",
								}}
								value={iconColor}
								onChange={setIconColor}
							/>
						</div>
					</div>
					<div
						style={{
							position: "relative",
							display: "flex",
							flexDirection: "row",
							width: "100%",
							padding: "10px 15px",
							gap: 10,
						}}
					>
						<SearchBar
							placeholder={`Search ${iconPacks.length} Icon Packs...`}
							background={false}
							style={{ flex: 1 }}
							value={iconPackSearch}
							onChange={setIconPackSearch}
							onSubmit={onIconPackSearchSubmit}
						/>
						<div
							style={{
								position: "absolute",
								height: 1,
								left: 15,
								right: 15,
								bottom: 0,
								backgroundColor: "var(--framer-color-divider)",
							}}
						/>
					</div>
					<div
						className="framestack-hide-scrollbar"
						style={{
							display: "flex",
							flexDirection: "column",
							overflowY: "auto",
							padding: 15,
							fontWeight: 500,
						}}
					>
						{iconPacksList.map((iconPack) => (
							<IconPackButton
								key={iconPack.name}
								text={iconPack.name}
								selected={selectedIconPack === iconPack}
								pinned={pinnedIconPacks.includes(iconPack)}
								onClick={() => changeSelectedIconPack(iconPack)}
								onPinClick={() => onIconPackPinClick(iconPack)}
							/>
						))}
					</div>
				</div> */}
				<IconGrid selectedIconPack={selectedIconPack} changeSelectedIconPack={changeSelectedIconPack} />
			</div>
		</main>
	);
}

function IconPackButton({ text, selected, pinned, onClick, onPinClick }) {
	return (
		<div
			onClick={onClick}
			className={`flex flex-row items-center pl-2 min-h-6 max-h-6 rounded-s cursor-pointer select-none ${
				selected ? "bg-bg-secondary text-color-base" : "bg-transparent text-color-secondary"
			} ${pinned ? "" : "unpinned"}`}
		>
			<span className="flex-1">{text}</span>
			<motion.div
				onClick={onPinClick}
				className={`pin relative h-6 min-h-6 ${pinned ? "block" : "hidden"}`}
				whileHover={{
					color: "var(--framer-color-text)",
				}}
			>
				{pinned ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="currentColor"
						className="absolute left-[6px] top-[6px]"
					>
						<path d="M15.113 3.21l.094 .083l5.5 5.5a1 1 0 0 1 -1.175 1.59l-3.172 3.171l-1.424 3.797a1 1 0 0 1 -.158 .277l-.07 .08l-1.5 1.5a1 1 0 0 1 -1.32 .082l-.095 -.083l-2.793 -2.792l-3.793 3.792a1 1 0 0 1 -1.497 -1.32l.083 -.094l3.792 -3.793l-2.792 -2.793a1 1 0 0 1 -.083 -1.32l.083 -.094l1.5 -1.5a1 1 0 0 1 .258 -.187l.098 -.042l3.796 -1.425l3.171 -3.17a1 1 0 0 1 1.497 -1.26z" />
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
						className="absolute left-[6px] top-[6px]"
					>
						<path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
						<path d="M9 15l-4.5 4.5" />
						<path d="M14.5 4l5.5 5.5" />
					</svg>
				)}
			</motion.div>
		</div>
	);
}

function IconGrid({ selectedIconPack, changeSelectedIconPack }) {
	const [selectedIcon, setSelectedIcon] = useState(null);
	const [iconSearch, setIconSearch] = useState("");
	const [iconType, setIconType] = useState(null);
	const [iconGroups, setIconGroups] = useState({});
	// const [gridRows, setGridRows] = useState([]);
	const firstRowIndex = useRef(0);
	const gridRowsRef = useRef(null);

	const gridRows = useMemo(() => {
		const rows = [];
		for (let i = 0; i < ICON_ROWS_VISIBLE; i++) {
			rows.push(
				<div
					className="absolute inset-x-0 text-center place-content-center text-xl text-[#000]"
					style={{
						top: i * ICON_HEIGHT,
						height: ICON_HEIGHT,
						backgroundColor: `hsla(${(i * 360 * 2) / ICON_ROWS_VISIBLE}, 100%, 75%, 1)`,
					}}
				>
					{i}
				</div>
			);
		}
		return rows;
	}, []);

	const topVisibleRow = useRef(0);

	const scrollContainerRef = useRef(null);
	const topContainerRef = useRef(null);

	const icons = ICON_PACKS[selectedIconPack?.name];
	const iconGroup = iconGroups[iconType];
	const iconNames = icons?.iconNames || icons?.iconIds;
	const selectedIconName = selectedIcon && icons?.iconIds ? iconNames[icons.iconIds.indexOf(selectedIcon)] : null;
	const iconPackCdnId = selectedIconPack?.cdnId;
	const iconSearchValue = iconSearch.toLowerCase().replace(/\s/g, "-");
	const filteredIcons = iconSearchValue.length ? iconGroup?.filter((iconName) => iconName.includes(iconSearchValue)) : iconGroup;

	function recalculateGridRows(newTopVisibleRow) {
		const scrollContainer = scrollContainerRef.current;
		if (!scrollContainer) {
			return;
		}

		const rowsToReplace = newTopVisibleRow - topVisibleRow.current;
		const newFirstRow = wrapNumber(firstRowIndex.current + rowsToReplace, ICON_ROWS_VISIBLE);

		if (rowsToReplace >= 0) {
			for (let i = 0; i < rowsToReplace; i++) {
				const rowIndex = wrapNumber(firstRowIndex.current + i, ICON_ROWS_VISIBLE);
				const row = gridRowsRef.current?.children[rowIndex];
				if (row) {
					row.style.top = `${(i - rowsToReplace + ICON_ROWS_VISIBLE + newTopVisibleRow) * ICON_HEIGHT}px`;
				}
			}
		} else {
			for (let i = 0; i < -rowsToReplace; i++) {
				const rowIndex = wrapNumber(firstRowIndex.current - (-rowsToReplace - i), ICON_ROWS_VISIBLE);
				const row = gridRowsRef.current?.children[rowIndex];
				if (row) {
					row.style.top = `${(i + newTopVisibleRow) * ICON_HEIGHT}px`;
				}
			}
		}

		topVisibleRow.current = newTopVisibleRow;
		firstRowIndex.current = newFirstRow;
	}

	useEffect(() => {
		recalculateGridRows(0);

		const scrollContainer = scrollContainerRef.current;
		if (scrollContainer) {
			function onScroll() {
				const scrollTop = scrollContainer.scrollTop;
				const topHeight = topContainerRef.current?.offsetHeight ?? 0;
				const containerHeight = scrollContainer.offsetHeight;

				const iconGridScrollTop = scrollTop < topHeight ? 0 : scrollTop - topHeight;
				const newTopVisibleRow = Math.floor(iconGridScrollTop / ICON_HEIGHT);
				if (newTopVisibleRow !== topVisibleRow.current) {
					recalculateGridRows(newTopVisibleRow);
				}
			}

			scrollContainer.addEventListener("scroll", onScroll);

			return () => {
				scrollContainer.removeEventListener("scroll", onScroll);
			};
		}
	}, []);

	useEffect(() => {
		setSelectedIcon("");

		const newIcons = ICON_PACKS[selectedIconPack?.name];
		if (newIcons?.types) {
			setIconType(newIcons.types[0][1]);
		} else {
			setIconType(null);
		}

		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = 0;
		}

		let newIconGroups = {};

		if (icons?.types) {
			for (const iconType of icons.types) {
				newIconGroups[iconType[1]] = [];
			}

			const endingIconTypes = icons.types.map((type) => type[1]).filter((type) => typeof type === "string");

			for (const iconName of iconNames) {
				let group = null;
				for (const ending of endingIconTypes) {
					if (iconName.endsWith(ending)) {
						group = ending;
						break;
					}
				}

				newIconGroups[group]?.push(iconName);
			}
		} else {
			newIconGroups[null] = iconNames;
		}

		setIconGroups(newIconGroups);
	}, [selectedIconPack]);

	async function onCopySVGClick() {
		const url = `https://files.svgcdn.io/${selectedIconPack.cdnId}/${selectedIcon}.svg`;

		try {
			// Fetch the SVG file
			const response = await fetch(url, {
				method: "GET",
				referrerPolicy: "no-referrer",
				credentials: "same-origin",
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
			}
			let svgText = await response.text();
			svgText = svgText;
			// .replace(/strokeWidth="2"/g, `strokeWidth="${iconStroke / 10}"`)
			// .replace(`width="200" height="200"`, `width="${iconSize}" height="${iconSize}"`)
			// .replace(/"currentColor"/g, `"${iconColor}"`);

			// Use the Clipboard API to write the SVG text to the clipboard
			await navigator.clipboard.writeText(svgText);
		} catch (error) {
			console.error("Failed to fetch and copy SVG:", error);
		}
	}

	return (
		<div className="relative flex flex-col flex-1 overflow-x-hidden">
			{selectedIconPack && [
				<div className="relative flex flex-col w-full p-3 pt-0 gap-2">
					<div className="flex flex-row gap-2">
						<select
							value={selectedIconPack.name}
							className="flex-1 pl-2"
							onChange={(event) => changeSelectedIconPack(iconPacks.find((iconPack) => iconPack.name === event.target.value))}
						>
							{iconPacks.map((iconPack) => (
								<option key={iconPack.name} value={iconPack.name}>
									{iconPack.name}
								</option>
							))}
						</select>
						{icons?.types && (
							<select
								value={iconType}
								className="pl-2 pr-5 w-max"
								onChange={(event) => setIconType(event.target.value == "null" ? null : event.target.value)}
							>
								{icons.types.map((type) => (
									<option value={type[1] ?? "null"}>{type[0]}</option>
								))}
							</select>
						)}
					</div>
					<SearchBar
						placeholder={`Search ${iconGroup?.length.toLocaleString() ?? 0} Icons...`}
						value={iconSearch}
						onChange={setIconSearch}
					/>
				</div>,
				// <>
				// 	{iconPacks.map((iconPack) => (
				// 		<IconPackButton
				// 			key={iconPack.name}
				// 			text={iconPack.name}
				// 			selected={selectedIconPack === iconPack}
				// 			pinned={pinnedIconPacks.includes(iconPack)}
				// 			onClick={() => changeSelectedIconPack(iconPack)}
				// 			onPinClick={() => onIconPackPinClick(iconPack)}
				// 		/>
				// 	))}
				// </>,
				<div ref={scrollContainerRef} className="hide-scrollbar flex flex-col overflow-y-auto p-3 pt-0 flex-1">
					<div ref={topContainerRef} className="flex flex-col gap-3">
						<div className="relative flex flex-col gap-3 pt-1 pb-3">
							<div className="flex flex-col gap-1 w-full">
								<span>{selectedIconPack?.name}</span>
								<span className="font-medium text-color-secondary">
									{icons?.iconIds?.length.toLocaleString() ?? 0} Icons
									{iconSearch.length ? ` • ${filteredIcons.length.toLocaleString()} Search Results` : ""}
								</span>
							</div>
							<div className="flex flex-row gap-2 w-full">
							{selectedIconPack?.licenseUrl && (
								<Button newTab href={selectedIconPack.licenseUrl.replace("[github]", selectedIconPack.github)} className="flex-1">
									{selectedIconPack.license} License
								</Button>
							)}
							{selectedIconPack?.website && (
								<Button square={selectedIconPack?.licenseUrl} newTab className="flex-1" href={selectedIconPack.website}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M9 15l6 -6" />
										<path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
										<path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
									</svg>
								</Button>
							)}
							{selectedIconPack?.github && (
								<Button square={selectedIconPack?.licenseUrl} newTab className="flex-1" href={selectedIconPack.github}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
									</svg>
								</Button>
							)}
							</div>
							<div className="absolute h-[1px] inset-x-0 bottom-0 bg-divider"></div>
						</div>
					</div>
					<div
						ref={gridRowsRef}
						className="w-full relative overflow-hidden"
						style={{
							minHeight: Math.ceil(filteredIcons?.length / ICONS_PER_ROW) * ICON_HEIGHT,
							maxHeight: Math.ceil(filteredIcons?.length / ICONS_PER_ROW) * ICON_HEIGHT,
						}}
					>
						{gridRows}
					</div>
					{/* <div
						style={{
							width: "100%",
							display: "grid",
							gridTemplateColumns: "56px 56px 56px 56px 56px 56px 56px 56px",
						}}
					>
						{icons?.iconIds?.slice(0, 100).map((iconId, index) => {
							const iconName = iconNames[index];

							let searchClassName = "";
							if (filteredIcons) {
								if (filteredIcons.includes(iconName)) {
									if (iconSearchValue === iconName) {
										searchClassName = "search-exact-match";
									} else if (iconName.startsWith(iconSearchValue)) {
										searchClassName = "search-starts-with";
									}
								} else {
									searchClassName = "search-hidden";
								}
							}

							return (
								<div
									key={selectedIconPack?.cdnId + iconId}
									className={searchClassName + " framestack-icon-div"}
									onClick={() => setSelectedIcon(selectedIcon === iconId ? null : iconId)}
								>
									{selectedIcon === iconId && (
										<div
											style={{
												position: "absolute",
												inset: 0,
												borderRadius: "inherit",
												border: "2px solid var(--framer-color-tint)",
												backgroundColor: "rgba(0, 153, 255, 0.1)",
												boxShadow: "0 4px 8px 0 rgba(0, 153, 255, 0.2)",
											}}
										/>
									)}
									<img
										className="framestack-icon-img"
										src={`https://files.svgcdn.io/${iconPackCdnId}/${iconId}.svg`}
										alt={iconName}
										loading="lazy"
										referrerPolicy="no-referrer"
										width={24}
										height={24}
									/>
								</div>
							);
						})}
					</div> */}
				</div>,
			]}
			{selectedIcon && (
				<div
					className="relative flex flex-row p-3 gap-3 bg-bg border-t border-divider"
					style={{
						boxShadow: "0 0 12px 0 rgba(0,0,0,0.1)",
					}}
				>
					<div className="relative size-[112px] bg-bg-secondary rounded">
						<img
							className="dark-invert absolute size-[96px] top-1.5 left-1.5"
							src={`https://files.svgcdn.io/${selectedIconPack.cdnId}/${selectedIcon}.svg`}
							alt={selectedIconName}
						/>
					</div>
					<div className="flex flex-col gap-2 flex-1 pt-0.5">
						<span className="text-sm">{selectedIconName}</span>
						<span className="font-medium text-color-secondary">{selectedIconPack?.name}</span>
						<div className="flex flex-row gap-2 items-end flex-1">
							<Button primary className="flex-1">
								Insert Icon
							</Button>
							<Button onClick={onCopySVGClick} className="flex-1">
								Copy SVG
							</Button>
						</div>
					</div>
					<XIcon className="absolute top-3 right-3" onClick={() => setSelectedIcon(null)} />
				</div>
			)}
		</div>
	);
}

function wrapNumber(added, max) {
	while (added < 0) {
		added += max;
	}

	return added % max;
}
