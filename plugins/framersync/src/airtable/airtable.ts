import pLimit from "p-limit";
import { isDefined, isString, slugify } from "../utils";
import { CollectionField, CollectionItem, framer } from "framer-plugin";
import { useMutation } from "@tanstack/react-query";
import { richTextToPlainText, richTextToHTML } from "./richText";
import { PluginContext } from "../general/PluginContext";
import {
	updateCollection,
	updateCollectionPluginData,
	getFieldsById,
} from "../general/updateCollection";
import { FieldSettings } from "../general/FieldSettings";

type FieldId = string;

const apiBaseUrl =
	window.location.hostname === "localhost"
		? "http://localhost:8787/airtable"
		: "https://framersync-workers.isaac-b49.workers.dev/airtable";

let airtableAccessToken: string | null = null;

// Storage for the Airtable API key refresh token.
const airtableRefreshTokenKey = "airtableRefreshToken";

const noneOptionID = "##NONE##";

// Maximum number of concurrent requests to Airtable API
// This is to prevent rate limiting.
// TODO: Is this necessary with Airtable?
const concurrencyLimit = 5;

export const propertyConversionTypes: Record<string, string[]> = {
	aiText: ["string"],
	multipleAttachments: ["file", "image", "link"],
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
	formula: ["string", "number", "boolean", "date", "link", "image", "file"],
	lastModifiedBy: ["string"],
	lastModifiedTime: ["date"],
	multipleRecordLinks: [],
	multilineText: ["string"],
	multipleLookupValues: [],
	multipleCollaborators: ["string"],
	multipleSelects: ["enum", "string"],
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

// The order in which we display slug fields
const slugFieldTypes = ["singleLineText", "multilineText", "autoNumber", "aiText", "formula"];

export async function getIntegrationContext(integrationData: object, databaseName: string) {
	const { baseId, tableId } = integrationData;

	if (!baseId || !tableId) {
		return null;
	}

	try {
		const baseSchema = await airtableFetch(`meta/bases/${baseId}/tables`);
		const table = baseSchema.tables.find((t) => t.id === tableId);

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
		return true;
	}

	try {
		const refreshToken = localStorage.getItem(airtableRefreshTokenKey);

		if (!refreshToken) {
			return false;
		}

		const response = await fetch(`${apiBaseUrl}/refresh/?refresh_token=${refreshToken}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const responseJson = await response.json();
		const { access_token, refresh_token } = responseJson;

		airtableAccessToken = access_token;
		localStorage.setItem(airtableRefreshTokenKey, refresh_token);
		return true;
	} catch (error) {
		localStorage.removeItem(airtableRefreshTokenKey);
		console.error("Failed to refresh Airtable token", error);
		return false;
	}
}

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

/**
 * Given an Airtable base returns a list of possible fields that can be used as
 * a slug. And a suggested field id to use as a slug.
 */
export function getPossibleSlugFields(fieldConfigList: object[]) {
	const options: object[] = fieldConfigList.filter((fieldConfig) =>
		slugFieldTypes.includes(fieldConfig.property.type)
	);

	function getOrderIndex(type: string): number {
		const index = slugFieldTypes.indexOf(type);
		return index === -1 ? slugFieldTypes.length : index;
	}

	options.sort((a, b) => getOrderIndex(a.type) - getOrderIndex(b.type));

	return options;
}

// Authorize the plugin with Airtable.
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

	let intervalId;

	const promise = new Promise<void>((resolve) => {
		// Poll for the authorization status
		intervalId = setInterval(async () => {
			const resp = await fetch(`${apiBaseUrl}/poll/?readKey=${readKey}`, {
				method: "POST",
			});

			if (resp.status === 200) {
				const tokenInfo = await resp.json();

				if (tokenInfo) {
					const { access_token, refresh_token } = tokenInfo;

					clearInterval(intervalId);
					airtableAccessToken = access_token;
					localStorage.setItem(airtableRefreshTokenKey, refresh_token);
				}

				resolve();
			}
		}, 2500);
	});

	return { promise, cancel: () => clearInterval(intervalId) };
}

/**
 * Given an Airtable Base field object returns a CollectionField object
 * That maps the Airtable field to the Framer CMS collection property type
 */
export function getCollectionFieldForProperty(
	property: object,
	name: string,
	type: string,
	fieldSettings: Record<string, any>
): CollectionField | null {
	const fieldData = {};

	if (type == "enum") {
		fieldData.cases = [
			{
				id: noneOptionID,
				name: fieldSettings?.noneOption ?? "None",
			},
			...property.options.choices.map((option) => ({
				id: option.id,
				name: option.name,
			})),
		];
	} else if (type === "file") {
		fieldData.allowedFileTypes = []; // TODO: Make this automatic based on the file types in the database
	}

	return {
		type,
		id: property.id,
		name,
		...fieldData,
	};
}

export function getPropertyValue(
	property: object,
	value: any,
	fieldType: string,
	fieldSettings: Record<string, any>
): unknown | undefined {
	if (property === null || property === undefined || value === null || value === undefined) {
		return null;
	}

	fieldSettings = fieldSettings || {};

	const importArray = fieldSettings[FieldSettings.MultipleFields] !== false;

	switch (property.type) {
		case "currency":
		case "email":
		case "autoNumber":
		case "count":
		case "checkbox":
		case "number":
		case "percent":
		case "phoneNumber":
		case "rating":
		case "rollup":
		case "singleLineText":
		case "multilineText":
		case "url":
			return value;
		case "date":
		case "dateTime":
		case "createdTime":
		case "lastModifiedTime":
			return dateValue(value, fieldSettings);
		case "richText":
			return fieldType === "formattedText" ? richTextToHTML(value) : richTextToPlainText(value);
		case "aiText":
			return value.value;
		case "multipleAttachments":
			if (importArray) {
				return value.map((item) => item.url);
			} else {
				return value?.[0] ? value[0].url : null;
			}
		case "multipleRecordLinks":
			return null;
		case "barcode":
			return value.text || "";
		case "button":
			return value.url || null;
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
				case "file":
					return isArray ? (importArray ? value : String(value[0])) : String(value);
				case "number":
					return isArray ? (importArray ? value.map(Number) : Number(value[0])) : Number(value);
				case "date":
					return isArray
						? importArray
							? value.map((v) => dateValue(String(v), fieldSettings))
							: dateValue(String(value[0]), fieldSettings)
						: dateValue(String(value), fieldSettings);
				case "boolean":
					return isArray ? (importArray ? value.map(Boolean) : Boolean(value[0])) : Boolean(value);
				default:
					return null;
			}
		case "multipleLookupValues":
			return null;
		case "multipleCollaborators":
		case "multipleSelects":
			if (importArray) {
				return fieldType == "enum" ? value.map((item) => getSelectOptionId(item, property)) : value;
			} else {
				return value?.[0]
					? fieldType === "enum"
						? getSelectOptionId(value[0], property)
						: value[0]
					: null;
			}
		case "singleSelect":
			return fieldType === "enum" ? getSelectOptionId(value, property) : value;
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
	status: "success" | "completed_with_errors" | "error";
}

async function processItem(
	item: object,
	tableSchema: object,
	fieldsById: FieldsById,
	slugFieldId: string,
	status: SyncStatus,
	unsyncedItemIds: Set<string>,
	lastSyncedTime: string | null,
	fieldSettings: Record<string, any>
): Promise<CollectionItem | null> {
	let slugValue: null | string = null;

	const properties = {};
	for (const field of tableSchema.fields) {
		properties[field.id] = field;
	}

	const fieldData: Record<string, unknown> = {};

	// Mark the item as seen
	unsyncedItemIds.delete(item.id);

	for (const fieldId in item.fields) {
		const value = item.fields[fieldId];
		const property = properties[fieldId];

		if (fieldId === slugFieldId) {
			const resolvedSlug = getPropertyValue(property, value, "string", {});
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

		const fieldValue = getPropertyValue(property, value, field.type, fieldSettings[property.id]);
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
	lastSyncedDate: string | null,
	fieldSettings: Record<string, any>
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
				lastSyncedDate,
				fieldSettings
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
	pluginContext: PluginContext
): Promise<SynchronizeResult> {
	const {
		integrationContext,
		collectionFields,
		ignoredFieldIds,
		lastSyncedTime,
		slugFieldId,
		databaseName,
		fieldSettings,
	} = pluginContext;
	const { baseId, tableId, table } = integrationContext;

	if (!baseId || !table) {
		return {
			status: "error",
			errors: [],
			info: [],
			warnings: [],
		};
	}

	const collection = await framer.getManagedCollection();

	const fieldsById = new Map<string, CollectionField>();
	for (const field of collectionFields) {
		fieldsById.set(field.id, field);
	}

	const unsyncedItemIds = new Set(await collection.getItemIds());

	const data = await airtableFetch(`${baseId}/${table.id}`, {
		cellFormat: "json",
		returnFieldsByFieldId: true,
	});

	const { collectionItems, status } = await processAllItems(
		data.records,
		table,
		fieldsById,
		slugFieldId,
		unsyncedItemIds,
		lastSyncedTime,
		fieldSettings
	);

	console.log("Submitting database");
	console.table(
		collectionItems.map((item) => ({ ...item, fieldData: JSON.stringify(item.fieldData) }))
	);

	try {
		const itemsToDelete = Array.from(unsyncedItemIds);
		await updateCollection(
			pluginContext,
			collectionItems,
			itemsToDelete,
			getIntegrationData(pluginContext),
			databaseName
		);

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
	pluginContext: PluginContext,
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
		mutationFn: async (): Promise<SynchronizeResult> => {
			return synchronizeDatabase(pluginContext);
		},
	});
}

export async function updatePluginData(pluginContext: PluginContext) {
	const { databaseName } = pluginContext;
	const integrationData = getIntegrationData(pluginContext);
	await updateCollectionPluginData(pluginContext, integrationData, databaseName);
}

export function hasFieldConfigurationChanged(
	currentConfig: CollectionField[],
	integrationContext: object,
	ignoredFieldIds: string[]
): boolean {
	const { table } = integrationContext;

	const currentFieldsById = getFieldsById(currentConfig);
	const fields = Object.values(currentFieldsById);

	const properties = Object.values(table.fields).filter(
		(property) =>
			!ignoredFieldIds.includes(property.id) && propertyConversionTypes[property.type]?.length > 0
	);

	if (properties.length !== fields.length) {
		return true;
	}

	const includedProperties = properties.filter((property) =>
		currentFieldsById.hasOwnProperty(property.id)
	);

	for (const property of includedProperties) {
		const currentField = currentFieldsById[property.id];
		if (!currentField) return true;

		if (!propertyConversionTypes[property.type].includes(currentField.type)) return true;
	}

	return false;
}

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

function dateValue(value: string, fieldSettings: Record<string, any>) {
	return !fieldSettings.time ? value?.split("T")[0] : value;
}

function getIntegrationData(pluginContext: PluginContext) {
	const { integrationContext } = pluginContext;
	const { baseId, tableId } = integrationContext;
	return { baseId, tableId };
}

function getSelectOptionId(name: string, property: object) {
	if (!name) {
		return noneOptionID;
	}

	for (const option of property.options.choices) {
		if (option.name === name) {
			return option.id;
		}
	}

	return noneOptionID;
}
