import { framer, ColorStyle } from "framer-plugin";
import { useState, useRef, useEffect, useContext } from "react";
import "./App.css";
import { iconPacks } from "./IconstackData.jsx";
import { SearchBar, XIcon, SegmentedControl } from "@shared/components.jsx";
import Button from "@shared/Button.jsx";
import classNames from "classnames";
import { PageStack, PageStackContext, BackButton } from "@shared/PageStack.jsx";

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

const ICON_HEIGHT = 52;
const MAX_VISIBLE_ROWS = 10;
const ICONS_PER_ROW = 5;

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
	position: "top left",
	width: 290,
	height: 550,
});

export function App() {
	return (
		<main className="flex flex-col size-full select-none text-primary">
			<PageStack homePage={<HomePage />} />
		</main>
	);
}

function HomePage() {
	const { openModal } = useContext(PageStackContext);

	const [iconPack, setIconPack] = useState(iconPacks[0]);
	const [iconType, setIconType] = useState(0);
	const [icon, setIcon] = useState(null);
	const [pinnedIconPacks, setPinnedIconPacks] = useState([]);
	const [searchText, setSearchText] = useState("");
	const [iconGroups, setIconGroups] = useState(generateIconGroups(ICON_PACKS[iconPack?.name]));
	const [rowsVisible, setRowsVisible] = useState(MAX_VISIBLE_ROWS);

	const scrollContainerRef = useRef(null);
	const rowsVisibleRef = useRef(rowsVisible);

	const iconPackData = ICON_PACKS[iconPack?.name];
	const iconNames = iconPackData?.iconNames || iconPackData?.iconIds;
	const iconGroup = iconGroups[iconType];
	const searchValue = searchText.toLowerCase().replace(/\s/g, "-");
	const filteredIcons =
		searchValue.length > 0
			? iconGroup.filter((iconName) => iconName.includes(searchValue))
			: iconGroup;

	useEffect(() => {
		const scrollContainer = scrollContainerRef.current;

		function onScroll() {
			const scrollTop = scrollContainer.scrollTop;
			const newBottomRow = Math.floor(scrollTop / ICON_HEIGHT) + MAX_VISIBLE_ROWS;

			if (newBottomRow > rowsVisibleRef.current) {
				rowsVisibleRef.current = newBottomRow;
				setRowsVisible(newBottomRow);
			}
		}

		if (scrollContainer) {
			scrollContainer.addEventListener("scroll", onScroll);
		}

		return () => {
			if (scrollContainer) {
				scrollContainer.removeEventListener("scroll", onScroll);
			}
		};
	}, []);

	async function onIconActionButtonClick(copy = true) {
		const url = `https://files.svgcdn.io/${iconPack.cdnId}/${icon}.svg`;

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
			if (copy) {
				await navigator.clipboard.writeText(svgText);
			} else {
				const iconName =
					(iconPackData.iconNames ? iconNames[iconPackData.iconIds.indexOf(icon)] : icon) ?? "Icon";
				await framer.addSVG({
					svg: svgText,
					name: `${iconName}.svg`,
				});
			}
		} catch (error) {
			console.error("Failed to fetch and copy SVG:", error);
		}
	}

	function changeIconType(newIconType) {
		setIconType(newIconType);
		setIcon(null);

		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = 0;
		}

		rowsVisibleRef.current = MAX_VISIBLE_ROWS;
		setRowsVisible(MAX_VISIBLE_ROWS);
	}

	function changeIconPack(newIconPack) {
		if (newIconPack && newIconPack !== iconPack) {
			setIconPack(newIconPack);
			setIconGroups(generateIconGroups(ICON_PACKS[newIconPack?.name]));
			changeIconType(0);
		}
	}

	function onPinButtonClick() {
		if (pinnedIconPacks.includes(iconPack)) {
			setPinnedIconPacks(pinnedIconPacks.filter((item) => item !== iconPack));
		} else {
			setPinnedIconPacks([...pinnedIconPacks, iconPack]);
		}
	}

	let visibleIconCount = 0;
	const visibleIcons = rowsVisible * ICONS_PER_ROW;

	const icons: any[] = [];

	for (let i = 0; i < iconPackData?.iconIds?.length; i++) {
		if (visibleIconCount >= visibleIcons) {
			break;
		}

		const iconId = iconPackData?.iconIds[i];
		const iconName = iconNames[i];

		let searchClassName = "";
		if (filteredIcons.includes(iconName)) {
			if (searchValue === iconName) {
				searchClassName = "search-exact-match";
			} else if (iconName.startsWith(searchValue)) {
				searchClassName = "search-starts-with";
			}

			visibleIconCount++;
		} else {
			searchClassName = "search-hidden";
		}

		icons.push(
			<div
				key={iconPack?.cdnId + iconId}
				className={searchClassName + " icon-div"}
				onClick={() => setIcon(icon === iconId ? null : iconId)}
			>
				{icon === iconId && (
					<div className="absolute inset-0 border-2 border-tint rounded-[inherit]">
						<div
							className="absolute inset-0 bg-tint opacity-10"
							style={{
								boxShadow: "0 6px 12px 0 var(--framer-color-tint)",
							}}
						/>
					</div>
				)}
				<img
					className="icon-img"
					src={`https://files.svgcdn.io/${iconPack?.cdnId}/${iconId}.svg`}
					alt={iconName}
					loading="lazy"
					referrerPolicy="no-referrer"
					width={24}
					height={24}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-row overflow-hidden flex-1 h-full">
			<div className="relative flex flex-col h-full overflow-x-hidden">
				<div className="relative flex flex-col w-full px-3 pb-3 gap-2">
					<div className="flex flex-row gap-2">
						<select
							value={iconPack.name}
							className="flex-1"
							onChange={(event) =>
								changeIconPack(iconPacks.find((iconPack) => iconPack.name === event.target.value))
							}
						>
							{pinnedIconPacks
								.slice()
								.reverse()
								.map((iconPack) => (
									<option key={iconPack.name} value={iconPack.name}>
										{iconPack.name}
									</option>
								))}
							{pinnedIconPacks.length > 0 && <hr />}
							{iconPacks.map((iconPack) =>
								pinnedIconPacks.includes(iconPack) ? (
									<></>
								) : (
									<option key={iconPack.name} value={iconPack.name}>
										{iconPack.name}
									</option>
								)
							)}
						</select>
						<Button square onClick={onPinButtonClick}>
							{pinnedIconPacks.includes(iconPack) ? (
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
						</Button>
						<Button square onClick={() => openModal(<IconPackInfoPage iconPack={iconPack} />)}>
							<svg
								width="18"
								height="18"
								viewBox="0 0 18 18"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect x="8" y="3" width="2" height="2" rx="1" fill="currentColor" />
								<rect x="8" y="7" width="2" height="8" rx="1" fill="currentColor" />
							</svg>
						</Button>
						<Button square onClick={() => openModal(<CustomizationMenu />)}>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
								<path
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16v4m9.5-13.5l4 4"
								/>
							</svg>
						</Button>
					</div>
					{iconPackData?.types &&
						(iconPackData.types.length < 5 ? (
							<SegmentedControl
								id={iconPack?.name}
								items={Array.from({ length: iconPackData.types.length }, (_, i) => i)}
								itemTitles={iconPackData.typeNames}
								currentItem={iconType}
								onChange={changeIconType}
							/>
						) : (
							<select
								value={iconType}
								className="w-full"
								onChange={(event) => setIconType(parseInt(event.target.value))}
							>
								{iconPackData.typeNames.map((type, index) => (
									<option key={type} value={index}>
										{type}
									</option>
								))}
							</select>
						))}
					<SearchBar
						placeholder={`Search ${iconGroup?.length.toLocaleString() ?? 0} Icons...`}
						value={searchText}
						onChange={setSearchText}
					/>
					<div className="absolute h-px inset-x-3 bottom-0 bg-divider"></div>
				</div>
				<div ref={scrollContainerRef} className="hide-scrollbar overflow-y-auto flex-1 p-3">
					<div
						className="grid w-full"
						style={{
							gridTemplateColumns: `repeat(${ICONS_PER_ROW}, ${ICON_HEIGHT}px)`,
							gridTemplateRows: `repeat(auto-fill, ${ICON_HEIGHT}px)`,
							height: Math.ceil((filteredIcons?.length ?? 0) / ICONS_PER_ROW) * ICON_HEIGHT,
						}}
					>
						{icons}
					</div>
				</div>
				{icon && (
					<div
						className="relative flex flex-col p-3 gap-3 bg-primary border-t border-divider"
						style={{
							boxShadow: "0 -12px 12px -12px rgba(0,0,0,0.05)",
						}}
					>
						<div className="flex flex-row gap-2.5 flex-1 pt-0.5">
							<div className="relative size-[80px] bg-secondary rounded">
								<img
									className="dark-invert absolute size-[64px] top-1.5 left-1.5"
									src={`https://files.svgcdn.io/${iconPack.cdnId}/${icon}.svg`}
									alt={icon}
								/>
							</div>
							<div className="flex flex-col gap-1 flex-1 pt-0.5">
								<span className="font-semibold">
									{iconNames[iconPackData?.iconIds?.indexOf(icon)]}
								</span>
								<span className="text-secondary">{iconPack?.name}</span>
							</div>
						</div>
						<div className="flex flex-row gap-2 items-end flex-1">
							<CopySVGButton copyFunction={async () => await onIconActionButtonClick(true)} />
							<Button primary onClick={() => onIconActionButtonClick(false)} className="flex-1">
								Insert Icon
							</Button>
						</div>
						<XIcon className="absolute top-4 right-4" onClick={() => setIcon(null)} />
					</div>
				)}
			</div>
		</div>
	);
}

function IconPackInfoPage({ iconPack }) {
	const { closeModal } = useContext(PageStackContext);

	const iconPackData = ICON_PACKS[iconPack?.name];

	return (
		<div className="flex flex-col size-full p-3 gap-2">
			<XIcon className="absolute top-4 right-4" onClick={closeModal} />
			<h1 className="text-sm font-bold -mb-1">{iconPack?.name}</h1>
			<p className="mb-1">{iconPackData?.iconIds?.length.toLocaleString() ?? 0} Icons</p>
			{iconPack?.licenseUrl && (
				<Button
					newTab
					href={iconPack.licenseUrl.replace("[github]", iconPack.github)}
					className="flex-1"
				>
					{iconPack.license} License
				</Button>
			)}
			{iconPack?.github && (
				<Button newTab href={iconPack.github}>
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
					GitHub
				</Button>
			)}
			{iconPack?.website && (
				<Button primary newTab href={iconPack.website}>
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
					{new URL(iconPack.website).hostname}
				</Button>
			)}
		</div>
	);
}

function generateIconGroups(iconPackData) {
	const types = iconPackData?.types;
	const iconNames = iconPackData?.iconNames || iconPackData?.iconIds;

	if (types) {
		const newIconGroups = Array.from({ length: types?.length ?? 1 }, (_, i) => []);

		let nullIndex = -1;
		for (let i = 0; i < types.length; i++) {
			if (types[i] == null) {
				nullIndex = i;
				break;
			}
		}

		for (const iconName of iconNames) {
			let groupIndex = nullIndex;
			for (let i = 0; i < types.length; i++) {
				const typeEnding = types[i];
				if (typeEnding !== null) {
					if (iconName.endsWith(typeEnding)) {
						groupIndex = i;
						break;
					}
				}
			}

			newIconGroups[groupIndex]?.push(iconName);
		}

		return newIconGroups;
	}

	return [iconPackData.iconIds];
}

function CopySVGButton({ copyFunction }) {
	const [isCopied, setIsCopied] = useState(false);

	async function onClick() {
		await copyFunction();
		setIsCopied(true);

		setTimeout(() => {
			setIsCopied(false);
		}, 2000);
	}

	return (
		<Button onClick={onClick} className="flex-1">
			{isCopied ? "Copied!" : "Copy SVG"}
		</Button>
	);
}

function CustomizationMenu() {
	const { closeModal } = useContext(PageStackContext);

	const [size, setSize] = useState(16);
	const [selectedColorStyle, setSelectedColorStyle] = useState<ColorStyle | null>(null);
	const [customColor, setCustomColor] = useState("#000");
	const colorPickerRef = useRef(null);

	const [colorStyles, setColorStyles] = useState<ColorStyle[]>([]);
	const theme = useTheme();

	useEffect(() => {
		framer.getColorStyles().then(setColorStyles);

		framer.subscribeToColorStyles((colorStyles) => {
			setColorStyles(colorStyles);
		});
	}, []);

	return (
		<div className="flex flex-col size-full px-3 pb-3 gap-2">
			<div className="min-h-10 flex flex-row items-center text-primary font-semibold -mb-2">
				Customization
			</div>
			<XIcon className="absolute top-4 right-4" onClick={closeModal} />
			<PropertyControl title="Size">
				<div className="flex flex-row gap-2 w-full">
					<input
						type="number"
						min="1"
						max="100"
						value={size}
						onChange={(e) => setSize(parseInt(e.target.value))}
						className="w-1/2"
					/>
					<div className="flex flex-row bg-secondary rounded h-6 w-1/2 text-tertiary items-center">
						<div
							onClick={() => setSize(Math.max(size - 1, 1))}
							className="flex flex-1 justify-center items-center h-full cursor-pointer"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
								<path
									d="M 0 4.75 C 0 4.336 0.336 4 0.75 4 L 8.75 4 C 9.164 4 9.5 4.336 9.5 4.75 L 9.5 4.75 C 9.5 5.164 9.164 5.5 8.75 5.5 L 0.75 5.5 C 0.336 5.5 0 5.164 0 4.75 Z"
									fill="currentColor"
								></path>
							</svg>
						</div>
						<div className="min-w-[1px] bg-divider-secondary h-3"></div>
						<div
							onClick={() => setSize(Math.min(size + 1, 1000))}
							className="flex flex-1 justify-center items-center h-full cursor-pointer"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">
								<path
									d="M 4 0.75 C 4 0.336 4.336 0 4.75 0 C 5.164 0 5.5 0.336 5.5 0.75 L 5.5 4 L 8.75 4 C 9.164 4 9.5 4.336 9.5 4.75 C 9.5 5.164 9.164 5.5 8.75 5.5 L 5.5 5.5 L 5.5 8.75 C 5.5 9.164 5.164 9.5 4.75 9.5 C 4.336 9.5 4 9.164 4 8.75 L 4 5.5 L 0.75 5.5 C 0.336 5.5 0 5.164 0 4.75 C 0 4.336 0.336 4 0.75 4 L 4 4 Z"
									fill="currentColor"
								></path>
							</svg>
						</div>
					</div>
				</div>
			</PropertyControl>
			<div className="min-h-10 flex flex-row items-center text-primary font-semibold -mb-2 mt-1 border-t border-divider">
				Color
			</div>
			<div className="flex flex-col relative">
				<div
					className={classNames(
						"flex flex-row gap-2.5 px-2 h-6 items-center cursor-pointer rounded relative",
						!selectedColorStyle ? "bg-secondary text-primary" : "text-secondary"
					)}
					onClick={() => {
						setSelectedColorStyle(null);
					}}
				>
					<div
						className="size-2 relative rounded-full pointer-events-none"
						style={{
							backgroundColor: customColor,
						}}
					>
						<div className="absolute size-full rounded-full border border-[#000] dark:border-[#fff] opacity-10" />
					</div>
					Custom
					<span className="flex-1 text-right text-tertiary pointer-events-none">
						{customColor.toUpperCase()}
					</span>
					<input
						type="color"
						value={customColor}
						onChange={(e) => setCustomColor(e.target.value)}
						className="absolute opacity-0 inset-0 w-full cursor-pointer"
					/>
				</div>
				{colorStyles.map((colorStyle) => (
					<div
						key={colorStyle.id}
						className={classNames(
							"flex flex-row gap-2.5 px-2 h-6 items-center cursor-pointer rounded",
							selectedColorStyle == colorStyle ? "bg-secondary text-primary" : "text-secondary"
						)}
						onClick={() => setSelectedColorStyle(colorStyle)}
					>
						<div
							className="size-2 relative rounded-full"
							style={{
								backgroundColor:
									theme === "light" ? colorStyle.light : colorStyle.dark || colorStyle.light,
							}}
						>
							<div className="absolute size-full rounded-full border border-[#000] dark:border-[#fff] opacity-10" />
						</div>
						{colorStyle.name}
					</div>
				))}
			</div>
			<div className="w-full min-h-[1px] bg-divider my-1" />
			<Button primary onClick={closeModal}>
				Done
			</Button>
		</div>
	);
}

function PropertyControl({ title, children, disabled = false }) {
	return (
		<div
			className={classNames(
				"grid gap-2 w-full items-center transition-opacity",
				disabled && "opacity-50 pointer-events-none"
			)}
			style={{
				gridTemplateColumns: "minmax(0,1.5fr) repeat(2,minmax(62px,1fr))",
			}}
		>
			<span className="text-secondary pl-2">{title}</span>
			<div className="col-span-2">{children}</div>
		</div>
	);
}

type Theme = "light" | "dark";

function useTheme() {
	const [theme, setTheme] = useState<Theme>(
		(document.body.getAttribute("data-framer-theme") as Theme) ?? "light"
	);

	const handle = (mutationsList: MutationRecord[]) => {
		for (const mutation of mutationsList) {
			if (mutation.type === "attributes" && mutation.attributeName === "data-framer-theme") {
				setTheme(document.body.getAttribute("data-framer-theme") as Theme);
				break;
			}
		}
	};

	useEffect(() => {
		const mutationObserver = new MutationObserver(handle);

		mutationObserver.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-framer-theme"],
		});

		return () => {
			mutationObserver.disconnect();
		};
	}, []);

	return theme;
}
