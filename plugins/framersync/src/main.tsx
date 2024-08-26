import "./globals.css";

import React, { ReactNode, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { CenteredSpinner } from "./components/CenteredSpinner.tsx";
import Airtable from "./airtable/AirtableIntegration";
import Notion from "./notion/NotionIntegration";
import { PluginContext, PluginContextUpdate, Integration } from "./general/PluginContext";

import { framer } from "framer-plugin";
import { logSyncResult } from "./debug.ts";
import { ErrorBoundaryFallback } from "./components/ErrorBoundaryFallback.tsx";
import { assert, isString, createObject } from "./utils.ts";

const PluginDataKey = createObject([
	"integrationId",
	"integrationData",
	"ignoredFieldIds",
	"lastSyncedTime",
	"slugFieldId",
	"databaseName",
]);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

function shouldSyncImmediately(pluginContext: PluginContext): pluginContext is PluginContextUpdate {
	if (pluginContext.type !== "update") return false;

	if (!pluginContext.integration) return false;
	if (!pluginContext.integrationContext) return false;
	if (!pluginContext.slugFieldId) return false;
	if (pluginContext.hasChangedFields) return false;

	return true;
}

function renderPlugin(context: PluginContext, app: ReactNode) {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	framer.showUI({
		width: 350,
		height: context.isAuthenticated ? 370 : 340,
	});

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<div className="w-full flex flex-col overflow-auto flex-1 select-none">
					<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
						<Suspense fallback={<CenteredSpinner />}>{app}</Suspense>
					</ErrorBoundary>
				</div>
			</QueryClientProvider>
		</React.StrictMode>
	);
}

function getIntegration(integrationId: string | null) {
	switch (integrationId) {
		case Integration.Notion:
			return Notion;
		case Integration.Airtable:
			return Airtable;
	}

	return null;
}

async function getPluginContext(): Promise<PluginContext> {
	const collection = await framer.getManagedCollection();
	const [
		collectionFields,
		integrationId,
		integrationDataJson,
		ignoredFieldIdsJson,
		lastSyncedTime,
		slugFieldId,
		databaseName,
	] = await Promise.all([
		collection.getFields(),
		collection.getPluginData(PluginDataKey.integrationId),
		collection.getPluginData(PluginDataKey.integrationData),
		collection.getPluginData(PluginDataKey.ignoredFieldIds),
		collection.getPluginData(PluginDataKey.lastSyncedTime),
		collection.getPluginData(PluginDataKey.slugFieldId),
		collection.getPluginData(PluginDataKey.databaseName),
	]);

	const integration = getIntegration(integrationId);

	if (!integration) {
		return {
			type: "new",
			collection,
			isAuthenticated: false,
		};
	}

	const isAuthenticated = integration.isAuthenticated();

	if (!integrationDataJson) {
		return {
			type: "new",
			collection,
			isAuthenticated,
		};
	}

	try {
		const ignoredFieldIds = stringToJSON(ignoredFieldIdsJson);
		const integrationData = stringToJSON(integrationDataJson);
		const integrationContext = await integration.getIntegrationContext(integrationData, databaseName);

		if (integrationContext instanceof Error) {
			return {
				type: "error",
				message: integrationContext.message,
				isAuthenticated: false,
			};
		}

		return {
			type: "update",
			integrationId,
			integrationContext,
			collection,
			collectionFields,
			ignoredFieldIds,
			lastSyncedTime,
			slugFieldId,
			databaseName,
			// TODO: Fix hasChangedFields
			// hasChangedFields: hasFieldConfigurationChanged(collectionFields, database, ignoredFieldIds),
			isAuthenticated,
		};
	} catch (error) {
		return {
			type: "error",
			message: "Failed to get plugin context. Please try again.",
			isAuthenticated: false,
		};
	}
}

async function runPlugin() {
	const collection = await framer.getManagedCollection();

	const integrationId = await collection.getPluginData(PluginDataKey.integrationId);
	const integration = getIntegration(integrationId);

	let pluginContext: PluginContext;

	if (!integration) {
		pluginContext = {
			type: "new",
			collection,
			isAuthenticated: false,
		};
	} else {
		try {
			if (integration.isAuthenticated()) {
				await integration.refreshToken();
			}

			const pluginContext = await getPluginContext();
			const mode = framer.mode;

			if (mode === "syncManagedCollection" && shouldSyncImmediately(pluginContext)) {
				assert(pluginContext.slugFieldId);

				const result = await integration.synchronizeDatabase(pluginContext.integrationContext, {
					fields: pluginContext.collectionFields,
					ignoredFieldIds: pluginContext.ignoredFieldIds,
					lastSyncedTime: pluginContext.lastSyncedTime,
					slugFieldId: pluginContext.slugFieldId,
				});

				logSyncResult(result);

				await framer.closePlugin();
				return;
			}

			renderPlugin(pluginContext, <App context={pluginContext} />);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(message);
			// framer.closePlugin("An unexpected error ocurred: " + message, {
			// 	variant: "error",
			// });
		}
	}
}

function stringToJSON(jsonString: string | null) {
	if (!jsonString) {
		return [];
	}

	const parsed = JSON.parse(jsonString);
	if (!Array.isArray(parsed)) return [];
	if (!parsed.every(isString)) return [];

	return parsed;
}

runPlugin();
