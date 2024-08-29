import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { assert } from "../utils";
import {
	NotionProperty,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	pageContentField,
	richTextToPlainText,
	getFieldConversionTypes,
} from "./googleSheets";
import { isFullDatabase } from "@notionhq/client";
import { usePluginContext, PluginContext } from "../general/PluginContext";
import { MapFieldsPageTemplate, CollectionFieldConfig } from "../general/MapFieldsTemplate";
import { cmsFieldTypeNames } from "../general/CMSFieldTypes";

function sortField(fieldA: CollectionFieldConfig, fieldB: CollectionFieldConfig): number {
	// Sort unsupported fields to bottom
	if (!fieldA.field && !fieldB.field) {
		return 0;
	} else if (!fieldA.field) {
		return 1;
	} else if (!fieldB.field) {
		return -1;
	}

	return -1;
}

function createFieldConfig(pluginContext: PluginContext): CollectionFieldConfig[] {
	const { integrationContext } = pluginContext;
	const { database } = integrationContext;

	if (!isFullDatabase(database)) {
		return [];
	}

	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	const fields: CollectionFieldConfig[] = [];

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		const conversionTypes = getFieldConversionTypes(property);

		fields.push({
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
			unsupported: !conversionTypes.length,
			property,
			conversionTypes,
			isPageLevelField: false,
		});
	}

	return fields.sort(sortField);
}

function getInitialSlugFieldId(
	context: PluginContext,
	fieldOptions: NotionProperty[]
): string | null {
	if (context.type === "update" && context.slugFieldId) return context.slugFieldId;

	return fieldOptions[0]?.id ?? null;
}

function getLastSyncedTime(
	pluginContext: PluginContext,
	database: GetDatabaseResponse,
	slugFieldId: string,
	disabledFieldIds: Set<string>
): string | null {
	if (pluginContext.type !== "update") return null;

	// Always resync if the slug field changes.
	if (pluginContext.slugFieldId !== slugFieldId) return null;

	// Always resync if field config changes
	if (
		hasFieldConfigurationChanged(
			pluginContext.collectionFields,
			database,
			Array.from(disabledFieldIds)
		)
	) {
		return null;
	}

	return pluginContext.lastSyncedTime;
}

export function MapFieldsPage({
	onSubmit,
	isLoading,
	error,
}: {
	onSubmit: () => void;
	isLoading: boolean;
	error: Error | null;
}) {
	const { pluginContext } = usePluginContext();

	const { database } = pluginContext.integrationContext;

	assert(isFullDatabase(database));

	return (
		<MapFieldsPageTemplate
			onSubmit={onSubmit}
			isLoading={isLoading}
			error={error}
			getPossibleSlugFields={getPossibleSlugFields}
			getInitialSlugFieldId={getInitialSlugFieldId}
			createFieldConfig={createFieldConfig}
			propertyLabelText="Notion property"
			slugFieldTitleText="Slug Field Property"
			databaseName={richTextToPlainText(database.title)}
			databaseUrl={database.url}
			getFieldConversionMessage={getFieldConversionMessage}
			getPropertyTypeName={getPropertyTypeName}
			allFieldSettings={allFieldSettings}
			getCollectionFieldForProperty={getCollectionFieldForProperty}
		/>
	);
}

function getFieldConversionMessage(fieldType: string, propertyType: string, unsupported: boolean) {
	const text =
		fieldConversionMessages[unsupported ? propertyType : `${propertyType} - ${fieldType}`];

	return text
		? {
				text,
				title: unsupported
					? `${propertyType} is not supported`
					: `${propertyType == "page-icon" ? "Page Icon" : propertyType} → ${
							cmsFieldTypeNames[fieldType]
					  }`,
		  }
		: null;
}

function getPropertyTypeName(propertyType: string) {
	return propertyType;
}

const allFieldSettings = [];
