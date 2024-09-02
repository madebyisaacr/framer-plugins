import {
	getCollectionFieldForProperty,
	getPossibleSlugFields,
	hasFieldConfigurationChanged,
	getFieldConversionTypes,
	getCellPropertyType,
	updatePluginData,
	getColumnLetter,
} from "./googleSheets";
import { usePluginContext, PluginContext } from "../general/PluginContext";
import { MapFieldsPageTemplate, CollectionFieldConfig } from "../general/MapFieldsTemplate";
import { cmsFieldTypeNames } from "../general/CMSFieldTypes";
import { FieldSettings } from "../general/FieldSettings";

const propertyTypeNames = {
	BOOLEAN: "Boolean",
	TEXT: "Text",
	NUMBER: "Number",
	DATE: "Date",
	TIME: "Time",
	DATETIME: "Date & Time",
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
	const { integrationContext } = pluginContext;
	const { sheet } = integrationContext;

	const existingFieldIds = new Set(
		pluginContext.type === "update" ? pluginContext.collectionFields.map((field) => field.id) : []
	);

	const fields: CollectionFieldConfig[] = [];

	if (sheet && sheet.data && sheet.data[0].rowData) {
		const headerRow = sheet.data[0].rowData[0].values;

		headerRow.forEach((cell, index) => {
			// Skip columns with empty header
			if (!cell.formattedValue) {
				return;
			}

			let columnType = "TEXT";

			// Check the column values to determine the type
			for (let i = 1; i < sheet.data[0].rowData.length; i++) {
				const cellValue = sheet.data[0].rowData[i].values[index];
				if (cellValue) {
					columnType = getCellPropertyType(cellValue);
					break;
				}
			}

			const property = {
				id: `column_${index}`,
				name: cell.formattedValue,
				type: columnType,
				columnIndex: index,
				columnLetter: getColumnLetter(index),
			};

			const conversionTypes = getFieldConversionTypes(columnType);

			fields.push({
				originalFieldName: property.name,
				isNewField: existingFieldIds.size > 0 && !existingFieldIds.has(property.id),
				unsupported: !conversionTypes.length,
				property,
				conversionTypes,
				isPageLevelField: false,
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

	const { spreadsheet } = pluginContext.integrationContext;

	return (
		<MapFieldsPageTemplate
			onSubmit={onSubmit}
			isLoading={isLoading}
			error={error}
			updatePluginData={updatePluginData}
			getPossibleSlugFields={getPossibleSlugFields}
			createFieldConfig={createFieldConfig}
			propertyLabelText="Sheet column"
			slugFieldTitleText="Slug Field Column"
			databaseName={spreadsheet.name}
			databaseUrl={`https://docs.google.com/spreadsheets/d/${spreadsheet.id}/edit`}
			databaseLabel="Google Sheet"
			getFieldConversionMessage={getFieldConversionMessage}
			getPropertyTypeName={getPropertyTypeName}
			allFieldSettings={allFieldSettings}
			getCollectionFieldForProperty={getCollectionFieldForProperty}
			columnLetters
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
					: `${propertyType} → ${cmsFieldTypeNames[fieldType]}`,
		  }
		: null;
}

function getPropertyTypeName(propertyType: string) {
	return propertyTypeNames[propertyType];
}

const allFieldSettings = [
	{ propertyType: "TEXT", fieldType: "formattedText", [FieldSettings.ImportMarkdownOrHTML]: true },
];
const fieldConversionMessages = {};
