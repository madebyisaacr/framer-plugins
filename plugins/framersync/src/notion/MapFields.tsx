import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { useState, useEffect } from "react";
import { assert } from "../utils";
import {
	NotionProperty,
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	pageContentField,
	richTextToPlainText,
	getFieldConversionTypes,
	updatePluginData,
	fetchDatabasePages,
	getCachedDatabasePages,
} from "./notion";
import { isFullDatabase } from "@notionhq/client";
import { usePluginContext, PluginContext } from "../general/PluginContext";
import { MapFieldsPageTemplate, CollectionFieldConfig } from "../general/MapFieldsTemplate";
import { cmsFieldTypeNames } from "../general/CMSFieldTypes";
import getDatabaseIcon from "./getDatabaseIcon";
import { FieldSettings } from "../general/FieldSettings";
import { getFieldsById } from "../general/updateCollection";
import Window from "../general/Window";
import { Spinner } from "@shared/spinner/Spinner";

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
	const { integrationContext, disabledFieldIds } = pluginContext;
	const { database } = integrationContext;

	if (!isFullDatabase(database)) {
		return [];
	}

	const databasePages = getCachedDatabasePages(database.id);

	const canHaveNewFields = pluginContext.type === "update";
	const existingFieldsById = canHaveNewFields ? getFieldsById(pluginContext.collectionFields) : {};

	const isNewField = (fieldId: string) => {
		return canHaveNewFields
			? !existingFieldsById.hasOwnProperty(fieldId) && !disabledFieldIds.includes(fieldId)
			: false;
	};

	const autoFieldTypesById = {};
	let pageCoverAutoDisabled = true;
	let pageIconAutoDisabled = true;
	let imageIconsCount = 0;
	let emojiIconsCount = 0;

	const autoTypeFieldNames: string[] = [];

	for (const key in database.properties) {
		const property = database.properties[key];

		if (property.type == "formula") {
			autoTypeFieldNames.push(key);
		}
	}

	for (const page of databasePages) {
		if (page.icon) {
			pageIconAutoDisabled = false;

			if (page.icon.type == "emoji") {
				emojiIconsCount += 1;
			} else if (page.icon.type == "external") {
				imageIconsCount += 1;
			}
		}

		if (page.cover) {
			pageCoverAutoDisabled = false;
		}

		for (const fieldName of autoTypeFieldNames) {
			const property = page.properties[fieldName]
			if (property.type == "formula" && property.formula.type) {
				autoFieldTypesById[property.id] = property.formula.type
			}
		}
	}

	const pageIconAutoFieldType =
		emojiIconsCount > 0 || imageIconsCount > 0
			? emojiIconsCount > imageIconsCount
				? "string"
				: "image"
			: undefined;

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
			isNewField: isNewField(property.id),
			unsupported: !conversionTypes.length,
			property,
			conversionTypes,
			isPageLevelField: false,
			autoFieldType: autoFieldTypesById[property.id],
		});
	}

	const pageLevelFields: CollectionFieldConfig[] = [];

	if (titleProperty) {
		pageLevelFields.push({
			property: titleProperty,
			originalFieldName: titleProperty.name,
			isNewField: isNewField("title"),
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
		},
		originalFieldName: pageContentField.name,
		isNewField: isNewField(pageContentField.id),
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
			},
			originalFieldName: "Cover Image",
			isNewField: isNewField("page-cover"),
			conversionTypes: ["image"],
			isPageLevelField: true,
			unsupported: false,
			autoDisabled: pageCoverAutoDisabled,
		},
		{
			property: {
				id: "page-icon",
				name: "Icon",
				type: "page-icon",
			},
			originalFieldName: "Icon",
			isNewField: isNewField("page-icon"),
			conversionTypes: ["image", "string"],
			isPageLevelField: true,
			unsupported: false,
			autoDisabled: pageIconAutoDisabled,
			autoFieldType: pageIconAutoFieldType,
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
	const [isLoadingDatabasePages, setIsLoadingDatabasePages] = useState(true);

	assert(isFullDatabase(database));

	useEffect(() => {
		fetchDatabasePages(database.id).then(() => setIsLoadingDatabasePages(false));
	}, [database.id]);

	const coverImage = database.cover?.type === "external" ? database.cover.external.url : null;
	const icon = getDatabaseIcon(database, 28);

	return isLoadingDatabasePages ? (
		<Window page="MapFields">
			<div className="absolute inset-0 flex-col items-center justify-center gap-3 font-semibold">
				<Spinner inline />
				Loading database...
			</div>
		</Window>
	) : (
		<MapFieldsPageTemplate
			onSubmit={onSubmit}
			isLoading={isLoading}
			error={error}
			updatePluginData={updatePluginData}
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
			databaseLabel="Notion database"
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
		[FieldSettings.MultipleFields]: {
			true: "The multi-select options will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first option will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "files",
		[FieldSettings.MultipleFields]: {
			true: "If any items in Notion have multiple files, they will be imported as multiple CMS fields with a number ending added to each field's name.",
			false: "Only the first file will be imported as a CMS field, and the rest will be ignored.",
		},
	},
	{
		propertyType: "created_time",
		[FieldSettings.Time]: true,
	},
	{
		propertyType: "date",
		[FieldSettings.Time]: true,
	},
	{
		propertyType: "last_edited_time",
		[FieldSettings.Time]: true,
	},
	{
		propertyType: "formula",
		fieldType: "date",
		[FieldSettings.Time]: true,
	},
	{
		propertyType: "rollup",
		fieldType: "date",
		[FieldSettings.Time]: true,
	},
	{
		propertyType: "select",
		fieldType: "enum",
		[FieldSettings.NoneOption]: true,
	},
	{
		propertyType: "multi_select",
		fieldType: "enum",
		[FieldSettings.NoneOption]: true,
	},
];
