import React, { useState, useRef, useEffect, useMemo, Fragment } from "react";
import classNames from "classnames";
import { framer, CollectionField } from "framer-plugin";
import { Button, BackButton } from "@shared/components.jsx";
import {
	PluginContext,
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

const notionDatabases = ["Apps", "Buildings", "Fruits & Vegetables", "Database", "Kitchen Appliances"];

function Page({ openPage, closePage, context }) {
	const isAuthenticated = true;
	const databaseSelected = false;

	let Page: any = null;
	if (!isAuthenticated) {
		Page = ConnectAccountPage;
	} else if (!databaseSelected) {
		Page = SelectDatabasePage;
	} else {
		Page = ConfigureFieldsPage;
	}

	return (
		<div className="flex flex-col size-full px-3 gap-2 overflow-y-auto hide-scrollbar">
			{closePage && <BackButton onClick={closePage} />}
			<Page context={context} openPage={openPage} />
		</div>
	);
}

function ConnectAccountPage({ context }) {
	const [isLoading, setIsLoading] = useState(false);
	const isDocumentVisible = useIsDocumentVisibile();
	const notifiedForContextRef = useRef(null);

	function onAuthenticated() {}

	useEffect(() => {
		// after authentication the user may not have returned to Framer yet.
		// So the toast is only displayed upon document being visible
		if (!isDocumentVisible) return;
		// Only notify once per context
		if (notifiedForContextRef.current === context) return;
		if (context.type !== "error") return;

		notifiedForContextRef.current = context;
		framer.notify(context.message, { variant: "error" });
	}, [context, isDocumentVisible]);

	const handleAuth = () => {
		setIsLoading(true);
		const writeKey = generateRandomId();

		// It is important to call `window.open` directly in the event handler
		// So that Safari does not block any popups.
		window.open(getOauthURL(writeKey), "_blank");

		authorize({ readKey: generateRandomId(), writeKey })
			.then(getPluginContext)
			.then(onAuthenticated)
			.finally(() => {
				setIsLoading(false);
			});
	};
	return (
		<div className="w-full flex-1 flex flex-col items-center justify-center gap-4 pb-4">
			<div className="max-w-100% rounded-md flex-shrink-0 aspect-[3/2] bg-bg-secondary" />
			<div className="flex flex-col items-center gap-2 flex-1 justify-center w-full">
				{isLoading ? (
					<span className="text-center max-w-[80%] block text-secondary">
						Complete the authentication and return to this page.
					</span>
				) : (
					<ol className="list-inside list-decimal w-full text-secondary gap-2 text-md flex flex-col flex-1">
						<li>Log in to your Notion account</li>
						<li>Pick the database you want to import</li>
						<li>Map the database fields to the CMS</li>
					</ol>
				)}
			</div>

			<Button primary onClick={handleAuth} isLoading={isLoading} disabled={isLoading}>
				Connect Notion Account
			</Button>
		</div>
	);
}

function SelectDatabasePage({ context, openPage }) {
	const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();

	const [selectedDatabase, setSelectedDatabase] = useState(null);

	function handleSubmit() {
		context.database = selectedDatabase;
		openPage(ConfigureFieldsPage, { context });
	}

	return (
		<div className="flex-1 flex flex-col gap-2 pb-3">
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

function ConfigureFieldsPage({ context }) {
	const database = context.database;

	const slugFields = useMemo(() => getPossibleSlugFields(database), [database]);
	const [slugFieldId, setSlugFieldId] = useState(() => getInitialSlugFieldId(pluginContext, slugFields));
	const [fieldConfig] = useState<CollectionFieldConfig[]>(() => createFieldConfig(database, pluginContext));
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext.type === "update" ? pluginContext.ignoredFieldIds : [])
	);
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
		getFieldNameOverrides(pluginContext)
	);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isLoading) return;

		const allFields = fieldConfig
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
		// 	ignoredFieldIds: Array.from(disabledFieldIds),
		// 	slugFieldId,
		// 	lastSyncedTime: getLastSyncedTime(pluginContext, database, slugFieldId, disabledFieldIds),
		// });
	};

	const isLoading = false;
	const error = null;
	// const database = {
	// 	url: "https://www.notion.so/abc",
	// 	title: "Database Name",
	// };

	function richTextToPlainText(text) {
		return text;
	}

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
						<input type="text" className="w-full" disabled value={"Title"} />
						<div className="flex items-center justify-center">
							<IconChevron />
						</div>
						<input type="text" className={"w-full"} placeholder={"Title"}></input>
						<div className="w-full h-full pl-2 flex items-center opacity-70 bg-bg-secondary rounded">Text</div>

						{fieldConfig.map((fieldConfig) => {
							const isDisabled = !fieldConfig.field || disabledFieldIds.has(fieldConfig.field.id);

							return (
								<Fragment key={fieldConfig.originalFieldName}>
									<input
										type="checkbox"
										disabled={!fieldConfig.field}
										checked={!!fieldConfig.field && !isDisabled}
										className={classNames("mx-auto", isDisabled && "opacity-50")}
										onChange={() => {
											assert(fieldConfig.field);

											handleFieldToggle(fieldConfig.field.id);
										}}
									/>
									<input
										type="text"
										className={classNames("w-full", isDisabled && "opacity-50")}
										disabled
										value={fieldConfig.originalFieldName}
									/>
									<div className={classNames("flex items-center justify-center", isDisabled && "opacity-50")}>
										<IconChevron />
									</div>
									<input
										type="text"
										className={classNames("w-full", isDisabled && "opacity-50")}
										disabled={!fieldConfig.field || isDisabled}
										placeholder={fieldConfig.originalFieldName}
										value={!fieldConfig.field ? "Unsupported Field" : fieldNameOverrides[fieldConfig.field.id] ?? ""}
										onChange={(e) => {
											assert(fieldConfig.field);

											handleFieldNameChange(fieldConfig.field.id, e.target.value);
										}}
									></input>
									<select disabled={isDisabled} className={classNames("w-full", isDisabled && "opacity-50")}>
										{fieldConversionTypes[fieldConfig.field.type]?.map((type) => (
											<option key={type} value={type}>
												{cmsFieldTypeNames[type]}
											</option>
										))}
									</select>
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
									href={database.url}
									className="font-semibold text-secondary hover:text-primary truncate"
									target="_blank"
									tabIndex={-1}
								>
									{richTextToPlainText(database.title)}
								</a>
							</>
						)}
					</div>
					<Button primary className="w-auto" isLoading={isLoading} disabled={!slugFieldId}>
						Import
					</Button>
				</div>
			</form>
		</div>
	);
}

////////////////////////////////////////////////////////////////////////////////

function createContext() {
	function getDatabaseLastUpdatedTime() {}

	function isAuthenticated() {
		return true;
	}

	function getFields() {
		return [
			{
				id: "abcdefg",
				name: "Color",
				type: "enum",
				cases: [
					{ id: "red", name: "Red" },
					{ id: "green", name: "Green" },
					{ id: "blue", name: "Blue" },
					{ id: "yellow", name: "Yellow" },
					{ id: "purple", name: "Purple" },
				],
			},
		];
	}

	function getItems() {
		return [
			{
				id: "item1",
				slug: "item1",
				title: "Item A",
				fieldData: {
					abcdefg: "green",
				},
			},
			{
				id: "item2",
				slug: "item2",
				title: "Item 2",
				fieldData: {
					abcdefg: "yellow",
				},
			},
		];
	}

	return {
		integrationId: "notion",
		getDatabaseLastUpdatedTime,
		isAuthenticated,
		getFields,
		getItems,
	};
}

const Integration = {
	Page,
	createContext,
};

export default Integration;

const fieldConversionTypes = {
	checkbox: ["boolean"],
	created_by: ["string"],
	created_time: ["date", "string"],
	date: ["date", "string"],
	email: ["string"],
	files: ["string", "link", "image"],
	formula: ["string"],
	last_edited_by: ["string"],
	last_edited_time: ["date", "string"],
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
};

function NotionDatabaseButton({ databaseName, databaseId, selected, onClick }) {
	return (
		<label htmlFor={databaseId} className="py-2 cursor-pointer flex flex-row gap-2 items-center">
			<input type="checkbox" name="database" id={databaseId} checked={selected} onChange={onClick} />
			{databaseName}
		</label>
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
	field: CollectionField | null;
	isNewField: boolean;
	originalFieldName: string;
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

	result.push({
		field: pageContentField,
		originalFieldName: pageContentField.name,
		isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(pageContentField.id),
	});

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		// Title is always required in CMS API.
		if (property.type === "title") continue;

		result.push({
			field: getCollectionFieldForProperty(property),
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
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
