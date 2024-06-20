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
	const { openPage } = useContext(PluginContext);
	const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();

	const [selectedDatabase, setSelectedDatabase] = useState(null);

	function handleSubmit() {
		context.database = selectedDatabase;
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
	return <div className="p-3 pt-0 flex-1 flex flex-col">ConfigureFieldsPage</div>;
}

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

////////////////////////////////////////////////////////////////////////////////

function NotionDatabaseButton({ databaseName, selected, onClick }) {
	return (
		<label htmlFor={databaseName} className="py-2 cursor-pointer flex flex-row gap-2 items-center">
			<input type="checkbox" name="database" id={databaseName} checked={selected} onChange={onClick} />
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
