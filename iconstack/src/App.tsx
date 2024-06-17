import { framer, CanvasNode } from "framer-plugin";
import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";

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
	width: 290,
	height: 550,
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

	const [iconPack, setIconPack] = useState(iconPacks[0]);
	const [iconType, setIconType] = useState(ICON_PACKS[iconPacks[0].name]?.types?.[0]?.[1]);
	const [icon, setIcon] = useState(null);

	const iconPackData = ICON_PACKS[iconPack?.name];
	const iconNames = iconPackData?.iconNames || iconPackData?.iconIds;

	const handleAddSvg = async () => {
		await framer.addSVG({
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="#999" d="M20 0v8h-8L4 0ZM4 8h8l8 8h-8v8l-8-8Z"/></svg>`,
			name: "Logo.svg",
		});
	};

	async function onCopySVGClick() {
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
			await navigator.clipboard.writeText(svgText);
		} catch (error) {
			console.error("Failed to fetch and copy SVG:", error);
		}
	}

	function changeIconPack(newIconPack) {
		if (newIconPack && newIconPack !== iconPack) {
			setIconPack(newIconPack);
			setIconType(ICON_PACKS[iconPack.name]?.types[0][1]);
			setIcon(null);
		}
	}

	function onIconTypeChange(newIconType) {
		setIconType(newIconType);
	}

	return (
		<main className="flex flex-col size-full select-none text-color-base">
			<div className="flex flex-row overflow-hidden flex-1">
				<div className="relative flex flex-col flex-1 overflow-x-hidden">
					{iconPack && (
						<>
							<div className="relative flex flex-col w-full p-3 pt-0 gap-2">
								<div className="flex flex-col gap-2">
									<select
										value={iconPack.name}
										className="pl-2 w-full"
										onChange={(event) => changeIconPack(iconPacks.find((iconPack) => iconPack.name === event.target.value))}
									>
										{iconPacks.map((iconPack) => (
											<option key={iconPack.name} value={iconPack.name}>
												{iconPack.name}
											</option>
										))}
									</select>
									{iconPackData?.types &&
										(iconPackData.types.length < 5 ? (
											<SegmentedControl
												id={iconPack?.name}
												items={iconPackData.types.map((type) => type[0])}
												// itemTitles={iconPackData.types.map((type) => type[0])}
												currentItem={iconType}
												onChange={onIconTypeChange}
											/>
										) : (
											<select
												value={iconType}
												className="pl-2 pr-5 w-full"
												onChange={(event) => onIconTypeChange(event.target.value)}
											>
												{iconPackData.types.map((type) => (
													<option value={type[0]}>{type[0]}</option>
												))}
											</select>
										))}
								</div>
								{/* <SearchBar
									placeholder={`Search ${iconGroup?.length.toLocaleString() ?? 0} Icons...`}
									value={iconSearch}
									onChange={setIconSearch}
								/> */}
								<div className="absolute h-[1px] inset-x-3 bottom-0 bg-divider"></div>
							</div>
							<div className="hide-scrollbar flex flex-col overflow-y-auto p-3 pt-0 flex-1">
								<div className="flex flex-col gap-3">
									<div className="relative flex flex-col gap-3 py-3">
										<div className="flex flex-row justify-between gap-1 w-full">
											<span>{iconPack?.name}</span>
											<span className="font-medium text-color-secondary">
												{iconPackData?.iconIds?.length.toLocaleString() ?? 0} Icons
											</span>
										</div>
										<div className="flex flex-row gap-2 w-full">
											{iconPack?.licenseUrl && (
												<Button newTab href={iconPack.licenseUrl.replace("[github]", iconPack.github)} className="flex-1">
													{iconPack.license} License
												</Button>
											)}
											{iconPack?.website && (
												<Button square={iconPack?.licenseUrl} newTab className="flex-1" href={iconPack.website}>
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
											{iconPack?.github && (
												<Button square={iconPack?.licenseUrl} newTab className="flex-1" href={iconPack.github}>
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
									<div className="grid w-full grid-cols-[52px,52px,52px,52px,52px]">
										{iconPackData?.iconIds?.slice(0, 50).map((iconId, index) => {
											const iconName = iconNames[index];

											let searchClassName = "";
											// if (filteredIcons) {
											// 	if (filteredIcons.includes(iconName)) {
											// 		if (iconSearchValue === iconName) {
											// 			searchClassName = "search-exact-match";
											// 		} else if (iconName.startsWith(iconSearchValue)) {
											// 			searchClassName = "search-starts-with";
											// 		}
											// 	} else {
											// 		searchClassName = "search-hidden";
											// 	}
											// }

											return (
												<div
													key={iconPack?.cdnId + iconId}
													className={searchClassName + " icon-div"}
													onClick={() => setIcon(icon === iconId ? null : iconId)}
												>
													{icon === iconId && (
														<div
															className="absolute inset-0 border-2 border-tint rounded-[inherit] "
															style={{
																backgroundColor: "rgba(0, 153, 255, 0.1)",
																boxShadow: "0 4px 8px 0 rgba(0, 153, 255, 0.2)",
															}}
														/>
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
										})}
									</div>
								</div>
							</div>
						</>
					)}
					{icon && (
						<div
							className="relative flex flex-col p-3 gap-3 bg-bg border-t border-divider"
							style={{
								boxShadow: "0 0 12px 0 rgba(0,0,0,0.1)",
							}}
						>
							<div className="flex flex-row gap-2 flex-1 pt-0.5">
								<div className="relative size-[80px] bg-bg-secondary rounded">
									<img
										className="dark-invert absolute size-[64px] top-1.5 left-1.5"
										src={`https://files.svgcdn.io/${iconPack.cdnId}/${icon}.svg`}
										alt={icon}
									/>
								</div>
								<div className="flex flex-col gap-1 flex-1 pt-0.5">
									<span>{iconNames[iconPackData?.iconIds?.indexOf(icon)]}</span>
									<span className="font-medium text-color-secondary">{iconPack?.name}</span>
								</div>
							</div>
							<div className="flex flex-row gap-2 items-end flex-1">
								<Button primary className="flex-1">
									Insert Icon
								</Button>
								<Button onClick={onCopySVGClick} className="flex-1">
									Copy SVG
								</Button>
							</div>
							<XIcon className="absolute top-3 right-3" onClick={() => setIcon(null)} />
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
