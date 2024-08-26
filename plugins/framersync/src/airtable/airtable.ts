import pLimit from "p-limit";
import { assert, formatDate, isDefined, isString, slugify } from "../utils";
import { CollectionField, CollectionItem, framer } from "framer-plugin";
import { useMutation, useQuery } from "@tanstack/react-query";
import { richTextToPlainText, richTextToHTML } from "./richText";
import { PluginContext } from "../general/PluginContext";

type FieldId = string;

const apiBaseUrl =
	window.location.hostname === "localhost"
		? "http://localhost:8787/airtable"
		: "https://framersync-workers.isaac-b49.workers.dev/airtable";

let airtableAccessToken: string | null = null;

// Storage for the Airtable API key refresh token.
const airtableRefreshTokenKey = "airtableRefreshToken";

const pluginBaseIdKey = "airtablePluginBaseId";
const pluginTableIdKey = "airtablePluginTableId";
const pluginLastSyncedKey = "airtablePluginLastSynced";
const ignoredFieldIdsKey = "airtablePluginIgnoredFieldIds";
const pluginSlugIdKey = "airtablePluginSlugId";
const baseNameKey = "airtableBaseName";

// Maximum number of concurrent requests to Airtable API
// This is to prevent rate limiting.
// TODO: Is this necessary with Airtable?
const concurrencyLimit = 5;

export async function getIntegrationContext(integrationData: object, databaseName: string) {
	const { baseId, tableId } = integrationData;

	if (!baseId || !tableId) {
		return null;
	}

	try {
		const baseSchema = await airtableFetch(`meta/bases/${baseId}/tables`);
		console.log(baseSchema);

		const table = baseSchema.tables.find((t) => t.id === tableId);
		console.log(table);

		return {
			baseId,
			tableId,
			baseSchema,
			table,
		};
	} catch (error) {
		return new Error(
			`The Airtable base "${databaseName}" was not found. Log in with Airtable and select the Base to sync.`
		);
	}
}

export function getStoredIntegrationData(integrationContext: object) {
	const { baseId, tableId } = integrationContext;

	if (!baseId || !tableId) {
		return null;
	}

	return {
		baseId,
		tableId,
	};
}

// Naive implementation to be authenticated, a token could be expired.
// For simplicity we just close the plugin and clear storage in that case.
// TODO: Refresh the token when it expires
export function isAuthenticated() {
	return localStorage.getItem(airtableRefreshTokenKey) !== null;
}

// TODO: Check if refresh token is expired (60 days)
export async function refreshAirtableToken() {
	// Do not refresh if we already have an access token
	if (airtableAccessToken) {
		return;
	}

	const response = await fetch(
		`${apiBaseUrl}/refresh/?refresh_token=${localStorage.getItem(airtableRefreshTokenKey)}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	const responseJson = await response.json();
	console.log(responseJson);
	const { access_token, refresh_token } = responseJson;

	airtableAccessToken = access_token;
	localStorage.setItem(airtableRefreshTokenKey, refresh_token);
	console.log("Set refresh token to:", refresh_token);
}

// DONE
export async function airtableFetch(url: string, body?: object) {
	const response = await fetch(`https://api.airtable.com/v0/${url}${objectToUrlParams(body)}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${airtableAccessToken}`,
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

	for (const property of table.fields) {
		if (slugFieldTypes.includes(property.type)) {
			options.push(property);
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

			if (resp.status === 200) {
				const tokenInfo = await resp.json();

				if (tokenInfo) {
					const { access_token, refresh_token } = tokenInfo;

					clearInterval(interval);
					airtableAccessToken = access_token;
					localStorage.setItem(airtableRefreshTokenKey, refresh_token);
					console.log("Set refresh token to:", refresh_token);
				}

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
export function getCollectionFieldForProperty(
	property: object,
	name: string,
	type: string
): CollectionField | null {
	if (type == "enum") {
		return {
			type,
			id: property.id,
			name,
			cases: property.options.choices.map((option) => ({
				id: option.id,
				name: option.name,
			})),
		};
	}

	return {
		type,
		id: property.id,
		name,
	};
}

// DONE
export function getPropertyValue(
	property: object,
	value: any,
	fieldType: string
): unknown | undefined {
	if (property === null || property === undefined || value === null || value === undefined) {
		return null;
	}

	switch (property.type) {
		case "createdTime":
		case "currency":
		case "date":
		case "dateTime":
		case "email":
		case "autoNumber":
		case "count":
		case "checkbox":
		case "lastModifiedTime":
		case "number":
		case "percent":
		case "phoneNumber":
		case "rating":
		case "rollup":
		case "singleLineText":
		case "multilineText":
		case "url":
			return value;
		case "richText":
			return fieldType === "formattedText" ? richTextToHTML(value) : richTextToPlainText(value);
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
			const isArray = Array.isArray(value);

			switch (fieldType) {
				case "string":
				case "link":
				case "image":
				case "date":
					return isArray ? value.join(", ") : String(value);
				case "number":
					return isArray ? value.join(", ") : Number(value);
				case "boolean":
					return isArray ? value.map((a) => (a ? "Yes" : "No")).join(", ") : value ? "Yes" : "No";
				default:
					return null;
			}
		case "multipleLookupValues":
			return value.map((item) => String(item)).join(", ");
		case "multipleCollaborators":
		case "multipleSelects":
			return value.map((item) => item.name).join(", ");
		case "singleSelect":
		case "externalSyncSource":
			return value.name;
		case "duration":
			const hours = Math.floor(value / 3600);
			const minutes = Math.floor((value % 3600) / 60);
			const remainingSeconds = value % 60;
			const seconds = Math.floor(remainingSeconds).toString().padStart(2, "0");

			let result = "";
			result += hours.toString();
			result += ":" + minutes.toString().padStart(2, "0");

			// Handle seconds and milliseconds based on format
			switch (property.options?.durationFormat) {
				case "h:mm":
					break;
				case "h:mm:ss":
					result += ":" + seconds;
					break;
				case "h:mm:ss.S":
					result += ":" + seconds;
					result += "." + (remainingSeconds % 1).toFixed(1).substring(2);
					break;
				case "h:mm:ss.SS":
					result += ":" + seconds;
					result += "." + (remainingSeconds % 1).toFixed(2).substring(2);
					break;
				case "h:mm:ss.SSS":
					result += ":" + seconds;
					result += "." + (remainingSeconds % 1).toFixed(3).substring(2);
					break;
			}

			return result;
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

async function processItem(
	item: object,
	tableSchema: object,
	fieldsById: FieldsById,
	slugFieldId: string,
	status: SyncStatus,
	unsyncedItemIds: Set<string>,
	lastSyncedTime: string | null
): Promise<CollectionItem | null> {
	let slugValue: null | string = null;

	const properties = {};
	for (const field of tableSchema.fields) {
		properties[field.id] = field;
	}

	const fieldData: Record<string, unknown> = {};

	// Mark the item as seen
	unsyncedItemIds.delete(item.id);

	// TODO: Airtable records do not have last edited time, so find a workaround.

	// if (isUnchangedSinceLastSync(item.last_edited_time, lastSyncedTime)) {
	// 	status.info.push({
	// 		message: `Skipping. last updated: ${formatDate(item.last_edited_time)}, last synced: ${formatDate(lastSyncedTime!)}`,
	// 		url: item.url,
	// 	});
	// 	return null;
	// }

	for (const fieldId in item.fields) {
		const value = item.fields[fieldId];
		const property = properties[fieldId];

		if (fieldId === slugFieldId) {
			const resolvedSlug = getPropertyValue(property, value, "string");
			if (!resolvedSlug || typeof resolvedSlug !== "string") {
				continue;
			}
			slugValue = slugify(resolvedSlug);
		}

		const field = fieldsById.get(fieldId);

		// We can continue if the property was not included in the field mapping
		if (!field) {
			continue;
		}

		const fieldValue = getPropertyValue(property, value, field.type);
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

	if (!slugValue) {
		status.warnings.push({
			url: item.url,
			message: "Slug is missing. Skipping item.",
		});
		return null;
	}

	return {
		id: item.id,
		fieldData,
		slug: slugValue,
	};
}

type FieldsById = Map<string, CollectionField>;

// Function to process all items concurrently with a limit
async function processAllItems(
	data: object[],
	tableSchema: object,
	fieldsById: FieldsById,
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
		limit(() =>
			processItem(
				item,
				tableSchema,
				fieldsById,
				slugFieldId,
				status,
				unsyncedItemIds,
				lastSyncedDate
			)
		)
	);
	const results = await Promise.all(promises);

	const collectionItems = results.filter(isDefined);

	return {
		collectionItems,
		status,
	};
}

export async function synchronizeDatabase(
	base: object,
	table: object,
	{ fields, ignoredFieldIds, lastSyncedTime, slugFieldId }: SynchronizeMutationOptions
): Promise<SynchronizeResult> {
	if (!base || !table) {
		return {
			status: "error",
			errors: [],
			info: [],
			warnings: [],
		};
	}

	const collection = await framer.getManagedCollection();
	await collection.setFields(fields);

	const fieldsById = new Map<string, CollectionField>();
	for (const field of fields) {
		fieldsById.set(field.id, field);
	}

	const unsyncedItemIds = new Set(await collection.getItemIds());

	const data = await airtableFetch(`${base.id}/${table.id}`, {
		cellFormat: "json",
		returnFieldsByFieldId: true,
	});

	console.log(`${base.id}/${table.id}`);

	const { collectionItems, status } = await processAllItems(
		data.records,
		table,
		fieldsById,
		slugFieldId,
		unsyncedItemIds,
		lastSyncedTime
	);

	console.log("Submitting database");
	console.table(collectionItems);

	try {
		await collection.addItems(collectionItems);

		const itemsToDelete = Array.from(unsyncedItemIds);
		await collection.removeItems(itemsToDelete);

		await Promise.all([
			collection.setPluginData(ignoredFieldIdsKey, JSON.stringify(ignoredFieldIds)),
			collection.setPluginData(pluginBaseIdKey, base.id),
			collection.setPluginData(pluginTableIdKey, table.id),
			collection.setPluginData(pluginLastSyncedKey, new Date().toISOString()),
			collection.setPluginData(pluginSlugIdKey, slugFieldId),
			collection.setPluginData(baseNameKey, base.name),
		]);

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
	integrationContext: object,
	{
		onSuccess,
		onError,
	}: { onSuccess?: (result: SynchronizeResult) => void; onError?: (error: Error) => void } = {}
) {
	return useMutation({
		onError(error) {
			console.error("Synchronization failed", error);

			onError?.(error);
		},
		onSuccess,
		mutationFn: async (options: SynchronizeMutationOptions): Promise<SynchronizeResult> => {
			const { base, table } = integrationContext;
			return synchronizeDatabase(base, table, options);
		},
	});
}

// DONE
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
	const properties: object[] = [];

	for (const property of table.fields) {
		// These fields were ignored by the user
		if (ignoredFieldIds.includes(property.id)) continue;

		const field = getCollectionFieldForProperty(property);
		if (field) {
			properties.push(field);
		}
	}

	return properties;
}

export async function getPluginContext(): Promise<PluginContext> {
	const collection = await framer.getManagedCollection();
	const collectionFields = await collection.getFields();
	const baseId = await collection.getPluginData(pluginBaseIdKey);
	const tableId = await collection.getPluginData(pluginTableIdKey);
	const hasAuthToken = isAuthenticated();

	if (!baseId || !tableId || !hasAuthToken) {
		return {
			type: "new",
			collection,
			isAuthenticated: hasAuthToken,
		};
	}

	try {
		// assert(notion, "Notion client is not initialized");
		// const database = await notion.databases.retrieve({ database_id: databaseId });

		const baseSchema = await airtableFetch(`meta/bases/${baseId}/tables`);
		console.log(baseSchema);

		const table = baseSchema.tables.find((t) => t.id === tableId);
		console.log(table);

		const [rawIgnoredFieldIds, lastSyncedTime, slugFieldId] = await Promise.all([
			collection.getPluginData(ignoredFieldIdsKey),
			collection.getPluginData(pluginLastSyncedKey),
			collection.getPluginData(pluginSlugIdKey),
		]);

		const ignoredFieldIds = getIgnoredFieldIds(rawIgnoredFieldIds);

		assert(lastSyncedTime, "Expected last synced time to be set");

		return {
			type: "update",
			base: {
				id: baseId,
				name: "Base Name", // TODO: Get base name
			},
			table,
			collection,
			collectionFields,
			ignoredFieldIds,
			lastSyncedTime,
			slugFieldId,
			// hasChangedFields: hasFieldConfigurationChanged(collectionFields, database, ignoredFieldIds),
			isAuthenticated: hasAuthToken,
		};
	} catch (error) {
		const databaseName = (await collection.getPluginData(baseNameKey)) ?? "Unknown";

		return {
			type: "error",
			message: `The base "${databaseName}" was not found. Log in with Airtable and select the Base to sync.`,
			isAuthenticated: false,
		};

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

function objectToUrlParams(obj) {
	if (!obj || !Object.keys(obj).length) {
		return "";
	}

	return `?${Object.keys(obj)
		.map((key) => {
			if (obj[key] === null || obj[key] === undefined) {
				return encodeURIComponent(key);
			}
			return `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`;
		})
		.join("&")}`;
}
