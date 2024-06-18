import { framer, CanvasNode } from "framer-plugin";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import "./App.css";

import { iconPacks } from "./IconstackData.jsx";
import { SearchBar, Button, XIcon, SegmentedControl, BackButton } from "@shared/components.jsx";
import { PageStack } from "@shared/PageStack.jsx";

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

export function App() {
	return (
		<main className="flex flex-col size-full select-none text-color-base">
			<PageStack homePage={HomePage} />
		</main>
	);
}

function HomePage({ openPage }) {
	const [iconPack, setIconPack] = useState(iconPacks[0]);
	const [iconType, setIconType] = useState(0);
	const [icon, setIcon] = useState(null);
	const [pinnedIconPacks, setPinnedIconPacks] = useState([]);
	const [searchText, setSearchText] = useState("");
	const [iconGroups, setIconGroups] = useState(generateIconGroups(ICON_PACKS[iconPack?.name]));

	const iconPackData = ICON_PACKS[iconPack?.name];
	const iconNames = iconPackData?.iconNames || iconPackData?.iconIds;
	const iconGroup = iconGroups[iconType];
	const searchValue = searchText.toLowerCase().replace(/\s/g, "-");
	const filteredIcons = searchValue.length > 0 ? iconGroup.filter((iconName) => iconName.includes(searchValue)) : iconGroup;

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
			setIconType(0);
			setIcon(null);
			setIconGroups(generateIconGroups(ICON_PACKS[newIconPack?.name]));
		}
	}

	function onPinButtonClick() {
		if (pinnedIconPacks.includes(iconPack)) {
			setPinnedIconPacks(pinnedIconPacks.filter((item) => item !== iconPack));
		} else {
			setPinnedIconPacks([...pinnedIconPacks, iconPack]);
		}
	}

	return (
		<div className="flex flex-row overflow-hidden flex-1">
			<div className="relative flex flex-col flex-1 overflow-x-hidden">
				<div className="relative flex flex-col w-full p-3 pt-0 gap-2">
					<div className="flex flex-row gap-2">
						<select
							value={iconPack.name}
							className="pl-2 flex-1"
							onChange={(event) => changeIconPack(iconPacks.find((iconPack) => iconPack.name === event.target.value))}
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
						<Button square onClick={() => openPage(IconPackInfoPage(iconPack))}>
							<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
								<rect x="8" y="3" width="2" height="2" rx="1" fill="currentColor" />
								<rect x="8" y="7" width="2" height="8" rx="1" fill="currentColor" />
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
								onChange={setIconType}
							/>
						) : (
							<select
								value={iconType}
								className="pl-2 pr-5 w-full"
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
					<div className="absolute h-[1px] inset-x-3 bottom-0 bg-divider"></div>
				</div>
				<div className="hide-scrollbar flex flex-col overflow-y-auto p-3 pt-0 flex-1">
					<div className="grid w-full grid-cols-[52px,52px,52px,52px,52px] pt-3">
						{iconPackData?.iconIds?.slice(0, 50).map((iconId, index) => {
							const iconName = iconNames[index];

							let searchClassName = "";
							if (filteredIcons.includes(iconName)) {
								if (searchValue === iconName) {
									searchClassName = "search-exact-match";
								} else if (iconName.startsWith(searchValue)) {
									searchClassName = "search-starts-with";
								}
							} else {
								searchClassName = "search-hidden";
							}

							return (
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
						})}
					</div>
				</div>
				{icon && (
					<div
						className="relative flex flex-col p-3 gap-3 bg-bg border-t border-divider"
						style={{
							boxShadow: "0 -12px 12px -12px rgba(0,0,0,0.05)",
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
								<span className="font-semibold">{iconNames[iconPackData?.iconIds?.indexOf(icon)]}</span>
								<span className="text-color-secondary">{iconPack?.name}</span>
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
	);
}

function IconPackInfoPage(iconPack) {
	return ({ closePage }) => {
		const iconPackData = ICON_PACKS[iconPack?.name];

		return (
			<div className="flex flex-col size-full p-3 pt-0 gap-2">
				<BackButton onClick={closePage} />
				<h1 className="text-xl font-bold -mb-1 mt-1">{iconPack?.name}</h1>
				<p>{iconPackData?.iconIds?.length.toLocaleString() ?? 0} Icons</p>
				<div className="flex-1" />
				{iconPack?.licenseUrl && (
					<Button newTab href={iconPack.licenseUrl.replace("[github]", iconPack.github)} className="flex-1">
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
	};
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

			newIconGroups[groupIndex].push(iconName);
		}

		return newIconGroups;
	}

	return [iconPackData.iconIds];
}
