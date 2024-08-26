import { framer, CollectionField, CollectionItem } from "framer-plugin";
import { createObject } from "../utils";
import { PluginContext } from "./PluginContext";

export const PluginDataKey = createObject([
	"integrationId",
	"integrationData",
	"ignoredFieldIds",
	"lastSyncedTime",
	"slugFieldId",
	"databaseName",
]);

export async function updateCollection(
	pluginContext: PluginContext,
	fields: CollectionField[],
	collectionItems: CollectionItem[],
	itemsToDelete: string[],
	ignoredFieldIds: string[],
	slugFieldId: string,
	databaseName: string,
	integrationData: object
) {
	const collection = await framer.getManagedCollection();

	console.log(fields, collectionItems, itemsToDelete, ignoredFieldIds, slugFieldId, databaseName);

	await collection.setFields(fields);

	await collection.addItems(collectionItems);
	await collection.removeItems(itemsToDelete);

	await Promise.all([
		collection.setPluginData(PluginDataKey.integrationId, pluginContext.integrationId),
		collection.setPluginData(PluginDataKey.ignoredFieldIds, JSON.stringify(ignoredFieldIds)),
		collection.setPluginData(PluginDataKey.integrationData, JSON.stringify(integrationData)),
		collection.setPluginData(PluginDataKey.lastSyncedTime, new Date().toISOString()),
		collection.setPluginData(PluginDataKey.slugFieldId, slugFieldId),
		collection.setPluginData(PluginDataKey.databaseName, databaseName),
	]);
}
