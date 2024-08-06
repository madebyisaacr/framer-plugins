import { framer } from "framer-plugin";

export const pluginDataKeys = {
	integrationId: "integrationId",
	databaseId: "databaseId",
	lastSyncedTime: "lastSyncedTime",
	disabledFieldIds: "disabledFieldIds",
	slugFieldId: "slugFieldId",
	isAuthenticated: "isAuthenticated",
};

export const cmsFieldTypeNames = {
	boolean: "Toggle",
	color: "Color",
	number: "Number",
	string: "Text",
	formattedText: "Formatted Text",
	image: "Image",
	link: "Link",
	date: "Date",
	enum: "Option",
	slug: "Slug",
};

export async function syncCollectionItems(pluginContext, items) {
	const collection = await framer.getCollection();
	const existingItemIds = await collection.getItemIds();
	const itemIds = items.map((item) => item.id);

	// await collection.setFields(fields);
	await collection.addItems(items);

	const itemsToRemove = existingItemIds.filter((itemId) => !itemIds.includes(itemId));
	if (itemsToRemove.length > 0) {
		await collection.removeItems(itemsToRemove);
	}
}

export async function syncCollectionFields(pluginContext, fields) {
	const collection = await framer.getCollection();
	const disabledFieldIds = pluginContext.disabledFieldIds;

	let collectionFields = fields.filter((field) => !disabledFieldIds.includes(field.id));
	await collection.setFields(collectionFields);
}
