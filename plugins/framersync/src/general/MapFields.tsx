import { assert } from "../utils.js";
import { Fragment, useMemo, useState, useEffect } from "react";
import classNames from "classnames";
import { IconChevron } from "../components/Icons.js";
import Button from "@shared/Button";
import { cmsFieldIcons } from "../assets/cmsFieldIcons.jsx";
import { Spinner } from "@shared/spinner/Spinner";
import { usePluginContext, PluginContext } from "./PluginContext.js";
import { updateWindowSize } from "./PageWindowSizes.js";
import { SegmentedControl, XIcon } from "@shared/components";
import { cmsFieldTypeNames } from "./CMSFieldTypes";

const TRANSITION = {
	type: "spring",
	stiffness: 1000,
	damping: 60,
	mass: 1,
};

export interface CollectionFieldConfig {
	property: object;
	isNewField: boolean;
	originalFieldName: string;
	unsupported: boolean;
	conversionTypes: string[];
	isPageLevelField: boolean;
}

function getFieldNameOverrides(pluginContext: PluginContext): Record<string, string> {
	const result: Record<string, string> = {};
	if (pluginContext.type !== "update") return result;

	for (const field of pluginContext.collectionFields) {
		result[field.id] = field.name;
	}

	return result;
}

export function MapFieldsPageTemplate({
	onSubmit,
	isLoading,
	error,
	getPossibleSlugFields,
	getInitialSlugFieldId,
	createFieldConfig,
	propertyHeaderText,
	slugFieldTitleText,
	databaseName,
	databaseUrl,
	getFieldConversionMessage,
	getPropertyTypeName,
	allFieldSettings,
	getCollectionFieldForProperty,
}: {
	onSubmit: () => void;
	isLoading: boolean;
	error: Error | null;
}) {
	updateWindowSize("MapFields");

	const { pluginContext, updatePluginContext } = usePluginContext();
	const { integrationContext } = pluginContext;

	const [settingsMenuFieldConfig, setSettingsMenuFieldConfig] = useState(null);

	const slugFields = useMemo(() => getPossibleSlugFields(integrationContext), [integrationContext]);
	const [slugFieldId, setSlugFieldId] = useState<string | null>(() =>
		getInitialSlugFieldId(pluginContext, slugFields)
	);
	const [fieldConfigList] = useState<CollectionFieldConfig[]>(() =>
		createFieldConfig(pluginContext)
	);
	const [disabledFieldIds, setDisabledFieldIds] = useState(
		() => new Set<string>(pluginContext.type === "update" ? pluginContext.ignoredFieldIds : [])
	);
	const [fieldNameOverrides, setFieldNameOverrides] = useState<Record<string, string>>(() =>
		getFieldNameOverrides(pluginContext)
	);
	const [fieldTypes, setFieldTypes] = useState(
		createFieldTypesList(fieldConfigList, pluginContext)
	);

	const onSettingsButtonClick = (fieldConfig: CollectionFieldConfig) => {
		setSettingsMenuFieldConfig(fieldConfig);
	};

	const handleFieldToggle = (key: string) => {
		setDisabledFieldIds((current) => {
			const nextSet = new Set(current);
			if (nextSet.has(key)) {
				nextSet.delete(key);
			} else {
				nextSet.add(key);
			}

			return nextSet;
		});
	};

	const setFieldImportEnabled = (id: string, enabled: boolean) => {
		setDisabledFieldIds((current) => {
			const nextSet = new Set(current);
			if (enabled) {
				nextSet.delete(id);
			} else {
				nextSet.add(id);
			}

			return nextSet;
		});
	};

	const handleFieldNameChange = (id: string, value: string) => {
		setFieldNameOverrides((current) => ({
			...current,
			[id]: value,
		}));
	};

	const handleFieldTypeChange = (id: string, value: string) => {
		setFieldTypes((current) => ({
			...current,
			[id]: value,
		}));
	};

	const handleSubmit = () => {
		if (isLoading) return;

		const fields: any[] = [];

		for (const fieldConfig of fieldConfigList) {
			if (
				!fieldConfig ||
				!fieldConfig.property ||
				fieldConfig.unsupported ||
				disabledFieldIds.has(fieldConfig.property.id)
			) {
				continue;
			}

			fields.push(
				getCollectionFieldForProperty(
					fieldConfig.property,
					fieldNameOverrides[fieldConfig.property.id] || fieldConfig.property.name,
					fieldTypes[fieldConfig.property.id]
				)
			);
		}

		assert(slugFieldId);

		updatePluginContext(
			{
				collectionFields: fields,
				slugFieldId,
				ignoredFieldIds: Array.from(disabledFieldIds),
				databaseName,
			},
			onSubmit
		);
	};

	function createFieldConfigRow(fieldConfig: CollectionFieldConfig) {
		const id = fieldConfig.property.id;
		const isDisabled = !fieldTypes[id] || disabledFieldIds.has(id);

		return (
			<Fragment key={fieldConfig.originalFieldName}>
				<label
					htmlFor={`${id}-checkbox`}
					className={classNames(
						"size-full flex items-center",
						!fieldConfig.unsupported && "cursor-pointer"
					)}
				>
					<input
						type="checkbox"
						id={`${id}-checkbox`}
						disabled={!fieldConfig.property}
						checked={!!fieldConfig.property && !isDisabled}
						className={classNames(
							"mx-auto",
							!fieldConfig.property && "opacity-50",
							fieldConfig.property && !fieldConfig.unsupported && "cursor-pointer"
						)}
						onChange={() => {
							assert(fieldConfig.property);

							handleFieldToggle(id);
						}}
					/>
				</label>
				<StaticInput
					disabled={isDisabled}
					leftText={getPropertyTypeName(fieldConfig.property.type)}
				>
					{fieldConfig.originalFieldName}
					{fieldConfig.isNewField && !fieldConfig.unsupported && (
						<div
							className="bg-segmented-control rounded-sm px-[6px] py-[2px] text-[10px] font-semibold"
							style={{ boxShadow: "0 2px 4px 0 rgba(0,0,0,0.15)" }}
						>
							New
						</div>
					)}
				</StaticInput>
				<div className={classNames("flex items-center justify-center", isDisabled && "opacity-50")}>
					<IconChevron />
				</div>
				{!fieldTypes[id] ? (
					<UnsupportedFieldBlock
						{...getFieldConversionMessage(fieldTypes[id], fieldConfig.property.type, true)}
					/>
				) : (
					<>
						<input
							type="text"
							className={classNames("w-full", isDisabled && "opacity-50")}
							disabled={isDisabled}
							placeholder={fieldConfig.originalFieldName}
							value={fieldNameOverrides[id] ?? ""}
							onChange={(e) => {
								assert(fieldConfig.property);
								handleFieldNameChange(id, e.target.value);
							}}
						></input>
						<FieldTypeSelector
							fieldType={fieldTypes[id]}
							availableFieldTypes={fieldConfig.conversionTypes}
							disabled={isDisabled}
							onChange={(value) => handleFieldTypeChange(id, value)}
						/>
					</>
				)}
				{!fieldConfig.unsupported && (
					<EditButton onClick={() => onSettingsButtonClick(fieldConfig)} />
				)}
			</Fragment>
		);
	}

	const closeSettingsMenu = () => {
		setSettingsMenuFieldConfig(null);
	};

	useEffect(() => {
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeSettingsMenu();
			}
		};

		document.addEventListener("keydown", handleEscapeKey);

		return () => {
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, []);

	const newFields = fieldConfigList.filter(
		(fieldConfig) => fieldConfig.isNewField && !fieldConfig.unsupported
	);
	const unsupportedFields = fieldConfigList.filter((fieldConfig) => fieldConfig.unsupported);
	const pageLevelFields = fieldConfigList.filter((fieldConfig) => fieldConfig.isPageLevelField);
	const otherFields = fieldConfigList.filter(
		(fieldConfig) =>
			!fieldConfig.isPageLevelField && !fieldConfig.unsupported && !fieldConfig.isNewField
	);

	return (
		<div className="flex-1 flex flex-col gap-3 overflow-hidden">
			<div className="absolute top-0 inset-x-3 h-px bg-divider z-10" />
			<div className="h-full flex-1 overflow-hidden flex flex-col">
				<div className="flex flex-row flex-1 w-full overflow-hidden">
					<div className="flex flex-col flex-1">
						<div
							className={classNames(
								"flex flex-col flex-1 px-3 pb-3 pt-4 gap-3 transition-opacity relative overflow-y-auto",
								isLoading && "opacity-50 blur-sm pointer-events-none"
							)}
						>
							<h1 className="text-lg font-bold px-[36px] mb-2">Configure Collection Fields</h1>
							<div className="flex-1 flex flex-col gap-4">
								<div
									className="grid gap-2 w-full items-center justify-center"
									style={{
										gridTemplateColumns: `16px 1.5fr 8px 1fr 150px auto`,
									}}
								>
									<div className="col-start-2 flex flex-row justify-between px-2">
										<span>{propertyHeaderText}</span>
										<span className="text-tertiary">Type</span>
									</div>
									<div></div>
									<span className="pl-2">Collection Field Name</span>
									<span className="pl-[4px]">Field Type</span>
									<div />
									<input type="checkbox" readOnly checked={true} className="opacity-50 mx-auto" />
									<select
										className="w-full"
										value={slugFieldId ?? ""}
										onChange={(e) => setSlugFieldId(e.target.value)}
										required
									>
										<option value="" disabled>
											{slugFieldTitleText}
										</option>
										<hr />
										{slugFields.map((field) => (
											<option key={field.id} value={field.id}>
												{field.name}
											</option>
										))}
									</select>
									<div className="flex items-center justify-center">
										<IconChevron />
									</div>
									<StaticInput disabled>Slug</StaticInput>
									<FieldTypeSelector fieldType="slug" availableFieldTypes={["slug"]} />
									<EditButton onClick={() => {}} />
									{pageLevelFields.map(createFieldConfigRow)}
									{newFields.length + otherFields.length > 0 && (
										<div className="h-px bg-divider col-span-full"></div>
									)}
									{newFields.map(createFieldConfigRow)}
									{otherFields.map(createFieldConfigRow)}
									{unsupportedFields.length > 0 && (
										<div className="h-px bg-divider col-span-full"></div>
									)}
									{unsupportedFields.map(createFieldConfigRow)}
								</div>
							</div>
						</div>
					</div>
					<div className="w-[285px] h-full relative">
						<div className="absolute left-0 inset-y-3 w-px bg-divider z-10" />
						{settingsMenuFieldConfig ? (
							<FieldSettingsMenu
								fieldConfig={settingsMenuFieldConfig}
								fieldTypes={fieldTypes}
								fieldNames={fieldNameOverrides}
								disabledFieldIds={disabledFieldIds}
								setFieldImportEnabled={setFieldImportEnabled}
								handleFieldNameChange={handleFieldNameChange}
								handleFieldTypeChange={handleFieldTypeChange}
								getFieldConversionMessage={getFieldConversionMessage}
								allFieldSettings={allFieldSettings}
								getPropertyTypeName={getPropertyTypeName}
								onClose={closeSettingsMenu}
							/>
						) : (
							<div />
						)}
					</div>
				</div>
				<div className="relative w-full flex flex-row items-center justify-between gap-3 p-3 overflow-hidden">
					<div className="absolute top-0 inset-x-3 h-px bg-divider z-10" />
					<div className="inline-flex items-center min-w-0 flex-1">
						{error ? (
							<span className="text-[#f87171]">{error.message}</span>
						) : (
							<>
								<span className="text-tertiary flex-shrink-0 whitespace-pre">Importing from </span>
								<a
									href={databaseUrl}
									className="font-semibold text-secondary hover:text-primary truncate"
									target="_blank"
									tabIndex={-1}
								>
									{databaseName}
								</a>
							</>
						)}
					</div>
					<Button
						primary
						onClick={handleSubmit}
						className="w-auto px-4 min-w-[100px]"
						disabled={!slugFieldId}
					>
						{pluginContext.type === "update" ? "Save & Import" : "Import"}
					</Button>
				</div>
			</div>
			{isLoading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
					<Spinner inline />
					Importing items...
				</div>
			)}
			{/* {settingsMenuFieldConfig && (
				<div className="absolute inset-0 cursor-pointer" onClick={closeSettingsMenu} />
			)} */}
			{/* <AnimatePresence>
				{settingsMenuFieldConfig && (
					<FieldSettingsMenu
						fieldConfig={settingsMenuFieldConfig}
						fieldTypes={fieldTypes}
						fieldNames={fieldNameOverrides}
						disabledFieldIds={disabledFieldIds}
						setFieldImportEnabled={setFieldImportEnabled}
						handleFieldNameChange={handleFieldNameChange}
						handleFieldTypeChange={handleFieldTypeChange}
						getFieldConversionMessage={getFieldConversionMessage}
						allFieldSettings={allFieldSettings}
						getPropertyTypeName={getPropertyTypeName}
						onClose={closeSettingsMenu}
					/>
				)}
			</AnimatePresence> */}
		</div>
	);
}

function UnsupportedFieldBlock({ title, text }) {
	const [hover, setHover] = useState(false);

	return (
		<div
			className="col-span-3 w-full h-6 relative"
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			<div className="size-full flex items-center bg-secondary rounded opacity-50 px-2">
				Unsupported Field Type
			</div>
			{text && (
				<div
					className={classNames(
						"flex flex-col gap-1.5 rounded-lg p-3 w-full z-10 text-secondary bg-modal pointer-events-none absolute -top-2 -translate-y-[100%] transition-opacity",
						hover ? "opacity-100" : "opacity-0"
					)}
					style={{
						boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 30px 0px",
					}}
				>
					<p className="text-primary font-semibold">{title}</p>
					{text}
				</div>
			)}
		</div>
	);
}

function FieldTypeSelector({
	fieldType,
	availableFieldTypes,
	disabled = false,
	onChange = (value) => {},
}) {
	return (
		<div className="relative">
			<div className="text-tint absolute top-[4px] left-[4px] pointer-events-none">
				{cmsFieldIcons[fieldType]}
			</div>
			{availableFieldTypes?.length > 1 ? (
				<select
					disabled={disabled}
					value={fieldType}
					onChange={(e) => onChange(e.target.value)}
					className="pl-[34px] w-full"
				>
					{availableFieldTypes?.map((type) => (
						<option key={type} value={type}>
							{cmsFieldTypeNames[type]}
						</option>
					))}
				</select>
			) : (
				<StaticInput disabled={disabled} className="pl-[34px]">
					{cmsFieldTypeNames[fieldType]}
				</StaticInput>
			)}
		</div>
	);
}

function StaticInput({ children, disabled = false, className = "", leftText = "" }) {
	return (
		<div
			className={classNames(
				"w-full h-6 flex items-center bg-secondary rounded gap-1.5 px-2",
				disabled && "opacity-50",
				className
			)}
		>
			{children}
			{leftText && (
				<span
					className={classNames("flex-1 text-right", disabled ? "text-secondary" : "text-tertiary")}
				>
					{leftText}
				</span>
			)}
		</div>
	);
}

function createFieldTypesList(
	fieldConfigList: CollectionFieldConfig[],
	pluginContext: PluginContext
) {
	const result: Record<string, string> = {};

	for (const fieldConfig of fieldConfigList) {
		const conversionTypes = fieldConfig.conversionTypes;
		if (!fieldConfig.property || !conversionTypes?.length) {
			continue;
		}

		if (pluginContext.type !== "update") {
			result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
		} else {
			const field = pluginContext.collectionFields.find(
				(field) => field.id === fieldConfig.property.id
			);

			if (field && conversionTypes.includes(field.type)) {
				result[fieldConfig.property.id] = field.type;
			} else {
				result[fieldConfig.property.id] = fieldConfig.conversionTypes[0];
			}
		}
	}

	return result;
}

function FieldSettingsMenu({
	fieldConfig,
	fieldTypes,
	fieldNames,
	onClose,
	disabledFieldIds,
	setFieldImportEnabled,
	handleFieldNameChange,
	handleFieldTypeChange,
	getFieldConversionMessage,
	allFieldSettings,
	getPropertyTypeName,
}) {
	const id = fieldConfig.property.id;
	const propertyType = fieldConfig.property.type;
	const fieldType = fieldTypes[id];
	const fieldName = fieldNames[id] || fieldConfig.property.name;
	const disabled = disabledFieldIds.has(id);

	const fieldConversionMessage = getFieldConversionMessage(
		fieldType,
		propertyType,
		fieldConfig.unsupported
	);

	const getApplicableSettings = () => {
		return allFieldSettings.filter((setting) => {
			if (setting.propertyType === propertyType) {
				if (setting.fieldType) {
					return setting.fieldType === fieldType;
				}
				return true;
			}
			return false;
		});
	};

	const [fieldSettings, setFieldSettings] = useState({});

	useEffect(() => {
		const applicableSettings = getApplicableSettings();
		const newFieldSettings = {};

		applicableSettings.forEach((setting) => {
			if (setting.multipleFields) {
				newFieldSettings.multipleFields = true;
			}
			if (setting.time) {
				newFieldSettings.time = true;
			}
			// Add more settings here as needed
		});

		setFieldSettings(newFieldSettings);
	}, [propertyType, fieldType]);

	return (
		<div className="size-full flex flex-col">
			<div className="relative flex flex-col gap-1 w-full px-3 pt-3 pb-2">
				<h1 className="text-lg font-bold -mb-1">{fieldConfig.property.name}</h1>
				<p className="mb-1">{getPropertyTypeName(fieldConfig.property.type)}</p>
				<div className="absolute inset-x-3 bottom-0 h-px bg-divider" />
			</div>
			<div className="flex flex-col gap-2 overflow-y-auto w-full px-3 pb-3 flex-1">
				<div className="min-h-10 flex flex-row items-center text-primary font-semibold -mb-2">
					Field Settings
				</div>
				<PropertyControl title="Import Field">
					<SegmentedControl
						id={"import"}
						items={[true, false]}
						itemTitles={["Yes", "No"]}
						currentItem={!disabled}
						tint
						onChange={(value) => {
							setFieldImportEnabled(id, value);
						}}
					/>
				</PropertyControl>
				<PropertyControl title="Name" disabled={disabled}>
					<input
						type="text"
						className="w-full"
						value={fieldNames[id] || ""}
						placeholder={fieldConfig.property.name}
						onChange={(e) => handleFieldNameChange(id, e.target.value)}
					/>
				</PropertyControl>
				<PropertyControl title="Field Type" disabled={disabled}>
					<FieldTypeSelector
						fieldType={fieldTypes[id]}
						availableFieldTypes={fieldConfig.conversionTypes}
						onChange={(value) => handleFieldTypeChange(id, value)}
					/>
				</PropertyControl>
				{fieldConversionMessage && (
					<div
						className={classNames(
							"p-3 bg-secondary rounded text-secondary flex flex-col gap-1.5 transition-opacity",
							disabled && "opacity-50"
						)}
					>
						<p className="text-primary font-semibold">{fieldConversionMessage.title}</p>
						{fieldConversionMessage.text}
					</div>
				)}
				{fieldSettings.hasOwnProperty("multipleFields") && (
					<>
						<PropertyControl title="Multiple Fields" disabled={disabled}>
							<SegmentedControl
								id={"multipleFields"}
								items={[true, false]}
								itemTitles={["Yes", "No"]}
								currentItem={fieldSettings.multipleFields}
								tint
								onChange={(value) => {
									setFieldSettings({ ...fieldSettings, multipleFields: value });
								}}
							/>
						</PropertyControl>
						<div
							className={classNames(
								"p-3 bg-secondary rounded text-secondary flex flex-col gap-1.5 transition-opacity",
								disabled && "opacity-50"
							)}
						>
							{
								allFieldSettings.find(
									(setting) => setting.propertyType === fieldConfig.property.type
								)?.multipleFields?.[fieldSettings.multipleFields ? "true" : "false"]
							}
							{fieldSettings.multipleFields && (
								<p>
									<span className="text-primary font-semibold">Preview:</span> {fieldName} 1,{" "}
									{fieldName} 2, {fieldName} 3, ...
								</p>
							)}
						</div>
					</>
				)}
				{fieldSettings.hasOwnProperty("time") && (
					<>
						<PropertyControl title="Include Time" disabled={disabled}>
							<SegmentedControl
								id={"timeOption"}
								items={[true, false]}
								itemTitles={["Yes", "No"]}
								currentItem={fieldSettings.time}
								tint
								onChange={(value) => {
									setFieldSettings({ ...fieldSettings, time: value });
								}}
							/>
						</PropertyControl>
					</>
				)}
			</div>
		</div>
	);
}

function PropertyControl({ title, children, disabled = false }) {
	return (
		<div
			className={classNames(
				"grid gap-2 w-full items-center transition-opacity",
				disabled && "opacity-50 pointer-events-none"
			)}
			style={{
				gridTemplateColumns: "minmax(0,1.5fr) repeat(2,minmax(62px,1fr))",
			}}
		>
			<span className="text-secondary pl-2">{title}</span>
			<div className="col-span-2">{children}</div>
		</div>
	);
}

function EditButton({ onClick }) {
	return (
		<Button type="button" onClick={onClick}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="-mr-0.5"
			>
				<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
				<path d="M13.5 6.5l4 4" />
			</svg>
			Edit
		</Button>
	);
}
