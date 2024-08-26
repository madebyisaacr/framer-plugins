import "./globals.css";
import "./App.css";

import { ReactNode, StrictMode, Suspense, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { CenteredSpinner } from "./components/CenteredSpinner";
import Airtable from "./airtable/AirtableIntegration";
import Notion from "./notion/NotionIntegration";
import { PluginContext, PluginContextUpdate } from "./general/PluginContext";
import { updateWindowSize } from "./general/PageWindowSizes";

import { framer } from "framer-plugin";
import { logSyncResult } from "./debug";
import { ErrorBoundaryFallback } from "./components/ErrorBoundaryFallback";
import { assert, stringToJSON } from "./utils";
import IntegrationsPage from "./general/IntegrationsPage";
import { PluginDataKey } from "./general/updateCollection";
import { PluginContextProvider, usePluginContext } from "./general/PluginContext";

const integrations = {
	notion: Notion,
	airtable: Airtable,
};

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

function renderPlugin(app: ReactNode, initialContext: PluginContext) {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	updateWindowSize("Integrations");

	ReactDOM.createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<div className="w-full flex flex-col overflow-auto flex-1 select-none">
					<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
						<PluginContextProvider initialContext={initialContext}>
							<Suspense fallback={<CenteredSpinner />}>{app}</Suspense>
						</PluginContextProvider>
					</ErrorBoundary>
				</div>
			</QueryClientProvider>
		</StrictMode>
	);
}

async function createPluginContext(selectedIntegrationId: string = ""): Promise<PluginContext> {
	const collection = await framer.getManagedCollection();
	const [
		collectionFields,
		collectionIntegrationId,
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

	const integrationId = collectionIntegrationId ?? selectedIntegrationId;
	const integration = integrations[integrationId];

	if (!integration) {
		return {
			type: "new",
			collection,
			isAuthenticated: false,
			integrationId: null,
		};
	}

	const isAuthenticated = integration.isAuthenticated();

	if (!integrationDataJson) {
		return {
			type: "new",
			collection,
			isAuthenticated,
			integrationId,
		};
	}

	try {
		const ignoredFieldIds = stringToJSON(ignoredFieldIdsJson);
		const integrationData = stringToJSON(integrationDataJson);
		const integrationContext = await integration.getIntegrationContext(
			integrationData,
			databaseName
		);

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

function AuthenticatedApp() {
	const { pluginContext } = usePluginContext();

	const integration = integrations[pluginContext.integrationId];

	if (!integration) {
		// TODO: Handle this case
		return <div>Invalid integration</div>;
	}

	const synchronizeMutation = integration.useSynchronizeDatabaseMutation(pluginContext, {
		onSuccess(result) {
			logSyncResult(result);

			if (result.status === "success") {
				framer.closePlugin("Synchronization successful");
				return;
			}
		},
	});

	const { SelectDatabasePage, MapFieldsPage } = integration;

	if (!pluginContext.integrationContext) {
		return <SelectDatabasePage />;
	}

	return (
		<MapFieldsPage
			onSubmit={synchronizeMutation.mutate}
			error={synchronizeMutation.error}
			isLoading={synchronizeMutation.isPending}
		/>
	);
}

function App() {
	const { pluginContext, updatePluginContext } = usePluginContext();

	const handleAuthenticated = async () => {
		const authenticatedContext = await createPluginContext(pluginContext.integrationId);
		updatePluginContext(authenticatedContext);
	};

	if (!pluginContext.isAuthenticated) {
		const integration = integrations[pluginContext.integrationId];

		if (!integration) {
			return <IntegrationsPage />;
		}

		const { AuthenticatePage } = integration;
		return <AuthenticatePage onAuthenticated={handleAuthenticated} />;
	}

	return <AuthenticatedApp />;
}

async function runPlugin() {
	try {
		let pluginContext: PluginContext = await createPluginContext();

		const collection = await framer.getManagedCollection();
		const integration = integrations[pluginContext.integrationId];

		if (!integration) {
			pluginContext = {
				type: "new",
				collection,
				isAuthenticated: false,
			};
		}

		if (pluginContext.isAuthenticated && typeof integration.refreshToken === "function") {
			await integration.refreshToken();
		}

		if (framer.mode === "syncManagedCollection" && shouldSyncImmediately(pluginContext)) {
			assert(pluginContext.slugFieldId);

			const result = await integration.synchronizeDatabase(pluginContext.integrationContext);

			logSyncResult(result);

			await framer.closePlugin();
			return;
		}

		renderPlugin(<App />, pluginContext);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		// framer.closePlugin("An unexpected error ocurred: " + message, {
		// 	variant: "error",
		// });
	}
}

runPlugin();
