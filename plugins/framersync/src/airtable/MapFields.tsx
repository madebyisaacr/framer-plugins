import { assert } from "../utils.js";
import {
	SynchronizeMutationOptions,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	propertyConversionTypes,
} from "./airtable.js";
import { PluginContext, usePluginContext } from "../general/PluginContext";
import { cmsFieldTypeNames } from "../general/CMSFieldTypes";
import { MapFieldsPageTemplate, CollectionFieldConfig } from "../general/MapFieldsTemplate.js";

const propertyTypeNames = {
	aiText: "AI Text",
	multipleAttachments: "Attachments",
	autoNumber: "Auto number",
	barcode: "Barcode",
	button: "Button",
	checkbox: "Checkbox",
	singleCollaborator: "User",
	count: "Count",
	createdBy: "Created by",
	createdTime: "Created time",
	currency: "Currency",
	date: "Date",
	dateTime: "Date and time",
	duration: "Duration",
	email: "Email",
	formula: "Formula",
	lastModifiedBy: "Last modified by",
	lastModifiedTime: "Last modified time",
	multipleRecordLinks: "Link to another record",
	multilineText: "Long text",
	multipleLookupValues: "Lookup",
	multipleCollaborators: "Multiple users",
	multipleSelects: "Multiple select",
	number: "Number",
	percent: "Percent",
	phoneNumber: "Phone",
	rating: "Rating",
	richText: "Rich text",
	rollup: "Rollup",
	singleLineText: "Single line text",
	singleSelect: "Single select",
	externalSyncSource: "Sync source",
	url: "URL",
};
const fieldConversionMessages = {};
const allFieldSettings = [
	{ propertyType: "createdTime", time: true },
	{ propertyType: "dateTime", time: true },
	{ propertyType: "lastModifiedTime", time: true },
	{ propertyType: "formula", fieldType: "date", time: true },
	{
		propertyType: "multipleAttachments",
		multipleFields: {
			true: "The attachments options will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first attachment will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "multipleLookupValues",
		multipleFields: {
			true: "The lookup values will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first lookup value will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "multipleCollaborators",
		multipleFields: {
			true: "The collaborators' names will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first collaborator's name will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "multipleSelects",
		multipleFields: {
			true: "The multi-select options will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first option will be imported as a CMS field, and the rest will be ignored.",
		},
	},
];

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
	const { table } = integrationContext;

	if (!table) {
		return [];
	}

	const result: CollectionFieldConfig[] = [];

	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	for (const key in table.fields) {
		const property = table.fields[key];
		assert(property);

		const conversionTypes = propertyConversionTypes[property.type] ?? [];

		result.push({
			// field: getCollectionFieldForProperty(property),
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
			unsupported: !conversionTypes.length,
			property,
			conversionTypes,
			isPageLevelField: false,
		});
	}

	return result.sort(sortField);
}

function getInitialSlugFieldId(context: PluginContext, fieldOptions): string | null {
	if (context.type === "update" && context.slugFieldId) return context.slugFieldId;

	return fieldOptions[0]?.id ?? null;
}

function getLastSyncedTime(
	pluginContext: PluginContext,
	table: object,
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
			table,
			Array.from(disabledFieldIds)
		)
	) {
		return null;
	}

	return pluginContext.lastSyncedTime;
}

function getPropertyTypeName(propertyType: string) {
	return propertyTypeNames[propertyType];
}

export function MapFieldsPage({
	onSubmit,
	isLoading,
	error,
}: {
	onSubmit: (options: SynchronizeMutationOptions) => void;
	isLoading: boolean;
	error: Error | null;
}) {
	const { pluginContext } = usePluginContext();

	const { table, tableId, baseId } = pluginContext.integrationContext;

	assert(table);

	return (
		<MapFieldsPageTemplate
			onSubmit={onSubmit}
			isLoading={isLoading}
			error={error}
			getPossibleSlugFields={getPossibleSlugFields}
			getInitialSlugFieldId={getInitialSlugFieldId}
			createFieldConfig={createFieldConfig}
			propertyLabelText="Airtable field"
			slugFieldTitleText="Slug Field Column"
			databaseName={table.name}
			databaseUrl={`https://airtable.com/${baseId}/${tableId}`}
			getFieldConversionMessage={getFieldConversionMessage}
			getPropertyTypeName={getPropertyTypeName}
			allFieldSettings={allFieldSettings}
			getCollectionFieldForProperty={getCollectionFieldForProperty}
			subheading="Airtable table"
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
					? `${propertyTypeNames[propertyType]} is not supported`
					: `${propertyTypeNames[propertyType]} → ${cmsFieldTypeNames[fieldType]}`,
		  }
		: null;
}
