import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { framer, CollectionField } from "framer-plugin";
import { assert } from "./utils";
import {
	NotionProperty,
	PluginContext,
	SynchronizeMutationOptions,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	pageContentField,
	richTextToPlainText,
} from "./notion";
import { Fragment, useMemo, useState } from "react";
import classNames from "classnames";
import { IconChevron } from "./components/Icons";
import Button from "@shared/Button";
import { isFullDatabase } from "@notionhq/client";
import { cmsFieldIcons } from "./assets/cmsFieldIcons.jsx";
import { Spinner } from "@shared/spinner/Spinner";

const timeMessage = "Time is not supported, so only the date will be imported.";
const peopleMessage =
	"People fields cannot be imported because the FramerSync Notion integration does not have access to users' names.";
const fieldConversionMessages = {
	"date - date": timeMessage,
	"created_time - date": timeMessage,
	"last_edited_time - date": timeMessage,
	"multi_select - string": "Values are imported as a comma-separated list of option names.",
	"files - string": "Files are importated as a comma-separated list of URLs.",
	"files - link": "Only the first file's URL will be included.",
	"files - image": "Only the first image will be included. The file must be an image, otherwise importing will fail.",
	"page-icon - string":
		'Only emoji icons are imported. To import Notion icons and custom image icons, change the import type to "Image"',
	"page-icon - image":
		'Only Notion icons and custom image icons are imported. To import emoji icons, change the import type to "Text"',
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

function createFieldConfig(database: GetDatabaseResponse, pluginContext: PluginContext): CollectionFieldConfig[] {
	const result: CollectionFieldConfig[] = [];

	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	result.push(
		{
			// field: pageContentField,
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
		},
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

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		// Title is always required in CMS API.
		if (property.type === "title") continue;

		const conversionTypes = getFieldConversionTypes(property);

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

function getInitialSlugFieldId(context: PluginContext, fieldOptions: NotionProperty[]): string | null {
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
	if (hasFieldConfigurationChanged(pluginContext.collectionFields, database, Array.from(disabledFieldIds))) {
		return null;
	}

	return pluginContext.lastSyncedTime;
}

export function MapDatabaseFields({
	database,
	onSubmit,
	isLoading,
	error,
	pluginContext,
}: {
	database: GetDatabaseResponse;
	onSubmit: (options: SynchronizeMutationOptions) => void;
	isLoading: boolean;
	error: Error | null;
	pluginContext: PluginContext;
}) {
	framer.showUI({ width: 750, height: 550 });

	const slugFields = useMemo(() => getPossibleSlugFields(database), [database]);
	const [slugFieldId, setSlugFieldId] = useState<string | null>(() => getInitialSlugFieldId(pluginContext, slugFields));
	const [fieldConfigList] = useState<CollectionFieldConfig[]>(() => createFieldConfig(database, pluginContext));
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext.type === "update" ? pluginContext.ignoredFieldIds : [])
	);
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
		getFieldNameOverrides(pluginContext)
	);
	const [fieldTypes, setFieldTypes] = useState(createFieldTypesList(fieldConfigList, pluginContext.collectionFields));

	const titleField =
		(database?.properties && Object.values(database?.properties).find((property) => property.type === "title")) || null;

	assert(isFullDatabase(database));

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
			if (!fieldConfig || !fieldConfig.property || fieldConfig.unsupported || disabledFieldIds.has(fieldConfig.property.id)) {
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
			lastSyncedTime: getLastSyncedTime(pluginContext, database, slugFieldId, disabledFieldIds),
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
				<StaticInput disabled={isDisabled} leftText={notionPropertyTypes[fieldConfig.property.type]}>
					{fieldConfig.originalFieldName}
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

	return (
		<div className="flex-1 flex flex-col gap-2 px-3">
			<form
				onSubmit={handleSubmit}
				className={classNames(
					"flex flex-col gap-3 flex-1 transition-opacity relative",
					isLoading && "opacity-40 pointer-events-none"
				)}
			>
				<div className="h-[1px] border-b border-divider mb-1 sticky top-0" />
				<h1 className="text-lg font-bold px-[26px] mb-2">Configure Collection Fields</h1>
				<div className="flex-1 flex flex-col gap-4">
					<div
						className="grid gap-2 w-full items-center justify-center"
						style={{
							gridTemplateColumns: `16px 1fr 8px 1fr minmax(100px, auto) 16px`,
						}}
					>
						<span className="col-start-2 col-span-2">Notion Property</span>
						<span>Collection Field Name</span>
						<span className="col-span-2">Import As</span>
						<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
						<StaticInput disabled>{titleField?.name ?? "Title"}</StaticInput>
						<div className="flex items-center justify-center">
							<IconChevron />
						</div>
						<StaticInput disabled>Title</StaticInput>
						<FieldTypeSelector fieldType="title" availableFieldTypes={["title"]} />
						<div />
						<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
						<select className="w-full" value={slugFieldId ?? ""} onChange={(e) => setSlugFieldId(e.target.value)} required>
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
						{fieldConfigList.filter((fieldConfig) => fieldConfig.isPageLevelField).map(createFieldConfigRow)}
						<div className="h-[1px] bg-divider col-span-full"></div>
						{fieldConfigList
							.filter((fieldConfig) => !fieldConfig.isPageLevelField && !fieldConfig.unsupported)
							.map(createFieldConfigRow)}
						<div className="h-[1px] bg-divider col-span-full"></div>
						{fieldConfigList.filter((fieldConfig) => fieldConfig.unsupported).map(createFieldConfigRow)}
					</div>
				</div>
				<div className="left-0 bottom-0 w-full flex flex-row items-center justify-between gap-3 sticky bg-primary py-3 border-t border-divider border-opacity-20 max-w-full overflow-hidden">
					<div className="inline-flex items-center gap-1 min-w-0 flex-1">
						{error ? (
							<span className="text-[#f87171]">{error.message}</span>
						) : (
							<>
								<span className="text-tertiary flex-shrink-0">Importing from</span>
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
						Import
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

	return (
		<div className="size-full flex items-center justify-center text-tertiary" title={text}>
			{text && (
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12">
					<path
						d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 9a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0Z"
						fill="currentColor"
					></path>
				</svg>
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
				"w-full h-6 flex items-center bg-secondary rounded gap-2",
				disabled && "opacity-50",
				leftText ? "px-2" : "pl-2 pr-5",
				className
			)}
		>
			{children}
			{leftText && <span className="flex-1 text-right text-tertiary">{leftText}</span>}
		</div>
	);
}

function createFieldTypesList(fieldConfigList: CollectionFieldConfig[], collectionFields: CollectionField[]) {
	const result = {};

	for (const fieldConfig of fieldConfigList) {
		const conversionTypes = fieldConfig.conversionTypes;
		if (!fieldConfig.property || !conversionTypes?.length) {
			continue;
		}

		const field = collectionFields.find((field) => field.id === fieldConfig.property.id);

		if (field && conversionTypes.includes(field.type)) {
			result[fieldConfig.property.id] = field.type;
		} else {
			result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
		}
	}

	return result;
}

function getFieldConversionTypes(property: NotionProperty) {
	switch (property.type) {
		case "checkbox":
			return ["boolean"];
		case "title":
		// case "created_by":
		// case "last_edited_by":
		// case "people":
		case "rollup":
		case "multi_select":
		case "phone_number":
		case "relation":
		case "email":
			return ["string"];
		case "created_time":
		case "date":
		case "last_edited_time":
			return ["date"];
		case "files":
			return ["string", "link", "image"];
		case "number":
			return ["number"];
		case "rich_text":
			return ["formattedText", "string"];
		case "select":
		case "status":
			return ["enum", "string"];
		case "url":
			return ["link", "string"];
		case "unique_id":
			return property.unique_id.prefix ? ["string", "number"] : ["number"];
		case "formula":
			return ["string", "number"];
		default:
			return [];
	}
}
