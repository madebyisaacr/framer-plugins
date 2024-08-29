import "./globals.css";
import "./App.css";

import { ReactNode, StrictMode, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { CenteredSpinner } from "./components/CenteredSpinner";
import Airtable from "./airtable/AirtableIntegration";
import Notion from "./notion/NotionIntegration";
import { PluginContext, PluginContextUpdate } from "./general/PluginContext";

import { framer } from "framer-plugin";
import { logSyncResult } from "./debug";
import { ErrorBoundaryFallback } from "./components/ErrorBoundaryFallback";
import { assert, jsonStringToArray } from "./utils";
import IntegrationsPage from "./general/IntegrationsPage";
import { PluginDataKey } from "./general/updateCollection";
import { PluginContextProvider, usePluginContext } from "./general/PluginContext";
import CanvasPage from "./general/CanvasPage";

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

	if (!pluginContext.integrationId) return false;
	if (!pluginContext.integrationContext) return false;
	if (!pluginContext.slugFieldId) return false;
	if (pluginContext.hasChangedFields) return false;

	return true;
}

function renderPlugin(app: ReactNode) {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	ReactDOM.createRoot(root).render(<StrictMode>{app}</StrictMode>);
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

	if (isAuthenticated && typeof integration.refreshToken === "function") {
		await integration.refreshToken();
	}

	try {
		const ignoredFieldIds = jsonStringToArray(ignoredFieldIdsJson);
		const integrationData = JSON.parse(integrationDataJson);
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

		const hasChangedFields = integration.hasFieldConfigurationChanged(
			collectionFields,
			integrationContext,
			ignoredFieldIds
		);

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
			hasChangedFields,
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
		return null;
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

	const integration = integrations[pluginContext.integrationId];

	if (!integration) {
		return <IntegrationsPage />;
	} else if (!pluginContext.isAuthenticated) {
		const { AuthenticatePage } = integration;
		return <AuthenticatePage onAuthenticated={handleAuthenticated} />;
	}

	return <AuthenticatedApp />;
}

async function runPlugin() {
	if (framer.mode === "canvas") {
		framer.showUI({
			width: 500,
			height: 500,
			position: "center",
			resizable: false,
		});

		renderPlugin(<CanvasPage />);
		return;
	}

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

		if (framer.mode === "syncManagedCollection" && shouldSyncImmediately(pluginContext)) {
			assert(pluginContext.slugFieldId);

			const result = await integration.synchronizeDatabase(pluginContext);

			logSyncResult(result);

			await framer.closePlugin();
			return;
		}

		renderPlugin(
			<QueryClientProvider client={queryClient}>
				<div className="flex flex-col items-center size-full justify-center overflow-hidden select-none">
					<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
						<PluginContextProvider initialContext={pluginContext}>
							<Suspense fallback={<CenteredSpinner />}>{<App />}</Suspense>
						</PluginContextProvider>
					</ErrorBoundary>
				</div>
			</QueryClientProvider>
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		// framer.closePlugin("An unexpected error ocurred: " + message, {
		// 	variant: "error",
		// });
	}
}

runPlugin();
