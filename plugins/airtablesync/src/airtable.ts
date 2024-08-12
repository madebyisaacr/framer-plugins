import pLimit from "p-limit";
import { assert, formatDate, isDefined, isString, slugify } from "./utils";
import { Collection, CollectionField, CollectionItem, framer } from "framer-plugin";
import { useMutation, useQuery } from "@tanstack/react-query";
import { blocksToHtml, richTextToHTML } from "./blocksToHTML";
import Airtable from "airtable";
import type { Base, FieldSet } from "airtable";

export type FieldId = string;

const apiBaseUrl =
	window.location.hostname === "localhost" ? "http://localhost:8787" : "https://framersync-workers.isaac-b49.workers.dev";
const oauthRedirectUrl = encodeURIComponent(`${apiBaseUrl}/redirect/`);

export const getOauthURL = (writeKey: string) =>
	`https://airtable.com/oauth2/v1/authorize?client_id=da5fb6c7-a40e-4931-8f06-67507c3816eb&response_type=code&redirect_uri=${oauthRedirectUrl}&state=${writeKey}`;

// Storage for the Airtable API key.
const airtableAccessTokenKey = "airtableAccessToken";
const airtableRefreshTokenKey = "airtableRefreshToken";

const pluginBaseIdKey = "airtablePluginBaseId";
const pluginLastSyncedKey = "airtablePluginLastSynced";
const ignoredFieldIdsKey = "airtablePluginIgnoredFieldIds";
const pluginSlugIdKey = "airtablePluginSlugId";
const baseNameKey = "airtableBaseName";

// Maximum number of concurrent requests to Airtable API
// This is to prevent rate limiting.
// TODO: Is this necessary with Airtable?
const concurrencyLimit = 5;

// Naive implementation to be authenticated, a token could be expired.
// For simplicity we just close the plugin and clear storage in that case.
// TODO: Refresh the token when it expires
export function isAuthenticated() {
	return localStorage.getItem(airtableRefreshTokenKey) !== null;
}

// TODO: Check if refresh token is expired (60 days)
async function refreshToken() {
	// Do not refresh if we already have an access token
	if (sessionStorage.getItem(airtableAccessTokenKey)) {
		return;
	}

	const response = await fetch(`${apiBaseUrl}/refresh/?refresh_token=${sessionStorage.getItem(airtableRefreshTokenKey)}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
	});

	const { access_token, refresh_token } = await response.json();

	sessionStorage.setItem(airtableAccessTokenKey, access_token);
	localStorage.setItem(airtableRefreshTokenKey, refresh_token);
}

if (isAuthenticated()) {
	refreshToken();
}

// DONE
export async function airtableFetch(url: string) {
	const response = await fetch(`https://api.airtable.com/v0/${url}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${sessionStorage.getItem(airtableAccessTokenKey)}`,
		},
	});
	const data = await response.json();
	return data;
}

// The order in which we display slug fields
// DONE
const slugFieldTypes = ["singleLineText", "multilineText", "autoNumber", "aiText", "formula"];

/**
 * Given an Airtable base returns a list of possible fields that can be used as
 * a slug. And a suggested field id to use as a slug.
 */
// DONE
export function getPossibleSlugFields(table: object) {
	if (!table?.fields) {
		return [];
	}

	const options: object[] = [];

	for (const airtableField of table.fields) {
		if (slugFieldTypes.includes(airtableField.type)) {
			options.push(airtableField);
		}
	}
	function getOrderIndex(type: string): number {
		const index = slugFieldTypes.indexOf(type);
		return index === -1 ? slugFieldTypes.length : index;
	}

	options.sort((a, b) => getOrderIndex(a.type) - getOrderIndex(b.type));

	return options;
}

// Authorize the plugin with Airtable.
// DONE
export async function authorize() {
	const response = await fetch(`${apiBaseUrl}/authorize/`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
	});

	const { readKey, url } = await response.json();

	// Open the Airtable authorization URL in a new tab
	window.open(url, "_blank");

	return new Promise<void>((resolve) => {
		// Poll for the authorization status
		const interval = setInterval(async () => {
			const resp = await fetch(`${apiBaseUrl}/poll/?readKey=${readKey}`, {
				method: "POST",
			});

			const tokenInfo = await resp.json();

			if (resp.status === 200 && tokenInfo) {
				const { access_token, refresh_token } = tokenInfo;

				clearInterval(interval);
				sessionStorage.setItem(airtableAccessTokenKey, access_token);
				localStorage.setItem(airtableRefreshTokenKey, refresh_token);
				resolve();
			}
		}, 2500);
	});
}

/**
 * Given an Airtable Base field object returns a CollectionField object
 * That maps the Airtable field to the Framer CMS collection property type
 */
// DONE
export function getCollectionFieldForAirtableField(airtableField: object, name: string, type: string): CollectionField | null {
	return {
		type: type,
		id: airtableField.id,
		name,
	};
}

export function richTextToPlainText(richText: RichTextItemResponse[]) {
	return richText.map((value) => value.plain_text).join("");
}

export function getPropertyValue(airtableField, fieldType: string): unknown | undefined {
	if (airtableField === null || airtableField === undefined) {
		return null;
	}

	const value = airtableField;

	switch (airtableField.type) {
		case "createdTime":
		case "currency":
		case "date":
		case "dateTime":
		case "duration":
		case "email":
		case "autoNumber":
		case "count":
		case "checkbox":
		case "lastModifiedTime":
		case "number":
		case "percent":
		case "phoneNumber":
		case "rating":
		case "richText":
		case "rollup":
		case "singleLineText":
		case "multilineText":
		case "url":
			return value;
		case "aiText":
			return value.value;
		case "multipleAttachments":
		case "multipleRecordLinks":
			return null;
		case "barcode":
			return value.text;
		case "button":
			return value.url;
		case "singleCollaborator":
		case "createdBy":
		case "lastModifiedBy":
			return value.name || null;
		case "formula":
			return Array.isArray(value) ? value.join(", ") : value;
		case "multipleLookupValues":
			return value.map((item) => String(item)).join(", ");
		case "multipleCollaborators":
		case "multipleSelects":
			return value.map((item) => item.name).join(", ");
		case "singleSelect":
		case "externalSyncSource":
			return value.name;
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

// async function getPageBlocksAsRichText(pageId: string) {
// 	assert(notion, "Notion client is not initialized");

// 	const blocks = await collectPaginatedAPI(notion.blocks.children.list, {
// 		block_id: pageId,
// 	});

// 	assert(blocks.every(isFullBlock), "Response is not a full block");

// 	return blocksToHtml(blocks);
// }

// async function processItem(
// 	item: PageObjectResponse,
// 	fieldsById: FieldsById,
// 	slugFieldId: string,
// 	status: SyncStatus,
// 	unsyncedItemIds: Set<string>,
// 	lastSyncedTime: string | null
// ): Promise<CollectionItem | null> {
// 	let slugValue: null | string = null;
// 	let titleValue: null | string = null;

// 	const fieldData: Record<string, unknown> = {};

// 	// Mark the item as seen
// 	unsyncedItemIds.delete(item.id);

// 	assert(isFullPage(item));

// 	if (isUnchangedSinceLastSync(item.last_edited_time, lastSyncedTime)) {
// 		status.info.push({
// 			message: `Skipping. last updated: ${formatDate(item.last_edited_time)}, last synced: ${formatDate(lastSyncedTime!)}`,
// 			url: item.url,
// 		});
// 		return null;
// 	}

// 	for (const key in item.properties) {
// 		const property = item.properties[key];
// 		assert(property);

// 		if (property.type === "title") {
// 			const resolvedTitle = getPropertyValue(property, "string");
// 			if (!resolvedTitle || typeof resolvedTitle !== "string") {
// 				continue;
// 			}

// 			titleValue = resolvedTitle;
// 		}

// 		if (property.id === slugFieldId) {
// 			const resolvedSlug = getPropertyValue(property, "string");
// 			if (!resolvedSlug || typeof resolvedSlug !== "string") {
// 				continue;
// 			}
// 			slugValue = slugify(resolvedSlug);
// 		}

// 		const field = fieldsById.get(property.id);

// 		// We can continue if the property was not included in the field mapping
// 		if (!field) {
// 			continue;
// 		}

// 		const fieldValue = getPropertyValue(property, field.type);
// 		if (!fieldValue) {
// 			status.warnings.push({
// 				url: item.url,
// 				fieldId: field.id,
// 				message: `Value is missing for field ${field.name}`,
// 			});
// 			continue;
// 		}

// 		fieldData[field.id] = fieldValue;
// 	}

// 	if (fieldsById.has(pageContentField.id) && item.id) {
// 		const contentHTML = await getPageBlocksAsRichText(item.id);
// 		fieldData[pageContentField.id] = contentHTML;
// 	}

// 	if (fieldsById.has("page-cover") && item.cover && item.cover.type === "external") {
// 		fieldData["page-cover"] = item.cover.external.url;
// 	}

// 	if (fieldsById.has("page-icon") && item.icon) {
// 		const iconFieldType = fieldsById.get("page-icon")?.type;

// 		let value: string | null = null;
// 		if (iconFieldType === "string") {
// 			if (item.icon.type === "emoji") {
// 				value = item.icon.emoji;
// 			}
// 		} else if (iconFieldType === "image") {
// 			if (item.icon.type === "external") {
// 				value = item.icon.external.url;
// 			} else if (item.icon.type === "file") {
// 				value = item.icon.file.url;
// 			}
// 		}

// 		if (value) {
// 			fieldData["page-icon"] = value;
// 		}
// 	}

// 	if (!slugValue || !titleValue) {
// 		status.warnings.push({
// 			url: item.url,
// 			message: "Slug or Title is missing. Skipping item.",
// 		});
// 		return null;
// 	}

// 	return {
// 		id: item.id,
// 		fieldData,
// 		slug: slugValue,
// 		title: titleValue,
// 	};
// }

// type FieldsById = Map<FieldId, CollectionField>;

// // Function to process all items concurrently with a limit
// async function processAllItems(
// 	data: PageObjectResponse[],
// 	fieldsByKey: FieldsById,
// 	slugFieldId: string,
// 	unsyncedItemIds: Set<FieldId>,
// 	lastSyncedDate: string | null
// ) {
// 	const limit = pLimit(concurrencyLimit);
// 	const status: SyncStatus = {
// 		errors: [],
// 		info: [],
// 		warnings: [],
// 	};
// 	const promises = data.map((item) =>
// 		limit(() => processItem(item, fieldsByKey, slugFieldId, status, unsyncedItemIds, lastSyncedDate))
// 	);
// 	const results = await Promise.all(promises);

// 	const collectionItems = results.filter(isDefined);

// 	return {
// 		collectionItems,
// 		status,
// 	};
// }

export async function synchronizeDatabase(
	database: GetDatabaseResponse,
	{ fields, ignoredFieldIds, lastSyncedTime, slugFieldId }: SynchronizeMutationOptions
): Promise<SynchronizeResult> {
	return null;

	// assert(isFullDatabase(database));
	// assert(notion);

	// const collection = await framer.getCollection();
	// await collection.setFields(fields);

	// const fieldsById = new Map<string, CollectionField>();
	// for (const field of fields) {
	// 	fieldsById.set(field.id, field);
	// }

	// const unsyncedItemIds = new Set(await collection.getItemIds());

	// const data = await collectPaginatedAPI(notion.databases.query, {
	// 	database_id: database.id,
	// });

	// assert(data.every(isFullPage), "Response is not a full page");

	// const { collectionItems, status } = await processAllItems(data, fieldsById, slugFieldId, unsyncedItemIds, lastSyncedTime);

	// console.log("Submitting database");
	// console.table(collectionItems);

	// try {
	// 	await collection.addItems(collectionItems);

	// 	const itemsToDelete = Array.from(unsyncedItemIds);
	// 	await collection.removeItems(itemsToDelete);

	// 	await Promise.all([
	// 		collection.setPluginData(ignoredFieldIdsKey, JSON.stringify(ignoredFieldIds)),
	// 		collection.setPluginData(pluginBaseIdKey, database.id),
	// 		collection.setPluginData(pluginLastSyncedKey, new Date().toISOString()),
	// 		collection.setPluginData(pluginSlugIdKey, slugFieldId),
	// 		collection.setPluginData(baseNameKey, richTextToPlainText(database.title)),
	// 	]);

	// 	return {
	// 		status: status.errors.length === 0 ? "success" : "completed_with_errors",
	// 		errors: status.errors,
	// 		info: status.info,
	// 		warnings: status.warnings,
	// 	};
	// } catch (error) {
	// 	// There is a bug where framer-plugin throws errors as Strings instead of wrapping them in an Error object.
	// 	// This is a workaround until we land that PR.
	// 	if (isString(error)) {
	// 		throw new Error(error);
	// 	}

	// 	throw error;
	// }
}

export function useSynchronizeDatabaseMutation(
	database: GetDatabaseResponse | null,
	{ onSuccess, onError }: { onSuccess?: (result: SynchronizeResult) => void; onError?: (error: Error) => void } = {}
) {
	return null;

	// return useMutation({
	// 	onError(error) {
	// 		console.error("Synchronization failed", error);

	// 		onError?.(error);
	// 	},
	// 	onSuccess,
	// 	mutationFn: async (options: SynchronizeMutationOptions): Promise<SynchronizeResult> => {
	// 		assert(database);

	// 		return synchronizeDatabase(database, options);
	// 	},
	// });
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

export interface PluginContextNew {
	type: "new";
	collection: Collection;
	isAuthenticated: boolean;
}

export interface PluginContextUpdate {
	type: "update";
	database: object;
	collection: Collection;
	collectionFields: CollectionField[];
	lastSyncedTime: string;
	hasChangedFields: boolean;
	ignoredFieldIds: FieldId[];
	slugFieldId: string | null;
	isAuthenticated: boolean;
}

export interface PluginContextError {
	type: "error";
	message: string;
	isAuthenticated: false;
}

export type PluginContext = PluginContextNew | PluginContextUpdate | PluginContextError;

function getIgnoredFieldIds(rawIgnoredFields: string | null) {
	if (!rawIgnoredFields) {
		return [];
	}

	const parsed = JSON.parse(rawIgnoredFields);
	if (!Array.isArray(parsed)) return [];
	if (!parsed.every(isString)) return [];

	return parsed;
}

function getSuggestedFieldsForTable(table: object, ignoredFieldIds: FieldId[]) {
	const airtableFields: object[] = [];

	for (const airtableField of table.airtableFields) {
		// These fields were ignored by the user
		if (ignoredFieldIds.includes(airtableField.id)) continue;

		const field = getCollectionFieldForAirtableField(airtableField);
		if (field) {
			airtableFields.push(field);
		}
	}

	return airtableFields;
}

export async function getPluginContext(): Promise<PluginContext> {
	const collection = await framer.getCollection();
	const collectionFields = await collection.getFields();
	const databaseId = await collection.getPluginData(pluginBaseIdKey);
	const hasAuthToken = isAuthenticated();

	if (!databaseId || !hasAuthToken) {
		return {
			type: "new",
			collection,
			isAuthenticated: hasAuthToken,
		};
	}

	try {
		// assert(notion, "Notion client is not initialized");
		// const database = await notion.databases.retrieve({ database_id: databaseId });

		const [rawIgnoredFieldIds, lastSyncedTime, slugFieldId] = await Promise.all([
			collection.getPluginData(ignoredFieldIdsKey),
			collection.getPluginData(pluginLastSyncedKey),
			collection.getPluginData(pluginSlugIdKey),
		]);

		const ignoredFieldIds = getIgnoredFieldIds(rawIgnoredFieldIds);

		assert(lastSyncedTime, "Expected last synced time to be set");

		return {
			type: "update",
			// database,
			collection,
			collectionFields,
			ignoredFieldIds,
			lastSyncedTime,
			slugFieldId,
			// hasChangedFields: hasFieldConfigurationChanged(collectionFields, database, ignoredFieldIds),
			isAuthenticated: hasAuthToken,
		};
	} catch (error) {
		// if (isNotionClientError(error) && error.code === APIErrorCode.ObjectNotFound) {
		const databaseName = (await collection.getPluginData(baseNameKey)) ?? "Unkown";

		return {
			type: "error",
			message: `The database "${databaseName}" was not found. Log in with Notion and select the Database to sync.`,
			isAuthenticated: false,
		};
		// }

		throw error;
	}
}

export function hasFieldConfigurationChanged(
	currentConfig: CollectionField[],
	table: object,
	ignoredFieldIds: string[]
): boolean {
	const currentFieldsById = new Map<string, CollectionField>();
	for (const field of currentConfig) {
		currentFieldsById.set(field.id, field);
	}

	const suggestedFields = getSuggestedFieldsForTable(table, ignoredFieldIds);
	if (suggestedFields.length !== currentConfig.length) return true;

	const includedFields = suggestedFields.filter((field) => currentFieldsById.has(field.id));

	for (const field of includedFields) {
		const currentField = currentFieldsById.get(field.id);

		if (!currentField) return true;
		if (currentField.type !== field.type) return true;
	}

	return false;
}

// // DONE
// export function isUnchangedSinceLastSync(lastEditedTime: string, lastSyncedTime: string | null): boolean {
// 	if (!lastSyncedTime) return false;

// 	const lastEdited = new Date(lastEditedTime);
// 	const lastSynced = new Date(lastSyncedTime);
// 	// Last edited time is rounded to the nearest minute.
// 	// So we should round lastSyncedTime to the nearest minute as well.
// 	lastSynced.setSeconds(0, 0);

// 	return lastSynced > lastEdited;
// }
