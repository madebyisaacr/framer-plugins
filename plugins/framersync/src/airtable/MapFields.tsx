import { framer } from "framer-plugin";
import { assert } from "../utils.js";
import {
	PluginContext,
	SynchronizeMutationOptions,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
} from "./airtable.js";
import { Fragment, useMemo, useState } from "react";
import classNames from "classnames";
import { IconChevron } from "../components/Icons.js";
import Button from "@shared/Button";
import { cmsFieldIcons } from "../assets/cmsFieldIcons.jsx";
import { Spinner } from "@shared/spinner/Spinner";

const fieldConversionMessages = {};
const propertyTypeNames = {
	aiText: "AI Text",
	multipleAttachments: "Attachments",
	autoNumber: "Auto number",
	barcode: "Barcode",
	button: "Button",
	checkbox: "Checkbox",
	singleCollaborator: "User",
	count: "Count",
	createdBy: "Created by",
	createdTime: "Created time",
	currency: "Currency",
	date: "Date",
	dateTime: "Date and time",
	duration: "Duration",
	email: "Email",
	formula: "Formula",
	lastModifiedBy: "Last modified by",
	lastModifiedTime: "Last modified time",
	multipleRecordLinks: "Link to another record",
	multilineText: "Long text",
	multipleLookupValues: "Lookup",
	multipleCollaborators: "Multiple users",
	multipleSelects: "Multiple select",
	number: "Number",
	percent: "Percent",
	phoneNumber: "Phone",
	rating: "Rating",
	richText: "Rich text",
	rollup: "Rollup",
	singleLineText: "Single line text",
	singleSelect: "Single select",
	externalSyncSource: "Sync source",
	url: "URL",
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
const propertyConversionTypes: Record<string, string[]> = {
	aiText: ["string"],
	multipleAttachments: ["link", "image"],
	autoNumber: ["number"],
	barcode: ["string"],
	button: ["link"],
	checkbox: ["boolean"],
	singleCollaborator: ["string"],
	count: ["number"],
	createdBy: ["string"],
	createdTime: ["date"],
	currency: ["number", "string"],
	date: ["date"],
	dateTime: ["date"],
	duration: ["string"],
	email: ["string"],
	formula: ["string", "number", "boolean", "date", "link", "image"],
	lastModifiedBy: [],
	lastModifiedTime: ["date"],
	multipleRecordLinks: [],
	multilineText: ["string"],
	multipleLookupValues: [],
	multipleCollaborators: [],
	multipleSelects: [],
	number: ["number"],
	percent: ["number"],
	phoneNumber: ["string"],
	rating: ["number"],
	richText: ["formattedText", "string"],
	rollup: [],
	singleLineText: ["string"],
	singleSelect: ["enum", "string"],
	externalSyncSource: ["string"],
	url: ["link", "string"],
};

interface CollectionFieldConfig {
	property: object;
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

function createFieldConfig(table: object, pluginContext: PluginContext): CollectionFieldConfig[] {
	const result: CollectionFieldConfig[] = [];

	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	for (const key in table.fields) {
		const property = table.fields[key];
		assert(property);

		const conversionTypes = propertyConversionTypes[property.type] ?? [];

		result.push({
			// field: getCollectionFieldForProperty(property),
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
			unsupported: !conversionTypes.length,
			property,
			conversionTypes,
			isPageLevelField: false,
		});
	}

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

function getInitialSlugFieldId(context: PluginContext, fieldOptions): string | null {
	if (context.type === "update" && context.slugFieldId) return context.slugFieldId;

	return fieldOptions[0]?.id ?? null;
}

function getLastSyncedTime(
	pluginContext: PluginContext,
	table: object,
	slugFieldId: string,
	disabledFieldIds: Set<string>
): string | null {
	if (pluginContext.type !== "update") return null;

	// Always resync if the slug field changes.
	if (pluginContext.slugFieldId !== slugFieldId) return null;

	// Always resync if field config changes
	if (hasFieldConfigurationChanged(pluginContext.collectionFields, table, Array.from(disabledFieldIds))) {
		return null;
	}

	return pluginContext.lastSyncedTime;
}

export function MapFieldsPage({
	base,
	table,
	onSubmit,
	isLoading,
	error,
	pluginContext,
}: {
	base: object;
	table: object;
	onSubmit: (options: SynchronizeMutationOptions) => void;
	isLoading: boolean;
	error: Error | null;
	pluginContext: PluginContext;
}) {
	framer.showUI({ width: 750, height: 550 });

	const slugFields = useMemo(() => getPossibleSlugFields(table), [table]);
	const [slugFieldId, setSlugFieldId] = useState<string | null>(() => getInitialSlugFieldId(pluginContext, slugFields));
	const [fieldConfigList] = useState<CollectionFieldConfig[]>(() => createFieldConfig(table, pluginContext));
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext.type === "update" ? pluginContext.ignoredFieldIds : [])
	);
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
		getFieldNameOverrides(pluginContext)
	);
	const [fieldTypes, setFieldTypes] = useState(createFieldTypesList(fieldConfigList, pluginContext));

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

		onSubmit({
			fields,
			ignoredFieldIds: Array.from(disabledFieldIds),
			slugFieldId,
			lastSyncedTime: getLastSyncedTime(pluginContext, table, slugFieldId, disabledFieldIds),
		});
	};

	function createFieldConfigRow(fieldConfig: CollectionFieldConfig) {
		const id = fieldConfig.property.id;
		const isDisabled = !fieldTypes[id] || disabledFieldIds.has(id);

		return (
			<Fragment key={fieldConfig.originalFieldName}>
				<label
					htmlFor={`${id}-checkbox`}
					className={classNames("size-full flex items-center", !fieldConfig.unsupported && "cursor-pointer")}
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
				<StaticInput disabled={isDisabled} leftText={propertyTypeNames[fieldConfig.property.type]}>
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
				<FieldInfoTooltip
					fieldType={fieldTypes[id]}
					propertyType={fieldConfig.property.type}
					unsupported={fieldConfig.unsupported}
				/>
			</Fragment>
		);
	}

	const newFields = fieldConfigList.filter((fieldConfig) => fieldConfig.isNewField && !fieldConfig.unsupported);
	const unsupportedFields = fieldConfigList.filter((fieldConfig) => fieldConfig.unsupported);
	const pageLevelFields = fieldConfigList.filter((fieldConfig) => fieldConfig.isPageLevelField);
	const otherFields = fieldConfigList.filter(
		(fieldConfig) => !fieldConfig.isPageLevelField && !fieldConfig.unsupported && !fieldConfig.isNewField
	);

	return (
		<div className="flex-1 flex flex-col gap-2 px-3">
			<form
				onSubmit={handleSubmit}
				className={classNames(
					"flex flex-col gap-3 flex-1 transition-opacity relative",
					isLoading && "opacity-50 blur-sm pointer-events-none"
				)}
			>
				<div className="h-[1px] border-b border-divider mb-1 sticky top-0" />
				<h1 className="text-lg font-bold px-[36px] mb-2">Configure Collection Fields</h1>
				<div className="flex-1 flex flex-col gap-4">
					<div
						className="grid gap-2 w-full items-center justify-center"
						style={{
							gridTemplateColumns: `16px 1.25fr 8px 1fr minmax(100px, auto) 16px`,
						}}
					>
						<div className="col-start-2 flex flex-row justify-between px-2">
							<span>Airtable Field</span>
						</div>
						<div></div>
						<span className="pl-2">Collection Field Name</span>
						<span className="col-span-2 pl-[4px]">Import As</span>
						<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
						<select className="w-full" value={slugFieldId ?? ""} onChange={(e) => setSlugFieldId(e.target.value)} required>
							<option value="" disabled>
								Slug Field Property
							</option>
							<hr />
							{slugFields.map((property) => (
								<option key={property.id} value={property.id}>
									{property.name}
								</option>
							))}
						</select>
						<div className="flex items-center justify-center">
							<IconChevron />
						</div>
						<StaticInput disabled>Slug</StaticInput>
						<FieldTypeSelector fieldType="slug" availableFieldTypes={["slug"]} />
						<div />
						{pageLevelFields.map(createFieldConfigRow)}
						{newFields.length + otherFields.length > 0 && <div className="h-[1px] bg-divider col-span-full"></div>}
						{newFields.map(createFieldConfigRow)}
						{otherFields.map(createFieldConfigRow)}
						{unsupportedFields.length > 0 && <div className="h-[1px] bg-divider col-span-full"></div>}
						{unsupportedFields.map(createFieldConfigRow)}
					</div>
				</div>
				<div className="left-0 bottom-0 w-full flex flex-row items-center justify-between gap-3 sticky bg-primary py-3 border-t border-divider border-opacity-20 max-w-full overflow-hidden">
					<div className="inline-flex items-center min-w-0 flex-1">
						{error ? (
							<span className="text-[#f87171]">{error.message}</span>
						) : (
							<>
								<span className="text-tertiary flex-shrink-0 whitespace-pre">Importing from </span>
								<a
									href={`https://airtable.com/${pluginContext.base?.id}/${table.id}`}
									className="font-semibold text-secondary hover:text-primary truncate"
									target="_blank"
									tabIndex={-1}
								>
									{pluginContext.base?.name || ""}
								</a>
							</>
						)}
					</div>
					<Button primary className="w-auto px-3" disabled={!slugFieldId || !table}>
						{pluginContext.type === "update" ? "Save & Import" : "Import"}
					</Button>
				</div>
			</form>
			{isLoading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
					<Spinner inline />
					Importing items...
				</div>
			)}
		</div>
	);
}

function FieldInfoTooltip({ fieldType, propertyType, unsupported }) {
	const text = fieldConversionMessages[unsupported ? propertyType : `${propertyType} - ${fieldType}`];
	const title = unsupported
		? `${propertyTypeNames[propertyType]} is not supported`
		: `${propertyType == "page-icon" ? "Page Icon" : propertyTypeNames[propertyType]} → ${cmsFieldTypeNames[fieldType]}`;

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

function FieldTypeSelector({ fieldType, availableFieldTypes, disabled = false, onChange = (value) => {} }) {
	return (
		<div className="relative">
			<div className="text-tint absolute top-[4px] left-[4px] pointer-events-none">{cmsFieldIcons[fieldType]}</div>
			{availableFieldTypes?.length > 1 ? (
				<select disabled={disabled} value={fieldType} onChange={(e) => onChange(e.target.value)} className="pl-[34px] w-full">
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
				<span className={classNames("flex-1 text-right", disabled ? "text-secondary" : "text-tertiary")}>{leftText}</span>
			)}
		</div>
	);
}

function createFieldTypesList(fieldConfigList: CollectionFieldConfig[], pluginContext: PluginContext) {
	const result: Record<string, string> = {};

	for (const fieldConfig of fieldConfigList) {
		const conversionTypes = fieldConfig.conversionTypes;
		if (!fieldConfig.property || !conversionTypes?.length) {
			continue;
		}

		if (pluginContext.type !== "update") {
			result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
		} else {
			const field = pluginContext.collectionFields.find((field) => field.id === fieldConfig.property.id);

			if (field && conversionTypes.includes(field.type)) {
				result[fieldConfig.property.id] = field.type;
			} else {
				result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
			}
		}
	}

	return result;
}
