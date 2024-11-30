export enum FieldSettings {
	Time = "time",
	MultipleFields = "multipleFields",
	NoneOption = "noneOption",
	ImportMarkdownOrHTML = "importMarkdownOrHTML",
}

export const defaultFieldSettingValues: Record<FieldSettings, any> = {
	[FieldSettings.Time]: false,
	[FieldSettings.MultipleFields]: true,
	[FieldSettings.NoneOption]: "",
	[FieldSettings.ImportMarkdownOrHTML]: "html",
};

export function getApplicableFieldSettings(fieldConfig: object, allFieldSettings: object[]) {
	const filteredSettings = allFieldSettings.filter((setting) => {
		if (
			setting.propertyType === fieldConfig.property.type ||
			setting.propertyType === fieldConfig.effectiveType
		) {
			if (setting.fieldType) {
				return setting.fieldType === fieldConfig.property.type;
			}
			return true;
		}
		return false;
	});

	const list = Object.values(FieldSettings).filter((key) =>
		filteredSettings.some((setting) => setting[key])
	);

	return list;
}
