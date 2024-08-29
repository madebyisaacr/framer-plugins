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
} from "./notion";
import { isFullDatabase } from "@notionhq/client";
import { usePluginContext, PluginContext } from "../general/PluginContext";
import { MapFieldsPageTemplate, CollectionFieldConfig } from "../general/MapFieldsTemplate";
import { cmsFieldTypeNames } from "../general/CMSFieldTypes";
import getDatabaseIcon from "./getDatabaseIcon";

const peopleMessage =
	"People fields cannot be imported because the FramerSync Notion integration does not have access to users' names.";
const fieldConversionMessages = {
	"files - image": "The files must be images, otherwise importing will fail.",
	"page-icon - string":
		'Only emoji icons are imported as text. To import Notion icons and custom image icons, change the field type to "Image"',
	"page-icon - image":
		'Only Notion icons and custom image icons are imported as images. To import emoji icons, change the field type to "Text"',
	button: "Button fields cannot be imported.",
	people: peopleMessage,
	last_edited_by: peopleMessage,
	created_by: peopleMessage,
};
const notionPropertyTypes = {
	checkbox: "Checkbox",
	created_by: "Created by",
	created_time: "Created time",
	date: "Date",
	email: "Email",
	files: "Files & media",
	formula: "Formula",
	last_edited_by: "Last edited by",
	last_edited_time: "Last edited time",
	multi_select: "Multi-select",
	number: "Number",
	people: "Person",
	phone_number: "Phone number",
	relation: "Relation",
	rich_text: "Text",
	rollup: "Rollup",
	select: "Select",
	status: "Status",
	title: "Title",
	url: "URL",
	button: "Button",
	unique_id: "ID",
	"page-icon": "Image / Emoji",
	"page-cover": "Image",
	"page-content": "Page Content",
};

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

	const regularFields: CollectionFieldConfig[] = [];
	let titleProperty: NotionProperty | null = null;

	for (const key in database.properties) {
		const property = database.properties[key];
		assert(property);

		// Title is grouped with other page level properties.
		if (property.type === "title") {
			titleProperty = property;
			continue;
		}

		const conversionTypes = getFieldConversionTypes(property);

		regularFields.push({
			originalFieldName: property.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
			unsupported: !conversionTypes.length,
			property,
			conversionTypes,
			isPageLevelField: false,
		});
	}

	const pageLevelFields: CollectionFieldConfig[] = [];

	if (titleProperty) {
		pageLevelFields.push({
			property: titleProperty,
			originalFieldName: titleProperty.name,
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has("title"),
			conversionTypes: ["string", "formattedText"],
			isPageLevelField: true,
			unsupported: false,
		});
	}

	pageLevelFields.push({
		property: {
			id: "page-content",
			name: "Content",
			type: "page-content",
			unsupported: false,
		},
		originalFieldName: pageContentField.name,
		isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(pageContentField.id),
		unsupported: false,
		conversionTypes: ["formattedText"],
		isPageLevelField: true,
	});

	pageLevelFields.push(
		{
			property: {
				id: "page-cover",
				name: "Cover Image",
				type: "page-cover",
				unsupported: false,
			},
			originalFieldName: "Cover Image",
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has("page-cover"),
			conversionTypes: ["image"],
			isPageLevelField: true,
		},
		{
			property: {
				id: "page-icon",
				name: "Icon",
				type: "page-icon",
				unsupported: false,
			},
			originalFieldName: "Icon",
			isNewField: existingFieldIds.size > 0 && !existingFieldIds.has("page-icon"),
			conversionTypes: ["image", "string"],
			isPageLevelField: true,
		}
	);

	const result = [...pageLevelFields, ...regularFields];
	return result.sort(sortField);
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

	const coverImage = database.cover?.type === "external" ? database.cover.external.url : null;
	const icon = getDatabaseIcon(database, 28);

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
			coverImage={coverImage}
			databaseIcon={icon}
			subheading="Notion database"
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
					? `${notionPropertyTypes[propertyType]} is not supported`
					: `${propertyType == "page-icon" ? "Page Icon" : notionPropertyTypes[propertyType]} → ${
							cmsFieldTypeNames[fieldType]
					  }`,
		  }
		: null;
}

function getPropertyTypeName(propertyType: string) {
	return notionPropertyTypes[propertyType];
}

const allFieldSettings = [
	{
		propertyType: "multi_select",
		multipleFields: {
			true: "The multi-select options will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first option will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "files",
		multipleFields: {
			true: "If any items in Notion have multiple files, they will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first file will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "created_time",
		time: true,
	},
	{
		propertyType: "date",
		time: true,
	},
	{
		propertyType: "last_edited_time",
		time: true,
	},
	{
		propertyType: "formula",
		fieldType: "date",
		time: true,
	},
	{
		propertyType: "rollup",
		fieldType: "date",
		time: true,
	},
];
