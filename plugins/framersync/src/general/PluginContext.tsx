import { ManagedCollection, CollectionField } from "framer-plugin";
import { createContext, useContext, useState } from "react";

export enum Integration {
	Airtable = "airtable",
	Notion = "notion",
	GoogleSheets = "google-sheets",
}

export interface PluginContextNew {
	type: "new";
	collection: ManagedCollection;
	isAuthenticated: boolean;
	integrationId: Integration | null;
}

export interface PluginContextUpdate {
	type: "update";
	integrationId: Integration;
	integrationContext: object;
	collection: ManagedCollection;
	collectionFields: CollectionField[];
	lastSyncedTime: string;
	hasChangedFields: boolean;
	ignoredFieldIds: string[];
	slugFieldId: string | null;
	databaseName: string;
	isAuthenticated: boolean;
}

export interface PluginContextError {
	type: "error";
	message: string;
	isAuthenticated: false;
}

export type PluginContext = PluginContextNew | PluginContextUpdate | PluginContextError;

const PluginContextContext = createContext(null);

export function usePluginContext() {
	return useContext(PluginContextContext);
}

export function PluginContextProvider({ children, initialContext }: { children: React.ReactNode }) {
	const [pluginContext, setPluginContext] = useState(initialContext);

	function updatePluginContext(
		newContext: Partial<PluginContext>,
		then: (pluginContext: PluginContext) => void
	) {
		let newValue =
			newContext.type === pluginContext.type ? { ...pluginContext, ...newContext } : newContext;
		setPluginContext(newValue);

		if (then) {
			then(newValue);
		}
	}

	return (
		<PluginContextContext.Provider value={{ pluginContext, updatePluginContext }}>
			{children}
		</PluginContextContext.Provider>
	);
}
