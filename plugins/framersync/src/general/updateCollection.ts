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

export async function updateCollection(
	pluginContext: PluginContext,
	collectionItems: CollectionItem[],
	itemsToDelete: string[],
	integrationData: object,
	databaseName: string | null
) {
	const collection = await framer.getManagedCollection();

	await updateCollectionPluginData(pluginContext, integrationData, databaseName);

	await collection.addItems(collectionItems);
	if (itemsToDelete.length > 0) {
		await collection.removeItems(itemsToDelete);
	}
}

export async function updateCollectionPluginData(
	pluginContext: PluginContext,
	integrationData: object,
	databaseName: string | null
) {
	const { collectionFields, integrationId, ignoredFieldIds, slugFieldId, fieldSettings } =
		pluginContext;

	const collection = await framer.getManagedCollection();
	await collection.setFields(collectionFields);

	await Promise.all([
		collection.setPluginData(PluginDataKey.integrationId, integrationId),
		collection.setPluginData(PluginDataKey.ignoredFieldIds, JSON.stringify(ignoredFieldIds)),
		collection.setPluginData(PluginDataKey.integrationData, JSON.stringify(integrationData)),
		collection.setPluginData(PluginDataKey.lastSyncedTime, new Date().toISOString()),
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
