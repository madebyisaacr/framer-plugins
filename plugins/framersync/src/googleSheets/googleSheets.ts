import pLimit from "p-limit";
import { assert, formatDate, isDefined, isString, slugify } from "../utils";
import { CollectionField, CollectionItem, framer } from "framer-plugin";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PluginContext } from "../general/PluginContext";
import { updateCollection } from "../general/updateCollection";

export type FieldId = string;

const apiBaseUrl =
	window.location.hostname === "localhost"
		? "http://localhost:8787/google-sheets"
		: "https://framersync-workers.isaac-b49.workers.dev/google-sheets";

const LOCAL = "local";
const PROXY = "proxy";

let googleSheetsAccessToken: string | null = null;

// Storage for the Google Sheets API key.
const googleSheetsRefreshTokenKey = "googleSheetsRefreshToken";

const propertyConversionTypes = {
	BOOLEAN: ["boolean"],
	TEXT: ["string"],
	NUMBER: ["number"],
	DATE: ["date"],
	TIME: ["date"],
	DATETIME: ["date"],
	FORMULA: ["string", "number", "boolean", "date"],
	IMAGE: ["image"],
	HYPERLINK: ["link", "string"],
};

// Maximum number of concurrent requests to Google Sheets API
// This is to prevent rate limiting.
const concurrencyLimit = 5;

export type GoogleSheetsColumn = {
	columnIndex: number;
	effectiveFormat?: {
		numberFormat?: {
			type: string;
		};
	};
	effectiveValue?: {
		boolValue?: boolean;
		numberValue?: number;
		stringValue?: string;
	};
	formattedValue?: string;
};

const googleSheetsApiBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";

export async function googleAPIFetch(url: string, method: string, route: string, body?: object) {
	const response = await fetch(
		route == PROXY ? `${apiBaseUrl}/api/?url=${encodeURIComponent(url)}` : url,
		{
			method,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${googleSheetsAccessToken}`,
			},
			body: JSON.stringify(body),
		}
	);
	// const data = await response.json();
	return response;
}

export async function getIntegrationContext(integrationData: object, sheetName: string) {
	const { spreadsheetId, sheetId } = integrationData;

	if (!spreadsheetId || !sheetId) {
		return null;
	}

	try {
		if (!googleSheetsAccessToken) throw new Error("Google Sheets API token is missing");

		const response = await googleAPIFetch(
			`${googleSheetsApiBaseUrl}/${spreadsheetId}?ranges=${sheetId}&includeGridData=true`,
			"GET",
			LOCAL
		);

		if (!response.ok) {
			if (response.status === 404) {
				return Error(
					`The sheet "${sheetName}" was not found. Log in with Google and select the Sheet to sync.`
				);
			}
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return {
			sheet: data.sheets[0],
		};
	} catch (error) {
		throw error;
	}
}

// Naive implementation to be authenticated, a token could be expired.
// For simplicity we just close the plugin and clear storage in that case.
export function isAuthenticated() {
	return localStorage.getItem(googleSheetsRefreshTokenKey) !== null;
}

// TODO: Check if refresh token is expired
export async function refreshGoogleSheetsToken() {
	// Do not refresh if we already have an access token
	if (googleSheetsAccessToken) {
		return true;
	}

	try {
		const refreshToken = localStorage.getItem(googleSheetsRefreshTokenKey);

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

		googleSheetsAccessToken = access_token;
		localStorage.setItem(googleSheetsRefreshTokenKey, refresh_token);
		return true;
	} catch (error) {
		localStorage.removeItem(googleSheetsRefreshTokenKey);
		console.error("Failed to refresh Google Sheets token", error);
		return false;
	}
}

// The order in which we display slug fields
const slugFieldTypes = ["TEXT", "NUMBER", "FORMULA"];

/**
 * Given a Google Sheets worksheet returns a list of possible fields that can be used as
 * a slug. And a suggested field id to use as a slug.
 */
export function getPossibleSlugFields(integrationContext: object) {
	const { sheet } = integrationContext;
	console.log("integrationContext", integrationContext);
	assert(sheet && sheet.data && sheet.data[0].rowData);

	const headerRow = sheet.data[0].rowData[0].values;
	const options: GoogleSheetsColumn[] = [];

	headerRow.forEach((cell, index) => {
		if (slugFieldTypes.includes(cell.effectiveFormat?.numberFormat?.type || "TEXT")) {
			options.push({ ...cell, columnIndex: index });
		}
	});

	function getOrderIndex(type: string): number {
		const index = slugFieldTypes.indexOf(type);
		return index === -1 ? slugFieldTypes.length : index;
	}

	options.sort(
		(a, b) =>
			getOrderIndex(a.effectiveFormat?.numberFormat?.type || "TEXT") -
			getOrderIndex(b.effectiveFormat?.numberFormat?.type || "TEXT")
	);

	return options;
}

// Authorize the plugin with Google Sheets.
export async function authorize() {
	const response = await fetch(`${apiBaseUrl}/authorize`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
	});

	const { readKey, url } = await response.json();

	console.log(url, readKey);

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
					console.log("tokenInfo", tokenInfo);
					const { access_token, refresh_token } = tokenInfo;

					clearInterval(interval);
					googleSheetsAccessToken = access_token;
					localStorage.setItem(googleSheetsRefreshTokenKey, refresh_token);
				}

				resolve();
			}
		}, 2500);
	});
}

/**
 * Given a Google Sheets column returns a CollectionField object
 * That maps the Google Sheets column to the Framer CMS collection property type
 */
export function getCollectionFieldForProperty(
	column: GoogleSheetsColumn,
	name: string,
	type: string
): CollectionField | null {
	return {
		type: type,
		id: column.columnIndex!.toString(),
		name,
	};
}

export function getCellValue(cell: GoogleSheetsColumn): unknown {
	if (cell.effectiveValue?.boolValue !== undefined) {
		return cell.effectiveValue.boolValue;
	} else if (cell.effectiveValue?.numberValue !== undefined) {
		return cell.effectiveValue.numberValue;
	} else if (cell.effectiveValue?.stringValue !== undefined) {
		return cell.effectiveValue.stringValue;
	} else if (cell.formattedValue) {
		return cell.formattedValue;
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
	rowIndex: number;
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
	row: { values: GoogleSheetsColumn[] },
	rowIndex: number,
	fieldsById: FieldsById,
	slugFieldId: string,
	status: SyncStatus,
	unsyncedItemIds: Set<string>,
	lastSyncedTime: string | null
): Promise<CollectionItem | null> {
	let slugValue: null | string = null;

	const fieldData: Record<string, unknown> = {};

	// Mark the item as seen
	unsyncedItemIds.delete(rowIndex.toString());

	if (isUnchangedSinceLastSync(row.values[0].formattedValue!, lastSyncedTime)) {
		status.info.push({
			message: `Skipping. last updated: ${formatDate(
				row.values[0].formattedValue!
			)}, last synced: ${formatDate(lastSyncedTime!)}`,
			rowIndex,
		});
		return null;
	}

	row.values.forEach((cell, index) => {
		if (index.toString() === slugFieldId) {
			const resolvedSlug = getCellValue(cell);
			if (!resolvedSlug || typeof resolvedSlug !== "string") {
				return;
			}
			slugValue = slugify(resolvedSlug);
		}

		const field = fieldsById.get(index.toString());

		// We can continue if the column was not included in the field mapping
		if (!field) {
			return;
		}

		const fieldValue = getCellValue(cell);
		if (fieldValue === null || fieldValue === undefined) {
			status.warnings.push({
				rowIndex,
				fieldId: field.id,
				message: `Value is missing for field ${field.name}`,
			});
			return;
		}

		fieldData[field.id] = fieldValue;
	});

	if (!slugValue) {
		status.warnings.push({
			rowIndex,
			message: "Slug property is missing. Skipping item.",
		});
		return null;
	}

	return {
		id: rowIndex.toString(),
		fieldData,
		slug: slugValue,
	};
}

type FieldsById = Map<FieldId, CollectionField>;

// Function to process all items concurrently with a limit
async function processAllItems(
	data: { values: GoogleSheetsColumn[] }[],
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
	const promises = data.map((row, index) =>
		limit(() =>
			processItem(row, index, fieldsByKey, slugFieldId, status, unsyncedItemIds, lastSyncedDate)
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
	const { integrationContext, collectionFields, ignoredFieldIds, lastSyncedTime, slugFieldId } =
		pluginContext;
	const { sheet } = integrationContext;

	assert(sheet && sheet.data && sheet.data[0].rowData);

	const collection = await framer.getManagedCollection();

	const fieldsById = new Map<string, CollectionField>();
	for (const field of collectionFields) {
		fieldsById.set(field.id, field);
	}

	const unsyncedItemIds = new Set(await collection.getItemIds());

	const data = sheet.data[0].rowData!.slice(1); // Skip header row

	const { collectionItems, status } = await processAllItems(
		data,
		fieldsById,
		slugFieldId,
		unsyncedItemIds,
		lastSyncedTime
	);

	console.log("Submitting sheet");
	console.table(collectionItems);

	try {
		const itemsToDelete = Array.from(unsyncedItemIds);
		const sheetName = sheet.properties!.title!;
		await updateCollection(
			pluginContext,
			collectionItems,
			itemsToDelete,
			{ spreadsheetId: sheet.properties!.sheetId },
			sheetName
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

export function useSpreadsheetsQuery() {
	return useQuery({
		queryKey: ["spreadsheets"],
		queryFn: async () => {
			if (!googleSheetsAccessToken) throw new Error("Google Sheets API token is missing");

			try {
				const response = await fetch(
					"https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27",
					{
						headers: {
							Authorization: `Bearer ${googleSheetsAccessToken}`,
						},
					}
				);

				if (response.status === 403) {
					// TODO: Refresh the token instead of throwing an error
					console.error("403 Forbidden error. Token may be invalid or expired.");
					throw new Error("Authorization failed. Please log in again.");
				}

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				return data.files || [];
			} catch (error) {
				console.error("Error fetching spreadsheets:", error);
				throw error;
			}
		},
		retry: false, // Disable automatic retries on failure
		onError: (error) => {
			console.error("Query error:", error);
			// You can add additional error handling here if needed
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

function getSuggestedFieldsForSheet(
	sheet: { data: { rowData: { values: GoogleSheetsColumn[] }[] } },
	ignoredFieldIds: FieldId[]
) {
	const fields: object[] = [];

	assert(sheet.data && sheet.data[0].rowData);
	const headerRow = sheet.data[0].rowData[0].values;

	headerRow.forEach((cell, index) => {
		if (ignoredFieldIds.includes(index.toString())) return;

		const field = getCollectionFieldForProperty(
			cell,
			cell.formattedValue || `Column ${index + 1}`,
			propertyConversionTypes[cell.effectiveFormat?.numberFormat?.type || "TEXT"][0]
		);

		if (field) {
			fields.push(field);
		}
	});

	return fields;
}

export function hasFieldConfigurationChanged(
	currentConfig: CollectionField[],
	integrationContext: object,
	ignoredFieldIds: string[]
): boolean {
	const { sheet } = integrationContext;
	assert(sheet && sheet.data && sheet.data[0].rowData);

	const fields = currentConfig;

	const currentFieldsById = new Map<string, CollectionField>();
	for (const field of fields) {
		currentFieldsById.set(field.id, field);
	}

	const headerRow = sheet.data[0].rowData[0].values;
	const properties = headerRow.filter((_, index) => !ignoredFieldIds.includes(index.toString()));

	if (properties.length !== fields.length) return true;

	const includedProperties = properties.filter((_, index) =>
		currentFieldsById.has(index.toString())
	);

	for (let i = 0; i < includedProperties.length; i++) {
		const property = includedProperties[i];
		const currentField = currentFieldsById.get(i.toString());
		if (!currentField) return true;

		const propertyType = property.effectiveFormat?.numberFormat?.type || "TEXT";
		if (!propertyConversionTypes[propertyType].includes(currentField.type)) return true;
	}

	return false;
}

export function isUnchangedSinceLastSync(
	lastEditedTime: string,
	lastSyncedTime: string | null
): boolean {
	if (!lastSyncedTime) return false;

	const lastEdited = new Date(lastEditedTime);
	const lastSynced = new Date(lastSyncedTime);
	// Last edited time is rounded to the nearest minute.
	// So we should round lastSyncedTime to the nearest minute as well.
	lastSynced.setSeconds(0, 0);

	return lastSynced > lastEdited;
}

export function getFieldConversionTypes(column: GoogleSheetsColumn) {
	return propertyConversionTypes[column.effectiveFormat?.numberFormat?.type || "TEXT"] || [];
}

export async function getSheetData(spreadsheetId: string, sheetName: string) {
	if (!googleSheetsAccessToken) throw new Error("Google Sheets API token is missing");

	const response = await googleAPIFetch(
		`${googleSheetsApiBaseUrl}/${spreadsheetId}/values/${sheetName}`,
		"GET",
		LOCAL
	);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = await response.json();
	return data.values;
}

export function parseSheetData(data: any[][]): CollectionItem[] {
	const headers = data[0];
	return data.slice(1).map((row, index) => {
		const fieldData: Record<string, unknown> = {};
		headers.forEach((header, i) => {
			fieldData[header] = row[i];
		});
		return {
			id: (index + 1).toString(),
			fieldData,
			slug: slugify(row[0] || `Row ${index + 1}`),
		};
	});
}

export async function updateSheetData(spreadsheetId: string, sheetName: string, data: any[][]) {
	if (!googleSheetsAccessToken) throw new Error("Google Sheets API token is missing");

	const response = await googleAPIFetch(
		`${googleSheetsApiBaseUrl}/${spreadsheetId}/values/${sheetName}?valueInputOption=USER_ENTERED`,
		"PUT",
		LOCAL,
		{ values: data }
	);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
}

export function convertFramerItemToSheetRow(item: CollectionItem, headers: string[]): any[] {
	return headers.map((header) => item.fieldData[header] || "");
}

export async function syncFramerToSheet(pluginContext: PluginContext) {
	const { integrationContext } = pluginContext;
	const { sheet } = integrationContext;
	assert(sheet && sheet.properties);

	const spreadsheetId = sheet.properties.sheetId!.toString();
	const sheetName = sheet.properties.title!;

	const collection = await framer.getManagedCollection();
	const items = await collection.getItems();

	const sheetData = await getSheetData(spreadsheetId, sheetName);
	const headers = sheetData[0];

	const updatedData = [headers, ...items.map((item) => convertFramerItemToSheetRow(item, headers))];

	await updateSheetData(spreadsheetId, sheetName, updatedData);
}

export function getColumnLetter(index: number): string {
	let columnLetter = "";
	while (index >= 0) {
		columnLetter = String.fromCharCode(65 + (index % 26)) + columnLetter;
		index = Math.floor(index / 26) - 1;
	}
	return columnLetter;
}

export async function getSheetsList(spreadsheetId: string) {
	if (!googleSheetsAccessToken) throw new Error("Google Sheets API token is missing");

	try {
		const response = await googleAPIFetch(
			`${googleSheetsApiBaseUrl}/${spreadsheetId}?fields=sheets.properties.title`,
			"GET",
			LOCAL
		);

		if (!response.ok) {
			console.log(response)
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return data.sheets;
	} catch (error) {
		console.error("Error fetching sheets list:", error);
		throw error;
	}
}

export async function getFullSheet(spreadsheetId: string, sheetId: string) {
	const sheet = await googleAPIFetch(
		`${googleSheetsApiBaseUrl}/${spreadsheetId}/sheets/${sheetId}?fields=properties,data`,
		"GET",
		PROXY
	).then((response) => {
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const doit = async () => {
			const data = await response.text();
			console.log(data)
		}

		doit()
		return []
		// return response.json();
	});

	if (!sheet) {
		throw new Error("Failed to fetch sheet data");
	}

	return sheet;
}
