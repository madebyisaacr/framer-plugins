import { ManagedCollection, CollectionField } from "framer-plugin";

export enum Integration {
	Airtable = "airtable",
	Notion = "notion",
	GoogleSheets = "google-sheets",
}

export interface PluginContextNew {
	type: "new";
	collection: ManagedCollection;
	isAuthenticated: boolean;
}

export interface PluginContextUpdate {
	type: "update";
	integration: Integration;
	integrationContext: object;
	collection: ManagedCollection;
	collectionFields: CollectionField[];
	lastSyncedTime: string;
	hasChangedFields: boolean;
	ignoredFieldIds: string[];
	slugFieldId: string | null;
	isAuthenticated: boolean;
}

export interface PluginContextError {
	type: "error";
	message: string;
	isAuthenticated: false;
}

export type PluginContext = PluginContextNew | PluginContextUpdate | PluginContextError;
