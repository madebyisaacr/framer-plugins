import React, { useContext, useState, useRef, useEffect, useMemo, Fragment } from "react";
import classNames from "classnames";
import { framer, CollectionField } from "framer-plugin";
import { Button } from "@shared/components.jsx";
import PluginContext from "@plugin/src/PluginContext";
import {
	authorize,
	getOauthURL,
	useDatabasesQuery,
	richTextToPlainText,
	NotionProperty,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	pageContentField,
	getDatabase,
	synchronizeDatabase,
} from "./notionHandler";
import { assert, isDefined, generateRandomId } from "@plugin/src/utils";
import { isFullDatabase, collectPaginatedAPI } from "@notionhq/client";
import { PageStackContext, BackButton } from "@shared/PageStack.jsx";
import { cmsFieldTypeNames, pluginDataKeys, syncCollectionItems, syncCollectionFields } from "@plugin/src/shared";
import { cmsFieldIcons } from "@plugin/src/FieldIcons.jsx";

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

function Page() {
	const pluginContext = useContext(PluginContext);
	const { pageCount, closePage } = useContext(PageStackContext);

	useEffect(() => {
		initialize(pluginContext);

		return () => {
			pluginContext.setIntegrationData?.({});
		};
	}, []);

	if (!pluginContext.isAuthenticated) {
		return <AuthenticatePage />;
	}

	if (!pluginContext.databaseId) {
		return <SelectDatabasePage />;
	}

	return <ConfigureCollectionPage />;
}

async function initialize(pluginContext) {
	if (pluginContext.integrationId == Notion.id && pluginContext.databaseId && !pluginContext.integrationData?.database) {
		const database = await getDatabase(pluginContext.databaseId);
		pluginContext.setIntegrationData?.({
			...pluginContext.integrationData,
			database,
		});
	}
}

async function syncCollection(pluginContext) {
	const database = pluginContext.integrationData?.database;
	assert(database);

	synchronizeDatabase(database, {
		fields: pluginContext.fields,
		disabledFieldIds: pluginContext.disabledFieldIds,
		lastSyncedTime: pluginContext.lastSyncedTime,
		slugFieldId: pluginContext.slugFieldId,
	});

	// await syncCollectionFields(pluginContext, pluginContext.fields);

	// const items = getItems(pluginContext.integrationData.database);
	// console.log("items", items);

	// await syncCollectionItems(pluginContext, items);

	// await framer.closePlugin();
}

const Notion = {
	id: "notion",
	Page,
	initialize,
	syncCollection,
};

export default Notion;

function AuthenticatePage() {
	const { openPage } = useContext(PageStackContext);

	return (
		<div className="p-3 pt-0 flex-1 flex flex-col gap-2">
			<BackButton />
			Authenticate Page
			<div className="flex-1" />
			<Button primary onClick={() => openPage(<SelectDatabasePage />)}>
				Connect Notion Account
			</Button>
		</div>
	);
}

function SelectDatabasePage() {
	const { openPage } = useContext(PageStackContext);
	const { integrationData, collection } = useContext(PluginContext);
	const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();

	const [selectedDatabase, setSelectedDatabase] = useState(integrationData?.database || null);

	function handleSubmit() {
		if (integrationData) {
			integrationData.database = selectedDatabase;
		}
		openPage(<ConfigureCollectionPage />);
	}

	return (
		<div className="flex-1 flex flex-col gap-2 p-3 pt-0">
			<BackButton />
			<div className="flex flex-row justify-between items-center">
				<p>Select a Notion database to sync</p>
				<button
					className="w-[32px] h[16px] bg-transparent flex items-center justify-center text-secondary"
					type="button"
					onClick={() => refetch()}
				>
					<ReloadIcon className={isRefetching || isLoading ? "animate-spin" : undefined} />
				</button>
			</div>
			{isLoading ? (
				<div className="flex items-center justify-center h-[200px]">Loading Databases...</div>
			) : (
				<div className="flex-1 flex flex-col divide-y divide-divider">
					{data?.map((database) => (
						<NotionDatabaseButton
							key={database.id}
							databaseName={richTextToPlainText(database.title)}
							selected={selectedDatabase === database}
							onClick={() => setSelectedDatabase(selectedDatabase === database ? null : database)}
						/>
					))}
				</div>
			)}
			<div className="flex-1" />
			<Button primary disabled={!selectedDatabase || isLoading || isRefetching} onClick={handleSubmit}>
				Import Database
			</Button>
		</div>
	);
}

function ConfigureCollectionPage() {
	const { integrationData } = useContext(PluginContext);

	return (
		<div className="flex flex-col gap-2 size-full px-3 overflow-y-auto">
			<BackButton />
			{integrationData?.database ? (
				<FieldConfigurationMenu />
			) : (
				<div className="flex flex-col items-center justify-center flex-1">Loading...</div>
			)}
		</div>
	);
}

function FieldConfigurationMenu() {
	const pluginContext = useContext(PluginContext);

	const isLoading = false;
	const error = null;

	const database = pluginContext.integrationData?.database || null;

	const slugFields = useMemo(() => getPossibleSlugFields(database), [database]);
	const [slugFieldId, setSlugFieldId] = useState(() => getInitialSlugFieldId(pluginContext, slugFields));
	const [fieldConfigList] = useState<CollectionFieldConfig[]>(() => createFieldConfig(database, pluginContext));
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext.type === "update" ? pluginContext.disabledFieldIds ?? [] : [])
	);
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
		getFieldNameOverrides(pluginContext)
	);
	const [fieldTypes, setFieldTypes] = useState(createFieldTypesList(fieldConfigList));

	const titleField =
		(database?.properties && Object.values(database?.properties).find((property) => property.type === "title")) || null;

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

		assert(pluginContext.setContext);
		assert(slugFieldId);

		const { collection } = pluginContext;
		if (collection) {
			const data = {
				[pluginDataKeys.integrationId]: Notion.id,
				[pluginDataKeys.databaseId]: database.id,
				[pluginDataKeys.disabledFieldIds]: JSON.stringify(Array.from(disabledFieldIds)),
				[pluginDataKeys.slugFieldId]: slugFieldId,
				[pluginDataKeys.isAuthenticated]: "true",
			};

			for (const key of Object.keys(data)) {
				collection.setPluginData(key, data[key]);
			}

			pluginContext.setContext((prev) => ({ ...prev, ...data, fields }));

			syncCollection({ ...pluginContext, ...data, fields });
		}

		// const allFields = fieldConfigList
		// 	.filter((fieldConfig) => fieldConfig.field && !disabledFieldIds.has(fieldConfig.field.id))
		// 	.map((fieldConfig) => fieldConfig.field)
		// 	.filter(isDefined)
		// 	.map((field) => {
		// 		if (fieldNameOverrides[field.id]) {
		// 			field.name = fieldNameOverrides[field.id];
		// 		}

		// 		return field;
		// 	});

		// onSubmit({
		// 	fields: allFields,
		// 	disabledFieldIds: Array.from(disabledFieldIds),
		// 	slugFieldId,
		// 	lastSyncedTime: getLastSyncedTime(pluginContext, database, slugFieldId, disabledFieldIds),
		// });
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
		<div className="flex-1 flex flex-col gap-2">
			<form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1">
				<div className="h-[1px] border-b border-divider mb-2 sticky top-0" />
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
						<FieldTypeSelector fieldType="string" availableFieldTypes={["string"]} disabled={true} />
						<div />
						<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
						<select className="w-full" value={slugFieldId ?? ""} onChange={(e) => setSlugFieldId(e.target.value)} required>
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
						<FieldTypeSelector fieldType="slug" availableFieldTypes={["slug"]} disabled={true} />
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
				<div className="left-0 bottom-0 w-full flex flex-row justify-between gap-3 sticky bg-primary py-3 border-t border-divider border-opacity-20 max-w-full overflow-hidden">
					<div className="inline-flex items-center gap-1 min-w-0">
						{error ? (
							<span className="text-red-500">{error.message}</span>
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
					<Button primary className="w-auto" isLoading={isLoading} disabled={!slugFieldId || !database}>
						Import
					</Button>
				</div>
			</form>
		</div>
	);
}

////////////////////////////////////////////////////////////////////////////////

function NotionDatabaseButton({ databaseName, selected, onClick }) {
	return (
		<label htmlFor={databaseName} className="py-2 cursor-pointer flex flex-row gap-2 items-center">
			<input type="checkbox" name="database" id={databaseName} checked={selected} onChange={onClick} />
			{databaseName}
		</label>
	);
}

function StaticInput({ children = "", disabled = false, className = "", leftText = "" }) {
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

function IconChevron() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="5" height="8">
			<path d="M 1 1 L 4 4 L 1 7" fill="transparent" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"></path>
		</svg>
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

function FieldTypeSelector({ fieldType, availableFieldTypes, disabled, onChange = (value) => {} }) {
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

export function ReloadIcon({ className }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" className={className}>
			<path
				d="M 1.393 4.054 C 1.646 3.456 2.012 2.917 2.464 2.464 C 3.369 1.56 4.619 1 6 1 C 7.381 1 8.631 1.56 9.536 2.464 C 9.762 2.691 9.966 2.938 10.146 3.204"
				fill="transparent"
				strokeWidth="1.5"
				stroke="currentColor"
				strokeLinecap="round"
			></path>
			<path d="M 11 1 L 11 4 L 8 4" fill="transparent" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"></path>
			<path d="M 4 8 L 1 8 L 1 11" fill="transparent" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"></path>
			<path
				d="M 10.607 7.946 C 10.354 8.544 9.988 9.083 9.536 9.536 C 8.631 10.44 7.381 11 6 11 C 4.619 11 3.369 10.44 2.464 9.536 C 2.238 9.309 2.034 9.062 1.854 8.796"
				fill="transparent"
				strokeWidth="1.5"
				stroke="currentColor"
				strokeLinecap="round"
			></path>
		</svg>
	);
}

function useIsDocumentVisibile() {
	const [isVisible, setIsVisible] = useState(document.visibilityState === "visible");

	useEffect(() => {
		const handleVisibilityChange = () => {
			setIsVisible(document.visibilityState === "visible");
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return isVisible;
}

interface CollectionFieldConfig {
	property: NotionProperty;
	isNewField: boolean;
	originalFieldName: string;
	unsupported: boolean;
	conversionTypes: string[];
	isPageLevelField: boolean;
}

function createFieldConfig(database: GetDatabaseResponse, pluginContext): CollectionFieldConfig[] {
	if (!database || !pluginContext) {
		return [];
	}

	const result: CollectionFieldConfig[] = [];

	const existingFieldIds = new Set(
		(pluginContext.type === "update" && pluginContext.originalFields?.map((field) => field.id)) || []
	);

	result.push(
		{
			property: {
				id: "page-content",
				name: "Content",
				type: "page-content",
				unsupported: false,
			},
			originalFieldName: "Content",
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(pageContentField.id),
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
			property: property,
			unsupported: !conversionTypes.length,
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
			conversionTypes,
		});
	}

	return result;
}

function createFieldTypesList(fieldConfigList: CollectionFieldConfig[]) {
	const result = {};

	for (const fieldConfig of fieldConfigList) {
		if (!fieldConfig.property) {
			continue;
		}

		const type = fieldConfig.conversionTypes?.[0];
		if (!type) {
			continue;
		}

		result[fieldConfig.property.id] = type;
	}

	return result;
}

function getFieldNameOverrides(pluginContext): Record<string, string> {
	const result: Record<string, string> = {};
	if (pluginContext.type !== "update") return result;

	for (const field of pluginContext.originalFields ?? []) {
		result[field.id] = field.name;
	}

	return result;
}

function getInitialSlugFieldId(context, fieldOptions: NotionProperty[]): string | null {
	if (!context) {
		return null;
	}

	if (context.type === "update" && context.slugFieldId) {
		return context.slugFieldId;
	}

	return fieldOptions[0]?.id ?? null;
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
