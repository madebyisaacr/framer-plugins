import { framer, CollectionItem } from "framer-plugin";
import { createObject } from "../utils";
import { PluginContext } from "./PluginContext";

export const PluginDataKey = createObject([
	"integrationId",
	"integrationData",
	"ignoredFieldIds",
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

				delete item.fieldData[field.id];
				for (let i = 0; i < fieldCount; i++) {
					item.fieldData[`${field.id}-${i}`] =
						field.type == "enum" ? value[i] || noneOptionID : value[i];
				}
			}
		}
	}

	let fields = collectionFields;

	if (arrayFieldIDs.size > 0) {
		fields = [];
		for (const field of collectionFields) {
			if (arrayFieldIDs.has(field.id)) {
				for (let i = 0; i < arrayFieldLengths[field.id]; i++) {
					fields.push({
						...field,
						id: `${field.id}-${i}`,
						name: `${field.name} ${i + 1}`,
					});
				}
			} else {
				fields.push(field);
			}
		}
	}

	console.log(arrayFieldIDs, arrayFieldLengths, fields, collectionItems);

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
	const { collectionFields, integrationId, ignoredFieldIds, slugFieldId, fieldSettings } =
		pluginContext;

	const collection = await framer.getManagedCollection();

	if (shouldSetFields) {
		await collection.setFields(collectionFields);
	}

	await Promise.all([
		collection.setPluginData(PluginDataKey.integrationId, integrationId),
		collection.setPluginData(PluginDataKey.ignoredFieldIds, JSON.stringify(ignoredFieldIds)),
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
