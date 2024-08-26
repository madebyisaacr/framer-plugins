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
]);

export async function updateCollection(
	pluginContext: PluginContext,
	collectionItems: CollectionItem[],
	itemsToDelete: string[],
	integrationData: object
) {
	const { collectionFields, integrationId, ignoredFieldIds, slugFieldId, databaseName } =
		pluginContext;
	const collection = await framer.getManagedCollection();

	console.log(
		collectionFields,
		collectionItems,
		itemsToDelete,
		ignoredFieldIds,
		slugFieldId,
		databaseName
	);

	await collection.setFields(collectionFields);

	await collection.addItems(collectionItems);
	if (itemsToDelete.length > 0) {
		await collection.removeItems(itemsToDelete);
	}

	await Promise.all([
		collection.setPluginData(PluginDataKey.integrationId, integrationId),
		collection.setPluginData(PluginDataKey.ignoredFieldIds, JSON.stringify(ignoredFieldIds)),
		collection.setPluginData(PluginDataKey.integrationData, JSON.stringify(integrationData)),
		collection.setPluginData(PluginDataKey.lastSyncedTime, new Date().toISOString()),
		collection.setPluginData(PluginDataKey.slugFieldId, slugFieldId),
		collection.setPluginData(PluginDataKey.databaseName, databaseName || null),
	]);
}
