import {
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	getCellPropertyType,
	updatePluginData,
	getColumnLetter,
} from "./googleSheets";
import { usePluginContext, PluginContext } from "../general/PluginContext";
import { MapFieldsPageTemplate, CollectionFieldConfig } from "../general/MapFieldsTemplate";
import { cmsFieldTypeNames } from "../general/data";
import { FieldSettings } from "../general/FieldSettings";
import { getFieldsById } from "../general/updateCollection";
import { useMemo } from "react";

const propertyTypeNames = {
	BOOLEAN: "Boolean",
	TEXT: "Text",
	NUMBER: "Number",
	DATE: "Date",
	TIME: "Time",
	DATE_TIME: "Date & Time",
	FORMULA: "Formula",
	IMAGE: "Image",
	HYPERLINK: "Link",
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
	const { integrationContext, disabledFieldIds, collectionFields } = pluginContext;
	const { sheet } = integrationContext;

	const canHaveNewFields = pluginContext.type === "update";
	const existingFieldsById = canHaveNewFields ? getFieldsById(collectionFields) : {};

	const isNewField = (fieldId: string) => {
		return canHaveNewFields
			? !existingFieldsById.hasOwnProperty(fieldId) && !disabledFieldIds.includes(fieldId)
			: false;
	};

	const fields: CollectionFieldConfig[] = [];

	if (sheet && sheet.data && sheet.data[0].rowData) {
		const headerRow = sheet.data[0].rowData[0].values;

		headerRow.forEach((cell, index) => {
			// Skip columns with empty header
			if (!cell.formattedValue) {
				return;
			}

			let conversionTypes = [];
			let columnType = "TEXT";
			let autoFieldType = undefined;
			let autoFieldSettings = undefined;

			// Check the column values to determine the type
			for (let i = 1; i < sheet.data[0].rowData.length; i++) {
				const cellValue = sheet.data[0].rowData[i].values[index];
				if (cellValue) {
					[conversionTypes, columnType, autoFieldType, autoFieldSettings] =
						getCellPropertyType(cellValue);
					break;
				}
			}

			const property = {
				id: index.toString(),
				name: cell.formattedValue,
				type: columnType,
				columnIndex: index,
				columnLetter: getColumnLetter(index),
			};

			fields.push({
				originalFieldName: property.name,
				isNewField: isNewField(property.id),
				unsupported: !conversionTypes.length,
				property,
				conversionTypes,
				isPageLevelField: false,
				autoFieldType,
				autoFieldSettings,
			});
		});
	}

	return fields.sort(sortField);
}

function getLastSyncedTime(
	pluginContext: PluginContext,
	database,
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
	const { spreadsheet, sheet } = pluginContext.integrationContext;

	const fieldConfigList = useMemo(() => createFieldConfig(pluginContext), [pluginContext]);

	return (
		<MapFieldsPageTemplate
			onSubmit={onSubmit}
			isLoading={isLoading}
			error={error}
			updatePluginData={updatePluginData}
			getPossibleSlugFields={getPossibleSlugFields}
			fieldConfigList={fieldConfigList}
			propertyLabelText="Sheet column"
			slugFieldTitleText="Slug Field Column"
			databaseName={`${spreadsheet.name} - ${sheet.properties.title}`}
			databaseUrl={`https://docs.google.com/spreadsheets/d/${spreadsheet.id}/edit?gid=${sheet.id}`}
			databaseLabel="Google Sheet"
			getFieldConversionMessage={getFieldConversionMessage}
			getPropertyTypeName={getPropertyTypeName}
			allFieldSettings={allFieldSettings}
			getCollectionFieldForProperty={getCollectionFieldForProperty}
			columnLetters
		/>
	);
}

function getFieldConversionMessage(fieldConfig: CollectionFieldConfig, fieldType: string) {
	const { property, unsupported } = fieldConfig;

	const text =
		fieldConversionMessages[unsupported ? property.type : `${property.type} - ${fieldType}`];

	return text
		? {
				text,
				title: unsupported
					? `${propertyTypeNames[property.type]} is not supported`
					: `${propertyTypeNames[property.type]} → ${cmsFieldTypeNames[fieldType]}`,
		  }
		: null;
}

function getPropertyTypeName(fieldConfig: CollectionFieldConfig) {
	return `${propertyTypeNames[fieldConfig.property.type]} • Column ${
		fieldConfig.property.columnLetter
	}`;
}

const allFieldSettings = [
	{ propertyType: "TEXT", fieldType: "formattedText", [FieldSettings.ImportMarkdownOrHTML]: true },
	{
		fieldType: "formattedText",
		[FieldSettings.CodeBlockLanguage]: {
			message:
				"Code blocks without a language or with an an unsupported language will be imported with the selected language. If there are no code blocks, you can ignore this setting.",
		},
	},
];
const fieldConversionMessages = {};
