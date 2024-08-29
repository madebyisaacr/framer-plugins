import { assert } from "../utils.js";
import { Fragment, useMemo, useState, useEffect, forwardRef } from "react";
import classNames from "classnames";
import { IconChevron } from "../components/Icons.js";
import Button from "@shared/Button";
import { cmsFieldIcons } from "../assets/cmsFieldIcons.jsx";
import { Spinner } from "@shared/spinner/Spinner";
import { usePluginContext, PluginContext } from "./PluginContext.js";
import Window from "./Window";
import { SegmentedControl, XIcon } from "@shared/components";
import { cmsFieldTypeNames } from "./CMSFieldTypes.js";
import BackButton from "../components/BackButton.jsx";

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
	propertyLabelText,
	slugFieldTitleText,
	databaseName,
	databaseUrl,
	getFieldConversionMessage,
	getPropertyTypeName,
	allFieldSettings,
	getCollectionFieldForProperty,
	coverImage = null,
	databaseIcon = null,
	subheading = null,
}: {
	onSubmit: () => void;
	isLoading: boolean;
	error: Error | null;
}) {
	const { pluginContext, updatePluginContext } = usePluginContext();
	const { integrationContext } = pluginContext;

	// Field config object or "slug"
	const [editMenuFieldConfig, setEditMenuFieldConfig] = useState(null);

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

	const [fieldElementRefs, setFieldElementRefs] = useState<Record<string, HTMLDivElement>>({});

	const fieldConfigById = useMemo(() => {
		const result = {};
		for (const fieldConfig of fieldConfigList) {
			result[fieldConfig.property.id] = fieldConfig;
		}
		return result;
	}, [fieldConfigList]);

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

	const selectField = (id: string) => {
		const fieldConfig = fieldConfigById[id];
		if (fieldConfig) {
			setEditMenuFieldConfig(fieldConfig);
		}
	};

	function FieldConfigRow({ fieldConfig }: { fieldConfig: CollectionFieldConfig }) {
		const property = fieldConfig.property;
		const id = property?.id;
		const unsupported = fieldConfig.unsupported;
		const isDisabled = !fieldTypes[id] || disabledFieldIds.has(id);

		return (
			<Fragment key={fieldConfig.originalFieldName}>
				<StaticInput
					ref={(el) => (fieldElementRefs[id] = el)}
					disabled={isDisabled}
					leftText={getPropertyTypeName(property.type)}
					className={classNames("pl-6", property && !unsupported && "cursor-pointer")}
					onClick={unsupported ? null : () => selectField(id)}
				>
					<label
						className={classNames(
							"absolute left-0 inset-y-0 w-6 flex items-center justify-center",
							property && !unsupported && "cursor-pointer"
						)}
					>
						<input
							type="checkbox"
							id={`${id}-checkbox`}
							disabled={!property}
							checked={!!property && !isDisabled}
							className={classNames(
								(disabledFieldIds.has(id) || !property || unsupported) &&
									"!bg-[#b4b4b4] dark:!bg-[#5b5b5b]",
								"pointer-events-none"
							)}
							onChange={() => {
								assert(property);
								handleFieldToggle(id);
							}}
						/>
					</label>
					{fieldConfig.originalFieldName}
					{fieldConfig.isNewField && !unsupported && (
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
						{...getFieldConversionMessage(fieldTypes[id], property.type, true)}
					/>
				) : (
					<>
						<input
							type="text"
							className={classNames("w-full", isDisabled && "opacity-50")}
							disabled={isDisabled}
							placeholder={fieldConfig.originalFieldName}
							value={fieldNameOverrides[id] ?? ""}
							onFocus={() => selectField(id)}
							onChange={(e) => {
								assert(property);
								handleFieldNameChange(id, e.target.value);
							}}
						></input>
						<FieldTypeSelector
							fieldType={fieldTypes[id]}
							availableFieldTypes={fieldConfig.conversionTypes}
							disabled={isDisabled}
							onChange={(value) => handleFieldTypeChange(id, value)}
							onClick={() => selectField(id)}
						/>
					</>
				)}
				{!unsupported && <EditButton onClick={() => toggleEditMenuFieldConfig(fieldConfig)} />}
			</Fragment>
		);
	}

	const createFieldConfigRow = (fieldConfig: CollectionFieldConfig) => {
		return <FieldConfigRow key={fieldConfig.property.id} fieldConfig={fieldConfig} />;
	};

	const onBackButtonClick = () => {
		updatePluginContext({
			integrationContext: null,
		});
	};

	const toggleEditMenuFieldConfig = (value) => {
		if (value == "slug" || (typeof value == "object" && value?.hasOwnProperty("property"))) {
			setEditMenuFieldConfig(editMenuFieldConfig === value ? null : value);
		}
	};

	useEffect(() => {
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setEditMenuFieldConfig(null);
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
		<Window page="MapFields" className="flex-col gap-3 overflow-hidden">
			<div className="absolute top-0 inset-x-3 h-px bg-divider z-10" />
			<div className="h-full flex-1 overflow-hidden flex-col">
				<div className="flex-row flex-1 w-full overflow-hidden">
					<div className="flex-col flex-1">
						<div
							className={classNames(
								"flex-col flex-1 p-3 gap-3 transition-opacity relative overflow-y-auto",
								isLoading && "opacity-50 blur-sm pointer-events-none"
							)}
						>
							<div className="flex-col gap-3 mb-2">
								{pluginContext.type === "new" && <BackButton onClick={onBackButtonClick} />}
								{coverImage && (
									<img
										className="w-full aspect-[5] rounded-lg object-cover"
										style={{
											boxShadow: "rgba(0, 0, 0, 0.05) 0px 8px 16px 0px",
										}}
										src={coverImage}
									/>
								)}
								<div className="flex-row gap-2 items-center">
									{databaseIcon}
									<div className="flex-col gap-0.5">
										<h1 className="text-lg font-bold">{databaseName}</h1>
										{subheading && (
											<span className="text-tertiary font-medium">{subheading}</span>
										)}
									</div>
								</div>
							</div>
							<div className="relative flex-1 flex-col gap-4">
								{editMenuFieldConfig && (
									<div
										className="absolute inset-x-0 w-full h-6 pointer-events-none"
										style={{
											top: fieldElementRefs[
												editMenuFieldConfig == "slug" ? "slug" : editMenuFieldConfig.property.id
											]?.offsetTop,
										}}
									>
										<div
											className="absolute -inset-0.5 rounded-lg"
											style={{ boxShadow: "0 0 0 2px var(--framer-color-tint)" }}
										>
											<div
												className="absolute inset-0 rounded-[inherit] opacity-30 pointer-events-none"
												style={{
													boxShadow: `0px 4px 8px 0px var(--framer-color-tint)`,
												}}
											/>
										</div>
									</div>
								)}
								<div
									className="grid gap-2 w-full items-center justify-center"
									style={{
										gridTemplateColumns: `1.5fr 8px 1fr 150px auto`,
									}}
								>
									<div className="flex-row justify-between">
										<span className="text-ellipsis text-nowrap overflow-hidden capitalize font-semibold">
											{propertyLabelText}
										</span>
										<span className="text-tertiary text-ellipsis text-nowrap overflow-hidden">
											Type
										</span>
									</div>
									<div></div>
									<span className="text-ellipsis text-nowrap overflow-hidden font-semibold">
										Collection Field Name
									</span>
									<span className="text-ellipsis text-nowrap overflow-hidden font-semibold">
										Field Type
									</span>
									<div />
									<div
										ref={(el) => (fieldElementRefs["slug"] = el)}
										onClick={() => toggleEditMenuFieldConfig("slug")}
										className="w-full relative pl-6 pr-2 rounded bg-secondary h-6 flex-row items-center cursor-pointer hover:bg-tertiary transition-colors"
									>
										<div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center">
											<input type="checkbox" readOnly checked={true} className="opacity-40" />
										</div>
										{slugFields.find((field) => field.id === slugFieldId)?.name || slugFieldId}
									</div>
									<div className="flex items-center justify-center">
										<IconChevron />
									</div>
									<StaticInput
										disabled
										onClick={() => toggleEditMenuFieldConfig("slug")}
										className="cursor-pointer"
									>
										Slug
									</StaticInput>
									<FieldTypeSelector
										fieldType="slug"
										availableFieldTypes={["slug"]}
										onClick={() => toggleEditMenuFieldConfig("slug")}
									/>
									<EditButton onClick={() => toggleEditMenuFieldConfig("slug")} />
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
						{editMenuFieldConfig == "slug" ? (
							<div className="size-full flex-col">
								<div className="relative flex-col gap-1 w-full p-3">
									<h1 className="text-lg font-bold -mb-1 mt-1">Slug</h1>
									<div className="absolute inset-x-3 bottom-0 h-px bg-divider" />
								</div>
								<div className="flex-col gap-2 overflow-y-auto w-full px-3 pb-3 flex-1">
									<div className="min-h-10 flex-row items-center justify-between -mb-2">
										<span className="text-primary font-semibold">{slugFieldTitleText}</span>
										<span className="text-tertiary pr-2">Type</span>
									</div>
									<div className="flex-col gap-0.5 flex-1">
										{slugFields.map((field) => (
											<label
												key={field.id}
												className={classNames(
													"items-center flex-row gap-2 rounded px-2 h-6 cursor-pointer",
													slugFieldId === field.id && "bg-secondary"
												)}
											>
												<input
													type="checkbox"
													name="slugField"
													value={field.id}
													checked={slugFieldId === field.id}
													onChange={(e) => setSlugFieldId(e.target.value)}
													className="size-2.5"
												/>
												<span className="flex-1">{field.name}</span>
												<span className="text-tertiary">{getPropertyTypeName(field.type)}</span>
											</label>
										))}
									</div>
									<div className="flex-col gap-1 p-3 bg-secondary rounded text-secondary">
										<p className="text-primary font-semibold">What is a slug field?</p>
										<p>
											The slug field is a unique ID for each item in the collection. If the CMS
											collection has a detail page, it is used to create a URL for each item.
										</p>
										<p>The selected {propertyLabelText} will be used to generate the slug field.</p>
									</div>
								</div>
							</div>
						) : editMenuFieldConfig ? (
							<FieldSettingsMenu
								fieldConfig={editMenuFieldConfig}
								fieldTypes={fieldTypes}
								fieldNames={fieldNameOverrides}
								disabledFieldIds={disabledFieldIds}
								setFieldImportEnabled={setFieldImportEnabled}
								handleFieldNameChange={handleFieldNameChange}
								handleFieldTypeChange={handleFieldTypeChange}
								getFieldConversionMessage={getFieldConversionMessage}
								allFieldSettings={allFieldSettings}
								getPropertyTypeName={getPropertyTypeName}
							/>
						) : (
							<div />
						)}
					</div>
				</div>
				<div className="relative w-full flex-row items-center justify-between gap-3 p-3 overflow-hidden">
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
				<div className="absolute inset-0 flex-col items-center justify-center gap-3">
					<Spinner inline />
					Importing items...
				</div>
			)}
		</Window>
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
						"flex-col gap-1.5 rounded-lg p-3 w-full z-10 text-secondary bg-modal pointer-events-none absolute -top-2 -translate-y-[100%] transition-opacity",
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
	onClick = null,
	fieldType,
	availableFieldTypes,
	disabled = false,
	onChange = (value) => {},
}) {
	return (
		<div className="relative cursor-pointer" onClick={onClick}>
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
			<div className="text-tint absolute top-[4px] left-[4px] pointer-events-none">
				{cmsFieldIcons[fieldType]}
			</div>
		</div>
	);
}

const StaticInput = forwardRef(
	({ children, disabled = false, className = "", leftText = "", onClick = null }, ref) => {
		return (
			<div
				ref={ref}
				onClick={onClick}
				className={classNames(
					"relative w-full h-6 flex items-center justify-between bg-secondary rounded gap-1.5 px-2 min-w-0 text-ellipsis text-nowrap overflow-hidden",
					disabled && "opacity-50",
					className
				)}
			>
				<span className="shrink-0 flex-row items-center gap-1.5">{children}</span>
				{leftText && (
					<span
						className={classNames(
							"text-right text-ellipsis text-nowrap overflow-hidden shrink",
							disabled ? "text-secondary" : "text-tertiary"
						)}
						title={leftText}
					>
						{leftText}
					</span>
				)}
			</div>
		);
	}
);

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
		<div className="size-full flex-col">
			<div className="relative flex-col gap-1 w-full px-3 pt-3 pb-2">
				<h1 className="text-lg font-bold -mb-1 mt-1">{fieldConfig.property.name}</h1>
				<p className="mb-1">{getPropertyTypeName(fieldConfig.property.type)}</p>
				<div className="absolute inset-x-3 bottom-0 h-px bg-divider" />
			</div>
			<div className="flex-col gap-2 overflow-y-auto w-full px-3 pb-3 flex-1">
				<div className="min-h-10 flex-row items-center text-primary font-semibold -mb-2">
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
							"p-3 bg-secondary rounded text-secondary flex-col gap-1.5 transition-opacity",
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
								"p-3 bg-secondary rounded text-secondary flex-col gap-1.5 transition-opacity",
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
