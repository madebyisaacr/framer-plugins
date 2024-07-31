import {
	APIErrorCode,
	Client,
	collectPaginatedAPI,
	isFullBlock,
	isFullDatabase,
	isFullPage,
	isNotionClientError,
} from "@notionhq/client";
import pLimit from "p-limit";
import { GetDatabaseResponse, PageObjectResponse, RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import { assert, formatDate, isDefined, isString, slugify } from "@plugin/src/utils";
import { Collection, CollectionField, CollectionItem, framer } from "framer-plugin";
import { useMutation, useQuery } from "@tanstack/react-query";
import { blocksToHtml, richTextToHTML } from "./blocksToHTML";
import { pluginDataKeys } from "@plugin/src/shared";

export type FieldId = string;

const apiBaseUrl = "https://framersync.isaac-b49.workers.dev";
const oauthRedirectUrl = encodeURIComponent(`${apiBaseUrl}/auth/authorize/callback`);

export const getOauthURL = (writeKey: string) =>
	`https://api.notion.com/v1/oauth/authorize?client_id=3504c5a7-9f75-4f87-aa1b-b735f8480432&response_type=code&owner=user&redirect_uri=${oauthRedirectUrl}&state=${writeKey}`;

// Storage for the notion API key.
const notionBearerStorageKey = "notionBearerToken";

const pluginDatabaseIdKey = "notionPluginDatabaseId";
const pluginLastSyncedKey = "notionPluginLastSynced";
const ignoredFieldIdsKey = "notionPluginIgnoredFieldIds";
const pluginSlugIdKey = "notionPluginSlugId";
const databaseNameKey = "notionDatabaseName";

// Maximum number of concurrent requests to Notion API
// This is to prevent rate limiting.
const concurrencyLimit = 5;

export type NotionProperty = GetDatabaseResponse["properties"][string];

// A page in database consists of blocks.
// We allow configuration to include this as a field in the collection.
// This is used as an identifier to recognize that property and treat it as page content
export const pageContentField: CollectionField = {
	type: "formattedText",
	id: "page-content",
	name: "Content",
};

// Naive implementation to be authenticated, a token could be expired.
// For simplicity we just close the plugin and clear storage in that case.
export function isAuthenticated() {
	return true;
	// return localStorage.getItem(notionBearerStorageKey) !== null;
}

let notion: Client | null = null;
if (isAuthenticated()) {
	initNotionClient();
}

export function initNotionClient() {
	// const token = localStorage.getItem(notionBearerStorageKey);
	const token = import.meta.env.VITE_NOTION_API_KEY;
	if (!token) throw new Error("Notion API token is missing");

	notion = new Client({
		auth: token,
		fetch: async (url, fetchInit) => {
			const urlObj = new URL(url);

			try {
				const resp = await fetch(`${apiBaseUrl}/notion${urlObj.pathname}${urlObj.search}`, fetchInit);

				// If status is unauthorized, clear the token
				// And we close the plugin (for now)
				// TODO: Improve this flow in the plugin.
				if (resp.status === 401) {
					localStorage.removeItem(notionBearerStorageKey);
					await framer.closePlugin("Notion Authorization Failed. Re-open the plugin to re-authorize.", {
						variant: "error",
					});
					return resp;
				}

				return resp;
			} catch (error) {
				console.log("Notion API error", error);
				throw error;
			}
		},
	});
}

// The order in which we display slug fields
const preferedSlugFieldOrder: NotionProperty["type"][] = ["title", "unique_id", "rich_text", "formula"];

/**
 * Given a Notion Database returns a list of possible fields that can be used as
 * a slug. And a suggested field id to use as a slug.
 */
export function getPossibleSlugFields(database: GetDatabaseResponse) {
	if (!database) {
		return [];
	}

	const options: NotionProperty[] = [];

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		switch (property.type) {
			case "title":
			case "rich_text":
			case "unique_id":
			case "formula":
				options.push(property);
				break;
		}
	}
	function getOrderIndex(type: NotionProperty["type"]): number {
		const index = preferedSlugFieldOrder.indexOf(type);
		return index === -1 ? preferedSlugFieldOrder.length : index;
	}

	options.sort((a, b) => getOrderIndex(a.type) - getOrderIndex(b.type));

	return options;
}

// Authorize the plugin with Notion.
export async function authorize(options: { readKey: string; writeKey: string }) {
	await fetch(`${apiBaseUrl}/auth/authorize`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(options),
	});

	return new Promise<void>((resolve) => {
		// Poll for the authorization status
		const interval = setInterval(async () => {
			const resp = await fetch(`${apiBaseUrl}/auth/authorize/${options.readKey}`);

			const { token } = await resp.json();

			if (resp.status === 200 && token) {
				clearInterval(interval);
				localStorage.setItem(notionBearerStorageKey, token);
				initNotionClient();
				resolve();
			}
		}, 2500);
	});
}

/**
 * Given a Notion Database Properties object returns a CollectionField object
 * That maps the Notion Property to the Framer CMS collection property type
 */
export function getCollectionFieldForProperty(property: NotionProperty, name: string, type: string): CollectionField | null {
	if (type == "enum") {
		let cases: any[] = [];

		if (property.type == "select") {
			cases = property.select.options.map((option) => ({
				id: option.id,
				name: option.name,
			}));
		} else if (property.type == "status") {
			cases = property.status.options.map((option) => ({
				id: option.id,
				name: option.name,
			}));
		}

		return {
			type: "enum",
			id: property.id,
			name,
			cases,
		};
	}

	return {
		type: type,
		id: property.id,
		name,
	};
}

export function richTextToPlainText(richText: RichTextItemResponse[]) {
	return richText.map((value) => value.plain_text).join("");
}

export function getPropertyValue(property: PageObjectResponse["properties"][string], fieldType: string): unknown | undefined {
	const value = property[property.type];

	switch (property.type) {
		case "checkbox":
		case "created_time":
		case "last_edited_time":
		case "url":
		case "number":
		case "phone_number":
		case "email":
			return value;
		case "title":
		case "rich_text":
			return fieldType === "formattedText" ? richTextToHTML(value) : richTextToPlainText(value);
		case "created_by":
		case "last_edited_by":
			return value?.id;
		case "formula":
			return String(value[value.type] ?? "");
		case "rollup":
			return ""; // TODO: Handle rollups
		case "multi_select":
			return value.map((option) => option.name).join(", ");
		case "people":
			return value.map((person) => person.id).join(", ");
		case "relation":
			return ""; // TODO: Handle relations
		case "date":
			return value?.start;
		case "files":
			return ""; // TODO: Handle files
		case "select":
		case "status":
			return fieldType == "enum" ? value?.id : value?.name;
		case "unique_id":
			return fieldType == "string" ? (value.prefix ? `${value.prefix}-${value.number}` : String(value.number)) : value.number;
	}

	return null;
}

export interface SynchronizeMutationOptions {
	fields: CollectionField[];
	ignoredFieldIds: string[];
	lastSyncedTime: string | null;
	slugFieldId: string;
}

export interface ItemResult {
	url: string;
	fieldId?: string;
	message: string;
}

interface SyncStatus {
	errors: ItemResult[];
	warnings: ItemResult[];
	info: ItemResult[];
}

export interface SynchronizeResult extends SyncStatus {
	status: "success" | "completed_with_errors";
}

async function getPageBlocksAsRichText(pageId: string) {
	assert(notion, "Notion client is not initialized");

	const blocks = await collectPaginatedAPI(notion.blocks.children.list, {
		block_id: pageId,
	});

	assert(blocks.every(isFullBlock), "Response is not a full block");

	return blocksToHtml(blocks);
}

async function processItem(
	item: PageObjectResponse,
	fieldsById: FieldsById,
	slugFieldId: string,
	status: SyncStatus,
	unsyncedItemIds: Set<string>,
	lastSyncedTime: string | null,
): Promise<CollectionItem | null> {
	let slugValue: null | string = null;
	let titleValue: null | string = null;

	const fieldData: Record<string, unknown> = {};

	console.log(item);

	// Mark the item as seen
	unsyncedItemIds.delete(item.id);

	assert(isFullPage(item));

	if (isUnchangedSinceLastSync(item.last_edited_time, lastSyncedTime)) {
		status.info.push({
			message: `Skipping. last updated: ${formatDate(item.last_edited_time)}, last synced: ${formatDate(lastSyncedTime!)}`,
			url: item.url,
		});
		return null;
	}

	for (const key in item.properties) {
		const property = item.properties[key];
		assert(property);

		if (property.type === "title") {
			const resolvedTitle = getPropertyValue(property, "string");
			if (!resolvedTitle || typeof resolvedTitle !== "string") {
				continue;
			}

			titleValue = resolvedTitle;
		}

		if (property.id === slugFieldId) {
			const resolvedSlug = getPropertyValue(property, "string");
			if (!resolvedSlug || typeof resolvedSlug !== "string") {
				continue;
			}
			slugValue = slugify(resolvedSlug);
		}

		const field = fieldsById.get(property.id);

		// We can continue if the property was not included in the field mapping
		if (!field) {
			continue;
		}

		const fieldValue = getPropertyValue(property, field.type);
		if (!fieldValue) {
			status.warnings.push({
				url: item.url,
				fieldId: field.id,
				message: `Value is missing for field ${field.name}`,
			});
			continue;
		}

		fieldData[field.id] = fieldValue;
	}

	if (fieldsById.has(pageContentField.id)) {
		const contentHTML = await getPageBlocksAsRichText(item.id);
		fieldData[pageContentField.id] = contentHTML;
	}

	if (fieldsById.has("page-cover") && item.cover && item.cover.type === "external") {
		fieldData["page-cover"] = item.cover.external.url;
		console.log("cover", item.cover.external.url);
	}

	if (fieldsById.has("page-icon") && item.icon) {
		const iconFieldType = fieldsById.get("page-icon")?.type;

		let value: string | null = null;
		if (iconFieldType === "string") {
			if (item.icon.type === "emoji") {
				value = item.icon.emoji;
			}
		} else if (iconFieldType === "image") {
			if (item.icon.type === "external") {
				value = item.icon.external.url;
			} else if (item.icon.type === "file") {
				value = item.icon.file.url;
			}
		}

		if (value) {
			fieldData["page-icon"] = value;
			console.log("icon", value);
		}
	}

	if (!slugValue || !titleValue) {
		status.warnings.push({
			url: item.url,
			message: "Slug or Title is missing. Skipping item.",
		});
		return null;
	}

	return {
		id: item.id,
		fieldData,
		slug: slugValue,
		title: titleValue,
	};
}

type FieldsById = Map<FieldId, CollectionField>;

// Function to process all items concurrently with a limit
export async function processAllItems(
	data: PageObjectResponse[],
	fieldsByKey: FieldsById,
	slugFieldId: string,
	unsyncedItemIds: Set<FieldId>,
	lastSyncedDate: string | null
) {
	const limit = pLimit(concurrencyLimit);
	const status: SyncStatus = {
		errors: [],
		info: [],
		warnings: [],
	};
	const promises = data.map((item) =>
		limit(() => processItem(item, fieldsByKey, slugFieldId, status, unsyncedItemIds, lastSyncedDate))
	);
	const results = await Promise.all(promises);

	const collectionItems = results.filter(isDefined);

	return {
		collectionItems,
		status,
	};
}

// export async function getItems(database) {
// 	const data = await collectPaginatedAPI(notion.databases.query, {
// 		database_id: database.id,
// 	});

// 	// let items: any[] = [];
// 	// for (const item of data) {
// 	// 	items.push({
// 	// 		id: item.id,
// 	// 	});
// 	// }

// 	const { collectionItems, status } = await processAllItems(data, fieldsById, slugFieldId, unsyncedItemIds, lastSyncedTime);

// 	return [];
// }

export async function synchronizeDatabase(
	database: GetDatabaseResponse,
	{ fields, disabledFieldIds, lastSyncedTime, slugFieldId }: SynchronizeMutationOptions
): Promise<SynchronizeResult> {
	assert(isFullDatabase(database));
	assert(notion);

	const collection = await framer.getCollection();
	await collection.setFields(fields);

	const fieldsById = new Map<string, CollectionField>();
	for (const field of fields) {
		fieldsById.set(field.id, field);
	}

	const unsyncedItemIds = new Set(await collection.getItemIds());

	const data = await collectPaginatedAPI(notion.databases.query, {
		database_id: database.id,
	});

	assert(data.every(isFullPage), "Response is not a full page");

	const { collectionItems, status } = await processAllItems(data, fieldsById, slugFieldId, unsyncedItemIds, lastSyncedTime);

	console.log("Submitting database");
	console.table(collectionItems);

	try {
		await collection.addItems(collectionItems);

		const itemsToDelete = Array.from(unsyncedItemIds);
		await collection.removeItems(itemsToDelete);

		collection.setPluginData(pluginDataKeys.lastSyncedTime, new Date().toISOString());

		return {
			status: status.errors.length === 0 ? "success" : "completed_with_errors",
			errors: status.errors,
			info: status.info,
			warnings: status.warnings,
		};
	} catch (error) {
		// There is a bug where framer-plugin throws errors as Strings instead of wrapping them in an Error object.
		// This is a workaround until we land that PR.
		if (isString(error)) {
			throw new Error(error);
		}

		throw error;
	}
}

export function useSynchronizeDatabaseMutation(
	database: GetDatabaseResponse | null,
	{ onSuccess, onError }: { onSuccess?: (result: SynchronizeResult) => void; onError?: (error: Error) => void } = {}
) {
	return useMutation({
		onError(error) {
			console.error("Synchronization failed", error);

			onError?.(error);
		},
		onSuccess,
		mutationFn: async (options: SynchronizeMutationOptions): Promise<SynchronizeResult> => {
			assert(database);

			return synchronizeDatabase(database, options);
		},
	});
}

export function useDatabasesQuery() {
	assert(notion);
	return useQuery({
		queryKey: ["databases"],
		queryFn: async () => {
			assert(notion);
			const results = await collectPaginatedAPI(notion.search, {
				filter: {
					property: "object",
					value: "database",
				},
			});

			return results.filter(isFullDatabase);
		},
	});
}

function getIgnoredFieldIds(rawIgnoredFields: string | null) {
	if (!rawIgnoredFields) {
		return [];
	}

	const parsed = JSON.parse(rawIgnoredFields);
	if (!Array.isArray(parsed)) return [];
	if (!parsed.every(isString)) return [];

	return parsed;
}

function getSuggestedFieldsForDatabase(database: GetDatabaseResponse, ignoredFieldIds: FieldId[]) {
	const fields: CollectionField[] = [];

	if (!ignoredFieldIds.includes(pageContentField.id)) {
		fields.push(pageContentField);
	}

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		// These fields were ignored by the user
		if (ignoredFieldIds.includes(property.id)) continue;

		if (property.type === "title") continue;

		const field = getCollectionFieldForProperty(property);
		if (field) {
			fields.push(field);
		}
	}

	return fields;
}

export function hasFieldConfigurationChanged(
	currentConfig: CollectionField[],
	database: GetDatabaseResponse,
	ignoredFieldIds: string[]
): boolean {
	const currentFieldsById = new Map<string, CollectionField>();
	for (const field of currentConfig) {
		currentFieldsById.set(field.id, field);
	}

	const suggestedFields = getSuggestedFieldsForDatabase(database, ignoredFieldIds);
	if (suggestedFields.length !== currentConfig.length) return true;

	const includedFields = suggestedFields.filter((field) => currentFieldsById.has(field.id));

	for (const field of includedFields) {
		const currentField = currentFieldsById.get(field.id);

		if (!currentField) return true;
		if (currentField.type !== field.type) return true;
	}

	return false;
}

export function isUnchangedSinceLastSync(lastEditedTime: string, lastSyncedTime: string | null): boolean {
	if (!lastSyncedTime) return false;

	const lastEdited = new Date(lastEditedTime);
	const lastSynced = new Date(lastSyncedTime);
	// Last edited time is rounded to the nearest minute.
	// So we should round lastSyncedTime to the nearest minute as well.
	lastSynced.setSeconds(0, 0);

	return lastSynced > lastEdited;
}

export async function getDatabase(databaseId: string) {
	assert(notion, "Notion client is not initialized");

	const database = await notion?.databases.retrieve({ database_id: databaseId });
	return database ?? null;
}
