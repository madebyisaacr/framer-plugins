import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { assert } from "../utils";
import {
	NotionProperty,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	pageContentField,
	richTextToPlainText,
} from "./notion";
import { Fragment, useMemo, useState } from "react";
import classNames from "classnames";
import { IconChevron } from "../components/Icons";
import Button from "@shared/Button";
import { isFullDatabase } from "@notionhq/client";
import { cmsFieldIcons } from "../assets/cmsFieldIcons.jsx";
import { Spinner } from "@shared/spinner/Spinner";
import { usePluginContext, PluginContext } from "../general/PluginContext";
import { updateWindowSize } from "../general/PageWindowSizes";
import { motion, AnimatePresence } from "framer-motion";
import { SegmentedControl, XIcon } from "@shared/components";

const timeMessage = "Time is not supported, so only the date will be imported.";
const peopleMessage =
	"People fields cannot be imported because the FramerSync Notion integration does not have access to users' names.";
const fieldConversionMessages = {
	"date - date": timeMessage,
	"created_time - date": timeMessage,
	"last_edited_time - date": timeMessage,
	"multi_select - string": "Values are imported as a comma-separated list of option names.",
	"files - link": "Only the first file's URL will be included.",
	"files - image":
		"Only the first image will be included. The file must be an image, otherwise importing will fail.",
	"page-icon - string":
		'Only emoji icons are imported as text. To import Notion icons and custom image icons, change the import type to "Image"',
	"page-icon - image":
		'Only Notion icons and custom image icons are imported as images. To import emoji icons, change the import type to "Text"',
	button: "Button fields cannot be imported.",
	people: peopleMessage,
	last_edited_by: peopleMessage,
	created_by: peopleMessage,
};
const notionPropertyTypes = {
	checkbox: "Checkbox",
	created_by: "Created by",
	created_time: "Created time",
	date: "Date",
	email: "Email",
	files: "Files & media",
	formula: "Formula",
	last_edited_by: "Last edited by",
	last_edited_time: "Last edited time",
	multi_select: "Multi-select",
	number: "Number",
	people: "Person",
	phone_number: "Phone number",
	relation: "Relation",
	rich_text: "Text",
	rollup: "Rollup",
	select: "Select",
	status: "Status",
	title: "Title",
	url: "URL",
	button: "Button",
	unique_id: "ID",
	"page-icon": "Image / Emoji",
	"page-cover": "Image",
	"page-content": "Page Content",
};
const cmsFieldTypeNames = {
	boolean: "Toggle",
	color: "Color",
	number: "Number",
	string: "Text",
	formattedText: "Formatted Text",
	image: "Image",
	link: "Link",
	date: "Date",
	enum: "Option",
	slug: "Slug",
	title: "Title",
};

const TRANSITION = {
	type: "spring",
	stiffness: 800,
	damping: 50,
	mass: 1,
};

interface CollectionFieldConfig {
	// field: CollectionField | null;
	property: NotionProperty;
	isNewField: boolean;
	originalFieldName: string;
	unsupported: boolean;
	conversionTypes: string[];
	isPageLevelField: boolean;
}

function sortField(fieldA: CollectionFieldConfig, fieldB: CollectionFieldConfig): number {
	// Sort unsupported fields to bottom
	if (!fieldA.field && !fieldB.field) {
		return 0;
	} else if (!fieldA.field) {
		return 1;
	} else if (!fieldB.field) {
		return -1;
	}

	return -1;
}

function createFieldConfig(
	database: GetDatabaseResponse,
	pluginContext: PluginContext
): CollectionFieldConfig[] {
	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	const regularFields: CollectionFieldConfig[] = [];
	let titleProperty: NotionProperty | null = null;

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		// Title is grouped with other page level properties.
		if (property.type === "title") {
			titleProperty = property;
			continue;
		}

		const conversionTypes = getFieldConversionTypes(property);

		regularFields.push({
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
			unsupported: !conversionTypes.length,
			property,
			conversionTypes,
			isPageLevelField: false,
		});
	}

	const pageLevelFields: CollectionFieldConfig[] = [];

	if (titleProperty) {
		pageLevelFields.push({
			property: titleProperty,
			originalFieldName: titleProperty.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has("title"),
			conversionTypes: ["string", "formattedText"],
			isPageLevelField: true,
			unsupported: false,
		});
	}

	pageLevelFields.push({
		property: {
			id: "page-content",
			name: "Content",
			type: "page-content",
			unsupported: false,
		},
		originalFieldName: pageContentField.name,
		isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(pageContentField.id),
		unsupported: false,
		conversionTypes: ["formattedText"],
		isPageLevelField: true,
	});

	pageLevelFields.push(
		{
			property: {
				id: "page-cover",
				name: "Cover Image",
				type: "page-cover",
				unsupported: false,
			},
			originalFieldName: "Cover Image",
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has("page-cover"),
			conversionTypes: ["image"],
			isPageLevelField: true,
		},
		{
			property: {
				id: "page-icon",
				name: "Icon",
				type: "page-icon",
				unsupported: false,
			},
			originalFieldName: "Icon",
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has("page-icon"),
			conversionTypes: ["image", "string"],
			isPageLevelField: true,
		}
	);

	const result = [...pageLevelFields, ...regularFields];
	return result.sort(sortField);
}

function getFieldNameOverrides(pluginContext: PluginContext): Record<string, string> {
	const result: Record<string, string> = {};
	if (pluginContext.type !== "update") return result;

	for (const field of pluginContext.collectionFields) {
		result[field.id] = field.name;
	}

	return result;
}

function getInitialSlugFieldId(
	context: PluginContext,
	fieldOptions: NotionProperty[]
): string | null {
	if (context.type === "update" && context.slugFieldId) return context.slugFieldId;

	return fieldOptions[0]?.id ?? null;
}

function getLastSyncedTime(
	pluginContext: PluginContext,
	database: GetDatabaseResponse,
	slugFieldId: string,
	disabledFieldIds: Set<string>
): string | null {
	if (pluginContext.type !== "update") return null;

	// Always resync if the slug field changes.
	if (pluginContext.slugFieldId !== slugFieldId) return null;

	// Always resync if field config changes
	if (
		hasFieldConfigurationChanged(
			pluginContext.collectionFields,
			database,
			Array.from(disabledFieldIds)
		)
	) {
		return null;
	}

	return pluginContext.lastSyncedTime;
}

export function MapFieldsPage({
	onSubmit,
	isLoading,
	error,
}: {
	onSubmit: () => void;
	isLoading: boolean;
	error: Error | null;
}) {
	updateWindowSize("MapFields");

	const { pluginContext, updatePluginContext } = usePluginContext();

	const { database } = pluginContext.integrationContext;
	const [settingsMenuFieldConfig, setSettingsMenuFieldConfig] =
		useState<CollectionFieldConfig | null>(null);

	const slugFields = useMemo(() => getPossibleSlugFields(database), [database]);
	const [slugFieldId, setSlugFieldId] = useState<string | null>(() =>
		getInitialSlugFieldId(pluginContext, slugFields)
	);
	const [fieldConfigList] = useState<CollectionFieldConfig[]>(() =>
		createFieldConfig(database, pluginContext)
	);
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext.type === "update" ? pluginContext.ignoredFieldIds : [])
	);
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
		getFieldNameOverrides(pluginContext)
	);
	const [fieldTypes, setFieldTypes] = useState(
		createFieldTypesList(fieldConfigList, pluginContext)
	);

	assert(isFullDatabase(database));

	const onSettingsButtonClick = (fieldConfig: CollectionFieldConfig) => {
		setSettingsMenuFieldConfig(fieldConfig);
	};

	const handleFieldToggle = (key: string) => {
		setDisabledFieldIds((current) => {
			const nextSet = new Set(current);
			if (nextSet.has(key)) {
				nextSet.delete(key);
			} else {
				nextSet.add(key);
			}

			return nextSet;
		});
	};

	const handleFieldNameChange = (id: string, value: string) => {
		setFieldNameOverrides((current) => ({
			...current,
			[id]: value,
		}));
	};

	const handleFieldTypeChange = (id: string, value: string) => {
		setFieldTypes((current) => ({
			...current,
			[id]: value,
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isLoading) return;

		const fields: any[] = [];

		for (const fieldConfig of fieldConfigList) {
			if (
				!fieldConfig ||
				!fieldConfig.property ||
				fieldConfig.unsupported ||
				disabledFieldIds.has(fieldConfig.property.id)
			) {
				continue;
			}

			fields.push(
				getCollectionFieldForProperty(
					fieldConfig.property,
					fieldNameOverrides[fieldConfig.property.id] || fieldConfig.property.name,
					fieldTypes[fieldConfig.property.id]
				)
			);
		}

		assert(slugFieldId);

		updatePluginContext(
			{
				collectionFields: fields,
				slugFieldId,
				ignoredFieldIds: Array.from(disabledFieldIds),
				databaseName: richTextToPlainText(database.title),
			},
			onSubmit
		);
	};

	function createFieldConfigRow(fieldConfig: CollectionFieldConfig) {
		const id = fieldConfig.property.id;
		const isDisabled = !fieldTypes[id] || disabledFieldIds.has(id);

		return (
			<Fragment key={fieldConfig.originalFieldName}>
				<label
					htmlFor={`${id}-checkbox`}
					className={classNames(
						"size-full flex items-center",
						!fieldConfig.unsupported && "cursor-pointer"
					)}
				>
					<input
						type="checkbox"
						id={`${id}-checkbox`}
						disabled={!fieldConfig.property}
						checked={!!fieldConfig.property && !isDisabled}
						className={classNames(
							"mx-auto",
							!fieldConfig.property && "opacity-50",
							fieldConfig.property && !fieldConfig.unsupported && "cursor-pointer"
						)}
						onChange={() => {
							assert(fieldConfig.property);

							handleFieldToggle(id);
						}}
					/>
				</label>
				<StaticInput
					disabled={isDisabled}
					leftText={notionPropertyTypes[fieldConfig.property.type]}
				>
					{fieldConfig.originalFieldName}
					{fieldConfig.isNewField && !fieldConfig.unsupported && (
						<div
							className="bg-segmented-control rounded-sm px-[6px] py-[2px] text-[10px] font-semibold"
							style={{ boxShadow: "0 2px 4px 0 rgba(0,0,0,0.15)" }}
						>
							New
						</div>
					)}
				</StaticInput>
				<div className={classNames("flex items-center justify-center", isDisabled && "opacity-50")}>
					<IconChevron />
				</div>
				{!fieldTypes[id] ? (
					<StaticInput disabled className="col-span-2">
						Unsupported Field Type
					</StaticInput>
				) : (
					<>
						<input
							type="text"
							className={classNames("w-full", isDisabled && "opacity-50")}
							disabled={isDisabled}
							placeholder={fieldConfig.originalFieldName}
							value={fieldNameOverrides[id] ?? ""}
							onChange={(e) => {
								assert(fieldConfig.property);
								handleFieldNameChange(id, e.target.value);
							}}
						></input>
						<FieldTypeSelector
							fieldType={fieldTypes[id]}
							availableFieldTypes={fieldConfig.conversionTypes}
							disabled={isDisabled}
							onChange={(value) => handleFieldTypeChange(id, value)}
						/>
					</>
				)}
				<Button square type="button" onClick={() => onSettingsButtonClick(fieldConfig)}>
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
						<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
						<path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
					</svg>
				</Button>
				<FieldInfoTooltip
					fieldType={fieldTypes[id]}
					propertyType={fieldConfig.property.type}
					unsupported={fieldConfig.unsupported}
				/>
			</Fragment>
		);
	}

	const closeSettingsMenu = () => {
		setSettingsMenuFieldConfig(null);
	};

	const newFields = fieldConfigList.filter(
		(fieldConfig) => fieldConfig.isNewField && !fieldConfig.unsupported
	);
	const unsupportedFields = fieldConfigList.filter((fieldConfig) => fieldConfig.unsupported);
	const pageLevelFields = fieldConfigList.filter((fieldConfig) => fieldConfig.isPageLevelField);
	const otherFields = fieldConfigList.filter(
		(fieldConfig) =>
			!fieldConfig.isPageLevelField && !fieldConfig.unsupported && !fieldConfig.isNewField
	);

	return (
		<div className="flex-1 flex flex-col gap-2 px-3 overflow-hidden">
			<div className="absolute top-0 inset-x-3 h-[1px] bg-divider z-10" />
			<motion.div
				className="size-full overflow-y-auto"
				animate={{
					opacity: settingsMenuFieldConfig ? 0.3 : 1,
					// scale: settingsMenuFieldConfig ? 0.95 : 1,
				}}
				initial={false}
				transition={TRANSITION}
			>
				<form
					onSubmit={handleSubmit}
					className={classNames(
						"flex flex-col gap-3 flex-1 pt-4 transition-opacity relative",
						isLoading && "opacity-50 blur-sm pointer-events-none"
					)}
				>
					<h1 className="text-lg font-bold px-[36px] mb-2">Configure Collection Fields</h1>
					<div className="flex-1 flex flex-col gap-4">
						<div
							className="grid gap-2 w-full items-center justify-center"
							style={{
								gridTemplateColumns: `16px 1.25fr 8px 1fr minmax(100px, auto) auto 16px`,
							}}
						>
							<div className="col-start-2 flex flex-row justify-between px-2">
								<span>Notion Property</span>
								<span className="text-tertiary">Type</span>
							</div>
							<div></div>
							<span className="pl-2">Collection Field Name</span>
							<span className="col-span-3 pl-[4px]">Import As</span>
							<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
							<select
								className="w-full"
								value={slugFieldId ?? ""}
								onChange={(e) => setSlugFieldId(e.target.value)}
								required
							>
								<option value="" disabled>
									Slug Field Property
								</option>
								<hr />
								{slugFields.map((field) => (
									<option key={field.id} value={field.id}>
										{field.name}
									</option>
								))}
							</select>
							<div className="flex items-center justify-center">
								<IconChevron />
							</div>
							<StaticInput disabled>Slug</StaticInput>
							<FieldTypeSelector fieldType="slug" availableFieldTypes={["slug"]} />
							<div />
							<div />
							{pageLevelFields.map(createFieldConfigRow)}
							{newFields.length + otherFields.length > 0 && (
								<div className="h-[1px] bg-divider col-span-full"></div>
							)}
							{newFields.map(createFieldConfigRow)}
							{otherFields.map(createFieldConfigRow)}
							{unsupportedFields.length > 0 && (
								<div className="h-[1px] bg-divider col-span-full"></div>
							)}
							{unsupportedFields.map(createFieldConfigRow)}
						</div>
					</div>
					<div className="left-0 bottom-0 w-full flex flex-row items-center justify-between gap-3 sticky bg-primary py-3 border-t border-divider border-opacity-20 max-w-full overflow-hidden">
						<div className="inline-flex items-center min-w-0 flex-1">
							{error ? (
								<span className="text-[#f87171]">{error.message}</span>
							) : (
								<>
									<span className="text-tertiary flex-shrink-0 whitespace-pre">
										Importing from{" "}
									</span>
									<a
										href={database?.url}
										className="font-semibold text-secondary hover:text-primary truncate"
										target="_blank"
										tabIndex={-1}
									>
										{database ? richTextToPlainText(database.title) : ""}
									</a>
								</>
							)}
						</div>
						<Button primary className="w-auto px-3" disabled={!slugFieldId || !database}>
							{pluginContext.type === "update" ? "Save & Import" : "Import"}
						</Button>
					</div>
				</form>
			</motion.div>
			{isLoading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
					<Spinner inline />
					Importing items...
				</div>
			)}
			{settingsMenuFieldConfig && (
				<div className="absolute inset-0 cursor-pointer" onClick={closeSettingsMenu} />
			)}
			<AnimatePresence>
				{settingsMenuFieldConfig && (
					<FieldSettingsMenu
						fieldConfig={settingsMenuFieldConfig}
						fieldTypes={fieldTypes}
						fieldNames={fieldNameOverrides}
						onClose={closeSettingsMenu}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

function FieldInfoTooltip({ fieldType, propertyType, unsupported }) {
	const text =
		fieldConversionMessages[unsupported ? propertyType : `${propertyType} - ${fieldType}`];
	const title = unsupported
		? `${notionPropertyTypes[propertyType]} is not supported`
		: `${propertyType == "page-icon" ? "Page Icon" : notionPropertyTypes[propertyType]} → ${
				cmsFieldTypeNames[fieldType]
		  }`;

	const [hover, setHover] = useState(false);

	return (
		<div
			className="size-full flex items-center justify-center text-tertiary relative"
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			{text && (
				<>
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12">
						<path
							d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 9a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0Z"
							fill="currentColor"
						></path>
					</svg>
					<div
						className={classNames(
							"flex flex-col gap-1.5 rounded-lg p-3 w-[280px] z-10 text-secondary bg-modal pointer-events-none absolute -left-2 -translate-x-[100%] transition-opacity",
							hover ? "opacity-100" : "opacity-0"
						)}
						style={{
							boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 30px 0px",
						}}
					>
						<p className="text-primary font-semibold">{title}</p>
						{text}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="28"
							height="8"
							className="rotate-90 text-[var(--color-bg-modal)] absolute right-[-18px] top-[50%] translate-y-[-50%]"
						>
							<path
								d="M 12.833 1.333 C 13.451 0.627 14.549 0.627 15.167 1.333 L 18.012 4.585 C 19.911 6.755 22.654 8 25.538 8 L 28 8 L 0 8 L 2.462 8 C 5.346 8 8.089 6.755 9.988 4.585 Z"
								fill="currentColor"
							></path>
						</svg>
					</div>
				</>
			)}
		</div>
	);
}

function FieldTypeSelector({
	fieldType,
	availableFieldTypes,
	disabled = false,
	onChange = (value) => {},
}) {
	return (
		<div className="relative">
			<div className="text-tint absolute top-[4px] left-[4px] pointer-events-none">
				{cmsFieldIcons[fieldType]}
			</div>
			{availableFieldTypes?.length > 1 ? (
				<select
					disabled={disabled}
					value={fieldType}
					onChange={(e) => onChange(e.target.value)}
					className="pl-[34px] w-full"
				>
					{availableFieldTypes?.map((type) => (
						<option key={type} value={type}>
							{cmsFieldTypeNames[type]}
						</option>
					))}
				</select>
			) : (
				<StaticInput disabled={disabled} className="pl-[34px]">
					{cmsFieldTypeNames[fieldType]}
				</StaticInput>
			)}
		</div>
	);
}

function StaticInput({ children, disabled = false, className = "", leftText = "" }) {
	return (
		<div
			className={classNames(
				"w-full h-6 flex items-center bg-secondary rounded gap-1.5",
				disabled && "opacity-50",
				leftText ? "px-2" : "pl-2 pr-5",
				className
			)}
		>
			{children}
			{leftText && (
				<span
					className={classNames("flex-1 text-right", disabled ? "text-secondary" : "text-tertiary")}
				>
					{leftText}
				</span>
			)}
		</div>
	);
}

function createFieldTypesList(
	fieldConfigList: CollectionFieldConfig[],
	pluginContext: PluginContext
) {
	const result: Record<string, string> = {};

	for (const fieldConfig of fieldConfigList) {
		const conversionTypes = fieldConfig.conversionTypes;
		if (!fieldConfig.property || !conversionTypes?.length) {
			continue;
		}

		if (pluginContext.type !== "update") {
			result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
		} else {
			const field = pluginContext.collectionFields.find(
				(field) => field.id === fieldConfig.property.id
			);

			if (field && conversionTypes.includes(field.type)) {
				result[fieldConfig.property.id] = field.type;
			} else {
				result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
			}
		}
	}

	return result;
}

function getFieldConversionTypes(property: NotionProperty) {
	const propertyTypeMap = {
		checkbox: ["boolean"],
		title: ["string"],
		multi_select: ["string"],
		phone_number: ["string"],
		email: ["string"],
		created_time: ["date"],
		date: ["date"],
		last_edited_time: ["date"],
		files: ["link", "image"],
		number: ["number"],
		rich_text: ["formattedText", "string"],
		select: ["enum", "string"],
		status: ["enum", "string"],
		url: ["link", "string"],
		unique_id: ["string", "number"],
		formula: ["string", "number", "boolean", "date", "link", "image"],
		rollup: ["string", "number", "boolean", "date", "link", "image"],
	};

	return propertyTypeMap[property.type] || [];
}

function FieldSettingsMenu({ fieldConfig, fieldTypes, fieldNames, onClose }) {
	const id = fieldConfig.property.id;
	const propertyType = fieldConfig.property.type;
	const fieldType = fieldTypes[id];
	const fieldName = fieldNames[id] || fieldConfig.property.name;

	const fieldConversionTitle = `${
		propertyType == "page-icon" ? "Page Icon" : notionPropertyTypes[propertyType]
	} → ${cmsFieldTypeNames[fieldType]}`;
	const fieldConversionMessage = fieldConversionMessages[`${propertyType} - ${fieldType}`];

	return (
		<motion.div
			className="absolute inset-y-3 right-3 w-[300px] flex flex-col rounded-lg bg-modal"
			initial={{ x: 315, boxShadow: "rgba(0, 0, 0, 0) 0px 10px 30px 0px" }}
			animate={{ x: 0, boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 30px 0px" }}
			exit={{ x: 315, boxShadow: "rgba(0, 0, 0, 0) 0px 10px 30px 0px" }}
			transition={TRANSITION}
		>
			<div className="relative flex flex-col gap-1 w-full px-3 pt-3 pb-2">
				<XIcon onClick={onClose} className="absolute top-5 right-0" />
				<h1 className="text-lg font-bold -mb-1">{fieldConfig.property.name}</h1>
				<p className="mb-1">{notionPropertyTypes[fieldConfig.property.type]}</p>
				<div className="absolute inset-x-3 bottom-0 h-px bg-divider" />
			</div>
			<div className="flex flex-col gap-2 overflow-y-auto w-full px-3 pb-3">
				<div className="min-h-10 flex flex-row items-center text-primary font-semibold">
					Field Settings
				</div>
				<PropertyControl title="Import Field">
					<SegmentedControl
						id={"import"}
						items={[true, false]}
						itemTitles={["Yes", "No"]}
						currentItem={true}
						tint
						onChange={(value) => {
							console.log(value);
						}}
					/>
				</PropertyControl>
				<PropertyControl title="Name">
					<input
						type="text"
						className="w-full"
						value={fieldNames[id]}
						placeholder={fieldConfig.property.name}
					/>
				</PropertyControl>
				<PropertyControl title="Field Type">
					<FieldTypeSelector
						fieldType={fieldTypes[id]}
						availableFieldTypes={fieldConfig.conversionTypes}
					/>
				</PropertyControl>
				{fieldConversionMessage && (
					<div className="p-3 bg-secondary rounded text-secondary flex flex-col gap-1">
						<p className="text-primary font-semibold">{fieldConversionTitle}</p>
						{fieldConversionMessage}
					</div>
				)}
				<div className="min-h-10 flex flex-row items-center text-primary font-semibold -mb-2 border-t border-divider">
					{notionPropertyTypes[propertyType]}
				</div>
				<PropertyControl title="Multiple Fields">
					<SegmentedControl
						id={"import"}
						items={[true, false]}
						itemTitles={["Yes", "No"]}
						currentItem={true}
						tint
						onChange={(value) => {
							console.log(value);
						}}
					/>
				</PropertyControl>
				<div className="p-3 bg-secondary rounded text-secondary flex flex-col gap-1">
					{/* <p className="text-primary font-semibold">{fieldConversionTitle}</p> */}
					If any items in Notion have multiple files, they will be imported as multiple CMS fields
					with a number ending added to each field's name.
					<p>
						<span className="text-primary font-semibold">Preview:</span> {fieldName} 1, {fieldName}{" "}
						2, {fieldName} 3, ...
					</p>
				</div>
			</div>
			<div className="flex flex-col w-full p-3 relative">
				<div className="absolute inset-x-3 top-0 h-px bg-divider" />
				<Button primary onClick={onClose}>
					Done
				</Button>
			</div>
		</motion.div>
	);
}

function PropertyControl({ title, children }) {
	return (
		<div
			className="grid gap-2 w-full items-center"
			style={{
				gridTemplateColumns: "minmax(0,1.5fr) repeat(2,minmax(62px,1fr))",
			}}
		>
			<span className="text-secondary pl-2">{title}</span>
			<div className="col-span-2">{children}</div>
		</div>
	);
}
