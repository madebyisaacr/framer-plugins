import React, { useContext, useState, useRef, useEffect, useMemo, Fragment } from "react";
import classNames from "classnames";
import { framer, CollectionField } from "framer-plugin";
import { Button, BackButton } from "@shared/components.jsx";
import PluginContext from "@plugin/PluginContext.js";
import {
	authorize,
	getOauthURL,
	getPluginContext,
	useDatabasesQuery,
	richTextToPlainText,
	NotionProperty,
	SynchronizeMutationOptions,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	pageContentField,
} from "./notionHandler";
import { assert, isDefined, generateRandomId } from "@plugin/utils";
import { isFullDatabase } from "@notionhq/client";
import { PageStackContext } from "@shared/PageStack.jsx";
import plugin from "tailwindcss";

function Page() {
	const { isAuthenticated, databaseId } = useContext(PluginContext);

	// if (!isAuthenticated) {
	// 	return <AuthenticatePage />;
	// }

	if (!databaseId) {
		return <SelectDatabasePage />;
	}

	return <ConfigureFieldsPage />;
}

const Notion = {
	id: "notion",
	Page,
};

export default Notion;

function AuthenticatePage() {
	return (
		<div className="p-3 pt-0 flex-1 flex flex-col">
			AuthenticatePage
			<div className="flex-1" />
			<Button primary>Connect Notion Account</Button>
		</div>
	);
}

function SelectDatabasePage() {
	const { openPage } = useContext(PageStackContext);
	const { integrationData } = useContext(PluginContext);
	const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();

	const [selectedDatabase, setSelectedDatabase] = useState(integrationData?.database || null);

	function handleSubmit() {
		if (integrationData) {
			integrationData.database = selectedDatabase;
		}
		openPage(<ConfigureFieldsPage />);
	}

	return (
		<div className="flex-1 flex flex-col gap-2 p-3 pt-0">
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

function ConfigureFieldsPage() {
	const pluginContext = useContext(PluginContext);

	const isLoading = false;
	const error = null;

	const database = pluginContext?.integrationData?.database || null;

	const slugFields = useMemo(() => getPossibleSlugFields(database), [database]);
	const [slugFieldId, setSlugFieldId] = useState(() => getInitialSlugFieldId(pluginContext?.slugFieldId, slugFields));
	const [fieldConfigList] = useState<CollectionFieldConfig[]>(() => createFieldConfig(database, pluginContext));
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext?.type === "update" ? pluginContext?.disabledFieldIds ?? [] : [])
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

		const allFields = fieldConfigList
			.filter((fieldConfig) => fieldConfig.field && !disabledFieldIds.has(fieldConfig.field.id))
			.map((fieldConfig) => fieldConfig.field)
			.filter(isDefined)
			.map((field) => {
				if (fieldNameOverrides[field.id]) {
					field.name = fieldNameOverrides[field.id];
				}

				return field;
			});

		assert(slugFieldId);

		// onSubmit({
		// 	fields: allFields,
		// 	disabledFieldIds: Array.from(disabledFieldIds),
		// 	slugFieldId,
		// 	lastSyncedTime: getLastSyncedTime(pluginContext, database, slugFieldId, disabledFieldIds),
		// });
	};

	return (
		<div className="flex-1 flex flex-col gap-2 px-3">
			<form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1">
				<div className="h-[1px] border-b border-divider mb-2 sticky top-0" />
				<div className="flex-1 flex flex-col gap-4">
					<div className="flex flex-col gap-2 w-full">
						<label htmlFor="collectionName">Slug Field</label>
						<select className="w-full" value={slugFieldId ?? ""} onChange={(e) => setSlugFieldId(e.target.value)} required>
							{slugFields.map((field) => (
								<option key={field.id} value={field.id}>
									{field.name}
								</option>
							))}
						</select>
					</div>
					<div
						className="grid gap-2 w-full items-center justify-center"
						style={{
							gridTemplateColumns: `16px 1fr 8px 1fr minmax(100px, auto)`,
						}}
					>
						<span className="col-start-2 col-span-2">Notion Property</span>
						<span>Collection Field Name</span>
						<span>Import As</span>
						<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
						<StaticInput disabled>{titleField?.name ?? "Title"}</StaticInput>
						<div className="flex items-center justify-center">
							<IconChevron />
						</div>
						<StaticInput disabled>Title</StaticInput>
						<StaticInput disabled>Text</StaticInput>
						{fieldConfigList.map((fieldConfig) => {
							const id = fieldConfig.property.id;
							const isDisabled = !fieldTypes[id] || disabledFieldIds.has(id);

							return (
								<Fragment key={fieldConfig.originalFieldName}>
									<input
										type="checkbox"
										disabled={!fieldConfig.property}
										checked={!!fieldConfig.property && !isDisabled}
										className={classNames("mx-auto", isDisabled && "opacity-50")}
										onChange={() => {
											assert(fieldConfig.property);

											handleFieldToggle(id);
										}}
									/>
									<StaticInput disabled={isDisabled}>{fieldConfig.originalFieldName}</StaticInput>
									<div className={classNames("flex items-center justify-center", isDisabled && "opacity-50")}>
										<IconChevron />
									</div>
									{!fieldTypes[id] ? (
										<>
											<StaticInput disabled>Unsupported Field</StaticInput>
											<StaticInput disabled></StaticInput>
										</>
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

											{fieldConversionTypes[fieldConfig.property.type]?.length <= 1 ? (
												<StaticInput disabled={isDisabled}>{cmsFieldTypeNames[fieldTypes[id]]}</StaticInput>
											) : (
												<select
													disabled={isDisabled}
													value={fieldTypes[id]}
													onChange={(e) => handleFieldTypeChange(id, e.target.value)}
													className={classNames("w-full", isDisabled && "opacity-50")}
												>
													{fieldConfig.property &&
														fieldConversionTypes[fieldConfig.property.type]?.map((type) => (
															<option key={type} value={type}>
																{cmsFieldTypeNames[type]}
															</option>
														))}
												</select>
											)}
										</>
									)}
								</Fragment>
							);
						})}
					</div>
				</div>
				<div className="left-0 bottom-0 w-full flex flex-row justify-between gap-3 sticky bg-bg py-3 border-t border-divider border-opacity-20 max-w-full overflow-hidden">
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

function StaticInput({ children = "", disabled = false }) {
	return (
		<div className={classNames("w-full h-6 px-2 flex items-center bg-bg-secondary rounded", disabled && "opacity-50")}>
			{children}
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
	// field: CollectionField | null;
	property: NotionProperty;
	isNewField: boolean;
	originalFieldName: string;
	unsupported: boolean;
}

function sortField(fieldA: CollectionFieldConfig, fieldB: CollectionFieldConfig): number {
	// Sort unsupported fields to bottom
	if (fieldA.unsupported && fieldB.unsupported) {
		return 0;
	} else if (fieldA.unsupported) {
		return 1;
	} else if (fieldB.unsupported) {
		return -1;
	}

	return -1;
}

function createFieldConfig(database: GetDatabaseResponse, pluginContext: PluginContext): CollectionFieldConfig[] {
	if (!database || !pluginContext) {
		return [];
	}

	const result: CollectionFieldConfig[] = [];

	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	result.push({
		property: {
			id: "page-content",
			name: "Content",
			type: "page_content",
			unsupported: false,
		},
		originalFieldName: pageContentField.name,
		isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(pageContentField.id),
	});

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		// Title is always required in CMS API.
		if (property.type === "title") continue;

		result.push({
			property: property,
			// field: getCollectionFieldForProperty(property),
			unsupported: !fieldConversionTypes[property.type]?.length,
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
		});
	}

	return result.sort(sortField);
}

function createFieldTypesList(fieldConfigList: CollectionFieldConfig[]) {
	const result = {};

	for (const fieldConfig of fieldConfigList) {
		if (!fieldConfig.property) {
			continue;
		}

		const type = fieldConversionTypes[fieldConfig.property.type]?.[0];
		if (!type) {
			continue;
		}

		result[fieldConfig.property.id] = type;
	}

	return result;
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
	if (!context) {
		return null;
	}

	if (context.type === "update" && context.slugFieldId) {
		return context.slugFieldId;
	}

	return fieldOptions[0]?.id ?? null;
}

const fieldConversionTypes = {
	checkbox: ["boolean"],
	created_by: ["string"],
	created_time: ["date"],
	date: ["date"],
	email: ["string"],
	files: ["string", "link", "image"],
	formula: ["string"],
	last_edited_by: ["string"],
	last_edited_time: ["date"],
	multi_select: ["string"],
	number: ["number"],
	people: ["string"],
	phone_number: ["string"],
	relation: ["string"],
	rich_text: ["formattedText", "string"],
	rollup: ["string"],
	select: ["enum", "string"],
	status: ["enum", "string"],
	title: ["string"],
	url: ["link", "string"],
	page_content: ["formattedText"], // Fake property type for page content
};
const notionFieldTypes = Object.keys(fieldConversionTypes);

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
};
