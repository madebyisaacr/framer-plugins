import React, { useState, useRef, useEffect, useMemo, Fragment } from "react";
import classNames from "classnames";

import { Button, BackButton } from "@shared/components.jsx";

const stage = "configureFields"; // connectAccount, selectDatabase, configureFields
const notionDatabases = ["Apps", "Buildings", "Fruits & Vegetables", "Database", "Kitchen Appliances"];

export function NotionPage({ openPage, closePage }) {
	return (
		<div className="flex flex-col size-full p-3 pt-0 gap-2">
			<BackButton onClick={closePage} />
			<div className="flex-1"></div>
			<Button primary onClick={() => openPage(SelectDatabasePage)}>
				Connect Notion Account
			</Button>
		</div>
	);
}

function SelectDatabasePage({ openPage, closePage }) {
	return (
		<div className="flex-1 flex flex-col gap-2 p-3 pt-0">
			<BackButton onClick={closePage} />
			<p>Select a database to sync</p>
			<div className="flex-1 flex flex-col divide-y divide-divider">
				{notionDatabases.map((database) => (
					<NotionDatabaseButton databaseName={database} onClick={() => openPage(ConfigureFieldsPage)} />
				))}
			</div>
		</div>
	);
}

function ConfigureFieldsPage({ openPage, closePage }) {
	// const slugFields = useMemo(() => getPossibleSlugFields(database), [database]);
	const slugFields = [
		{
			field: {
				id: "abc",
			},
			originalFieldName: "abc",
		},
	];
	// const [slugFieldId, setSlugFieldId] = useState(() => getInitialSlugFieldId(pluginContext, slugFields));
	const [slugFieldId, setSlugFieldId] = useState("");
	// const [fieldConfig] = useState<CollectionFieldConfig[]>(() => createFieldConfig(database, pluginContext));
	const [fieldConfig] = useState([
		{
			field: {
				id: "abc",
			},
			originalFieldName: "abc",
		},
	]);
	// const [disabledFieldIds, setDisabledFieldIds] = useState(
	// 	() => new Set<string>(pluginContext.type === "update" ? pluginContext.ignoredFieldIds : [])
	// );
	const [disabledFieldIds, setDisabledFieldIds] = useState(new Set());
	// const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
	// 	getFieldNameOverrides(pluginContext)
	// );
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>([]);

	// // assert(isFullDatabase(database));

	// const handleFieldToggle = (key: string) => {
	// 	setDisabledFieldIds((current) => {
	// 		const nextSet = new Set(current);
	// 		if (nextSet.has(key)) {
	// 			nextSet.delete(key);
	// 		} else {
	// 			nextSet.add(key);
	// 		}

	// 		return nextSet;
	// 	});
	// };

	// const handleFieldNameChange = (id: string, value: string) => {
	// 	setFieldNameOverrides((current) => ({
	// 		...current,
	// 		[id]: value,
	// 	}));
	// };

	// const handleSubmit = (e: React.FormEvent) => {
	// 	e.preventDefault();

	// 	if (isLoading) return;

	// 	const allFields = fieldConfig
	// 		.filter((fieldConfig) => fieldConfig.field && !disabledFieldIds.has(fieldConfig.field.id))
	// 		.map((fieldConfig) => fieldConfig.field)
	// 		.filter(isDefined)
	// 		.map((field) => {
	// 			if (fieldNameOverrides[field.id]) {
	// 				field.name = fieldNameOverrides[field.id];
	// 			}

	// 			return field;
	// 		});

	// 	assert(slugFieldId);

	// 	onSubmit({
	// 		fields: allFields,
	// 		ignoredFieldIds: Array.from(disabledFieldIds),
	// 		slugFieldId,
	// 		lastSyncedTime: getLastSyncedTime(pluginContext, database, slugFieldId, disabledFieldIds),
	// 	});
	// };

	const isLoading = false;
	const error = null;
	const database = {
		url: "https://www.notion.so/abc",
		title: "Database Name",
	};

	function richTextToPlainText(text) {
		return text;
	}

	function handleSubmit() {}

	function handleFieldToggle(fieldId) {}

	function handleFieldNameChange(fieldId, name) {}

	return (
		<div className="flex-1 flex flex-col gap-2 p-3 pt-0">
			<BackButton onClick={closePage} />
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
							gridTemplateColumns: `16px 1fr 8px 1fr`,
						}}
					>
						<span className="col-start-2 col-span-2">Notion Property</span>
						<span>Collection Field</span>
						<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
						<input type="text" className="w-full opacity-50" disabled value={"Title"} />
						<div className="flex items-center justify-center opacity-50">
							<IconChevron />
						</div>
						<input type="text" className={"w-full opacity-50"} disabled={true} placeholder={"Title"}></input>

						{fieldConfig.map((fieldConfig) => {
							const isUnsupported = !fieldConfig.field;

							return (
								<Fragment key={fieldConfig.originalFieldName}>
									<input
										type="checkbox"
										disabled={!fieldConfig.field}
										checked={!!fieldConfig.field && !disabledFieldIds.has(fieldConfig.field.id)}
										className={classNames("mx-auto", isUnsupported && "opacity-50")}
										onChange={() => {
											// assert(fieldConfig.field);

											handleFieldToggle(fieldConfig.field.id);
										}}
									/>
									<input
										type="text"
										className={classNames("w-full", isUnsupported && "opacity-50")}
										disabled
										value={fieldConfig.originalFieldName}
									/>
									<div className={classNames("flex items-center justify-center", isUnsupported && "opacity-50")}>
										<IconChevron />
									</div>
									<input
										type="text"
										className={classNames("w-full", isUnsupported && "opacity-50")}
										disabled={!fieldConfig.field || disabledFieldIds.has(fieldConfig.field.id)}
										placeholder={fieldConfig.originalFieldName}
										value={!fieldConfig.field ? "Unsupported Field" : fieldNameOverrides[fieldConfig.field.id] ?? ""}
										onChange={(e) => {
											// assert(fieldConfig.field);

											handleFieldNameChange(fieldConfig.field.id, e.target.value);
										}}
									></input>
								</Fragment>
							);
						})}
					</div>
				</div>

				<div className="left-0 bottom-0 w-full flex flex-col gap-3 sticky bg-bg pt-3 border-t border-divider border-opacity-20 max-w-full overflow-hidden">
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
					<Button primary isLoading={isLoading} disabled={!slugFieldId}>
						Import
					</Button>
				</div>
			</form>
		</div>
	);
}

///////////////////////////////////////////////////////////////////////

function NotionDatabaseButton({ databaseName, onClick }) {
	return (
		<div onClick={onClick} className="py-2 cursor-pointer">
			{databaseName}
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
