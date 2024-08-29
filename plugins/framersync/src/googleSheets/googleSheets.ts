import { google, sheets_v4 } from "googleapis";
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

// Storage for the Google Sheets API key.
const googleSheetsTokenStorageKey = "googleSheetsToken";

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

export type GoogleSheetsColumn = sheets_v4.Schema$CellData;

export async function getIntegrationContext(integrationData: object, sheetName: string) {
	const { spreadsheetId } = integrationData;

	if (!spreadsheetId) {
		return null;
	}

	try {
		assert(sheets, "Google Sheets client is not initialized");
		const response = await sheets.spreadsheets.get({
			spreadsheetId: spreadsheetId,
			ranges: [sheetName],
			includeGridData: true,
		});

		return {
			sheet: response.data.sheets?.[0],
		};
	} catch (error) {
		if (error.code === 404) {
			return Error(
				`The sheet "${sheetName}" was not found. Log in with Google and select the Sheet to sync.`
			);
		}

		throw error;
	}
}

// Naive implementation to be authenticated, a token could be expired.
// For simplicity we just close the plugin and clear storage in that case.
export function isAuthenticated() {
	return localStorage.getItem(googleSheetsTokenStorageKey) !== null;
}

let sheets: sheets_v4.Sheets | null = null;
if (isAuthenticated()) {
	initGoogleSheetsClient();
}

export function initGoogleSheetsClient() {
	const token = localStorage.getItem(googleSheetsTokenStorageKey);
	if (!token) throw new Error("Google Sheets API token is missing");

	const auth = new google.auth.OAuth2();
	auth.setCredentials({ access_token: token });

	sheets = google.sheets({ version: "v4", auth });
}

// The order in which we display slug fields
const slugFieldTypes = ["TEXT", "NUMBER", "FORMULA"];

/**
 * Given a Google Sheets worksheet returns a list of possible fields that can be used as
 * a slug. And a suggested field id to use as a slug.
 */
export function getPossibleSlugFields(integrationContext: object) {
	const { sheet } = integrationContext;
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
					const { access_token } = tokenInfo;

					clearInterval(interval);
					localStorage.setItem(googleSheetsTokenStorageKey, access_token);
					initGoogleSheetsClient();
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

export function getCellValue(cell: sheets_v4.Schema$CellData): unknown {
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
	row: sheets_v4.Schema$RowData,
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

	if (isUnchangedSinceLastSync(row.values![0].formattedValue!, lastSyncedTime)) {
		status.info.push({
			message: `Skipping. last updated: ${formatDate(
				row.values![0].formattedValue!
			)}, last synced: ${formatDate(lastSyncedTime!)}`,
			rowIndex,
		});
		return null;
	}

	row.values!.forEach((cell, index) => {
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
	data: sheets_v4.Schema$RowData[],
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

export async function synchronizeSheet(pluginContext: PluginContext): Promise<SynchronizeResult> {
	const { integrationContext, collectionFields, ignoredFieldIds, lastSyncedTime, slugFieldId } =
		pluginContext;
	const { sheet } = integrationContext;

	assert(sheet && sheet.data && sheet.data[0].rowData);
	assert(sheets);

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

export function useSynchronizeSheetMutation(
	pluginContext: object,
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
			return synchronizeSheet(pluginContext);
		},
	});
}

export function useSpreadsheetsQuery() {
	assert(sheets);
	return useQuery({
		queryKey: ["spreadsheets"],
		queryFn: async () => {
			assert(sheets);
			const response = await sheets.spreadsheets.list();
			return response.data.files || [];
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

function getSuggestedFieldsForSheet(sheet: sheets_v4.Schema$Sheet, ignoredFieldIds: FieldId[]) {
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
	assert(sheets);
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: sheetName,
	});
	return response.data.values;
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
	assert(sheets);
	await sheets.spreadsheets.values.update({
		spreadsheetId,
		range: sheetName,
		valueInputOption: "USER_ENTERED",
		requestBody: {
			values: data,
		},
	});
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

export function useSyncFramerToSheetMutation(pluginContext: PluginContext) {
	return useMutation({
		mutationFn: () => syncFramerToSheet(pluginContext),
	});
}

export async function getSheetMetadata(spreadsheetId: string) {
	assert(sheets);
	const response = await sheets.spreadsheets.get({ spreadsheetId });
	return response.data;
}

export function useSheetMetadataQuery(spreadsheetId: string) {
	return useQuery({
		queryKey: ["sheetMetadata", spreadsheetId],
		queryFn: () => getSheetMetadata(spreadsheetId),
	});
}

export function getColumnLetter(index: number): string {
	let columnLetter = "";
	while (index >= 0) {
		columnLetter = String.fromCharCode(65 + (index % 26)) + columnLetter;
		index = Math.floor(index / 26) - 1;
	}
	return columnLetter;
}

export async function resizeSheet(
	spreadsheetId: string,
	sheetId: number,
	rowCount: number,
	columnCount: number
) {
	assert(sheets);
	await sheets.spreadsheets.batchUpdate({
		spreadsheetId,
		requestBody: {
			requests: [
				{
					updateSheetProperties: {
						properties: {
							sheetId,
							gridProperties: {
								rowCount,
								columnCount,
							},
						},
						fields: "gridProperties(rowCount,columnCount)",
					},
				},
			],
		},
	});
}

export function useResizeSheetMutation() {
	return useMutation({
		mutationFn: ({
			spreadsheetId,
			sheetId,
			rowCount,
			columnCount,
		}: {
			spreadsheetId: string;
			sheetId: number;
			rowCount: number;
			columnCount: number;
		}) => resizeSheet(spreadsheetId, sheetId, rowCount, columnCount),
	});
}

export async function clearSheet(spreadsheetId: string, sheetName: string) {
	assert(sheets);
	await sheets.spreadsheets.values.clear({
		spreadsheetId,
		range: sheetName,
	});
}

export function useClearSheetMutation() {
	return useMutation({
		mutationFn: ({ spreadsheetId, sheetName }: { spreadsheetId: string; sheetName: string }) =>
			clearSheet(spreadsheetId, sheetName),
	});
}

export async function addSheet(spreadsheetId: string, sheetTitle: string) {
	assert(sheets);
	await sheets.spreadsheets.batchUpdate({
		spreadsheetId,
		requestBody: {
			requests: [
				{
					addSheet: {
						properties: {
							title: sheetTitle,
						},
					},
				},
			],
		},
	});
}

export function useAddSheetMutation() {
	return useMutation({
		mutationFn: ({ spreadsheetId, sheetTitle }: { spreadsheetId: string; sheetTitle: string }) =>
			addSheet(spreadsheetId, sheetTitle),
	});
}

export async function deleteSheet(spreadsheetId: string, sheetId: number) {
	assert(sheets);
	await sheets.spreadsheets.batchUpdate({
		spreadsheetId,
		requestBody: {
			requests: [
				{
					deleteSheet: {
						sheetId,
					},
				},
			],
		},
	});
}

export function useDeleteSheetMutation() {
	return useMutation({
		mutationFn: ({ spreadsheetId, sheetId }: { spreadsheetId: string; sheetId: number }) =>
			deleteSheet(spreadsheetId, sheetId),
	});
}
