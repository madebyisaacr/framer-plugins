import { framer, CollectionItem, CollectionField } from "framer-plugin";
import { createObject } from "../utils";
import { PluginContext } from "./PluginContext";

export const PluginDataKey = createObject([
	"integrationId",
	"integrationData",
	"disabledFieldIds",
	"lastSyncedTime",
	"slugFieldId",
	"databaseName",
	"fieldSettings",
]);

const noneOptionID = "##NONE##";

export async function updateCollection(
	pluginContext: PluginContext,
	collectionItems: CollectionItem[],
	itemsToDelete: string[],
	integrationData: object,
	databaseName: string | null
) {
	const { collectionFields } = pluginContext;
	const collection = await framer.getManagedCollection();

	// Generate dynamic fields (arrays and file types)
	const arrayFieldIDs = new Set<string>();
	const arrayFieldLengths = {};
	for (const item of collectionItems) {
		for (const field of collectionFields) {
			const value = item.fieldData[field.id];
			if (Array.isArray(value)) {
				arrayFieldIDs.add(field.id);
				const fieldCount = Math.min(Math.max(arrayFieldLengths[field.id] || 0, value.length), 10);
				arrayFieldLengths[field.id] = fieldCount;
			}
		}
	}

	const collectionFieldsById = getFieldsById(collectionFields);

	const replaceFieldIds = collectionFields.map((field) => field.id).filter((fieldId) => arrayFieldIDs.has(fieldId));

	for (const item of collectionItems) {
		const fieldData = item.fieldData;
		for (const fieldId of Object.keys(fieldData)) {
			if (fieldData[fieldId] === null || fieldData[fieldId] === undefined) {
				delete fieldData[fieldId];
				continue;
			}

			if (replaceFieldIds.includes(fieldId)) {
				const field = collectionFieldsById[fieldId];
				const arrayFieldLength = arrayFieldLengths[fieldId];
				const value = fieldData[fieldId];

				if (!value) {
					fieldData[fieldId] = field.type == "enum" ? noneOptionID : null;
				} else if (arrayFieldLength <= 1) {
					fieldData[fieldId] = field.type == "enum" ? value[0] || noneOptionID : value[0];
				} else {
					delete fieldData[fieldId];
					for (let i = 0; i < arrayFieldLength; i++) {
						const arrayValue = field.type == "enum" ? value[i] || noneOptionID : value[i];
						if (arrayValue !== null && arrayValue !== undefined) {
							fieldData[`${fieldId}-[[${i}]]`] = arrayValue;
						}
					}
				}
			}
		}
	}

	let fields = collectionFields;

	if (arrayFieldIDs.size > 0) {
		fields = [];
		for (const field of collectionFields) {
			let fieldToAdd = field;

			if (arrayFieldIDs.has(field.id) && arrayFieldLengths[field.id] > 1) {
				for (let i = 0; i < arrayFieldLengths[field.id]; i++) {
					fields.push({
						...fieldToAdd,
						id: `${field.id}-[[${i}]]`,
						name: `${field.name} ${i + 1}`,
					});
				}
			} else {
				fields.push(fieldToAdd);
			}
		}
	}

	await collection.setFields(fields);
	await updateCollectionPluginData(pluginContext, integrationData, databaseName, false);

	await collection.addItems(collectionItems);
	if (itemsToDelete.length > 0) {
		await collection.removeItems(itemsToDelete);
	}

	collection.setPluginData(PluginDataKey.lastSyncedTime, new Date().toISOString());
}

export async function updateCollectionPluginData(
	pluginContext: PluginContext,
	integrationData: object,
	databaseName: string | null,
	shouldSetFields: boolean = true
) {
	const { collectionFields, integrationId, disabledFieldIds, slugFieldId, fieldSettings } =
		pluginContext;

	const collection = await framer.getManagedCollection();

	if (shouldSetFields) {
		await collection.setFields(collectionFields);
	}

	await Promise.all([
		collection.setPluginData(PluginDataKey.integrationId, integrationId),
		collection.setPluginData(PluginDataKey.disabledFieldIds, JSON.stringify(disabledFieldIds)),
		collection.setPluginData(PluginDataKey.integrationData, JSON.stringify(integrationData)),
		collection.setPluginData(PluginDataKey.slugFieldId, slugFieldId),
		collection.setPluginData(
			PluginDataKey.databaseName,
			databaseName || pluginContext.databaseName || null
		),
		collection.setPluginData(
			PluginDataKey.fieldSettings,
			fieldSettings ? JSON.stringify(fieldSettings) : null
		),
	]);
}

export function getFieldsById(collectionFields: CollectionField[]) {
	const currentFieldsById: Record<string, CollectionField> = {};
	for (const field of collectionFields) {
		if (isArrayField(field.id)) {
			const id = getArrayFieldId(field.id);
			currentFieldsById[id] = { ...field, id, name: getBeforeLastSpace(field.name) };
		} else {
			currentFieldsById[field.id] = field;
		}
	}

	return currentFieldsById;
}

const arrayFieldPattern = /-\[\[\d+\]\]$/;

function isArrayField(fieldId: string) {
	return arrayFieldPattern.test(fieldId);
}

function getArrayFieldId(fieldId: string) {
	const lastIndex = fieldId.lastIndexOf("-[[");

	if (lastIndex === -1) {
		// If '-[[' is not found, return the original string
		return fieldId;
	}

	// Return the substring from the beginning to the last occurrence of '-[['
	return fieldId.substring(0, lastIndex);
}

function getBeforeLastSpace(str) {
	// Find the index of the last space
	const lastSpaceIndex = str.lastIndexOf(" ");

	// If there's no space, return the original string
	if (lastSpaceIndex === -1) {
		return str;
	}

	// Return the substring from the beginning to the last space
	return str.substring(0, lastSpaceIndex);
}
