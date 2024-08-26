import "./globals.css";
import "./App.css";

import { ReactNode, StrictMode, Suspense, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { CenteredSpinner } from "./components/CenteredSpinner.tsx";
import Airtable from "./airtable/AirtableIntegration";
import Notion from "./notion/NotionIntegration";
import { PluginContext, PluginContextUpdate } from "./general/PluginContext";
import { updateWindowSize } from "./general/PageWindowSizes";

import { framer, CollectionField, CollectionItem } from "framer-plugin";
import { logSyncResult } from "./debug.ts";
import { ErrorBoundaryFallback } from "./components/ErrorBoundaryFallback.tsx";
import { assert, stringToJSON, createObject } from "./utils.ts";
import IntegrationsPage from "./general/IntegrationsPage.jsx";

const PluginDataKey = createObject([
	"integrationId",
	"integrationData",
	"ignoredFieldIds",
	"lastSyncedTime",
	"slugFieldId",
	"databaseName",
]);

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

function renderPlugin(app: ReactNode) {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	updateWindowSize("Integrations");

	ReactDOM.createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<div className="w-full flex flex-col overflow-auto flex-1 select-none">
					<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
						<Suspense fallback={<CenteredSpinner />}>{app}</Suspense>
					</ErrorBoundary>
				</div>
			</QueryClientProvider>
		</StrictMode>
	);
}

async function getPluginContext(selectedIntegrationId: string = ""): Promise<PluginContext> {
	const collection = await framer.getManagedCollection();
	const [
		collectionFields,
		collectionIntegrationId,
		integrationDataJson,
		ignoredFieldIdsJson,
		lastSyncedTime,
		slugFieldId,
		databaseNameValue,
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

	const databaseName = databaseNameValue ?? "[Unknown]";

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

interface AppProps {
	context: PluginContext;
}

function AuthenticatedApp({ context }: AppProps) {
	const [integrationContext, setIntegrationContext] = useState(
		context.type === "update" ? context.integrationContext : null
	);

	const pluginContext = { ...context, integrationContext };
	const integration = integrations[context.integrationId];

	if (!integration) {
		// TODO: Handle this case
		return <div>Invalid integration</div>;
	}

	async function updateCollection(
		fields: CollectionField[],
		collectionItems: CollectionItem[],
		itemsToDelete: string[],
		ignoredFieldIds: string[],
		slugFieldId: string,
		databaseName: string,
	) {
		const collection = await framer.getManagedCollection();

		console.log(fields, collectionItems, itemsToDelete, ignoredFieldIds, slugFieldId, databaseName);

		await collection.setFields(fields);

		await collection.addItems(collectionItems);
		await collection.removeItems(itemsToDelete);

		await Promise.all([
			collection.setPluginData(PluginDataKey.integrationId, context.integrationId),
			collection.setPluginData(PluginDataKey.ignoredFieldIds, JSON.stringify(ignoredFieldIds)),
			collection.setPluginData(
				PluginDataKey.integrationData,
				JSON.stringify(integration.getStoredIntegrationData(integrationContext))
			),
			collection.setPluginData(PluginDataKey.lastSyncedTime, new Date().toISOString()),
			collection.setPluginData(PluginDataKey.slugFieldId, slugFieldId),
			collection.setPluginData(PluginDataKey.databaseName, databaseName),
		]);
	}

	const synchronizeMutation = integration.useSynchronizeDatabaseMutation(
		pluginContext,
		updateCollection,
		{
			onSuccess(result) {
				logSyncResult(result);

				if (result.status === "success") {
					framer.closePlugin("Synchronization successful");
					return;
				}
			},
		}
	);

	const { SelectDatabasePage, MapFieldsPage } = integration;

	if (!integrationContext) {
		return <SelectDatabasePage onDatabaseSelected={setIntegrationContext} />;
	}

	return (
		<MapFieldsPage
			pluginContext={pluginContext}
			onSubmit={synchronizeMutation.mutate}
			error={synchronizeMutation.error}
			isLoading={synchronizeMutation.isPending}
		/>
	);
}

function App({ context }: AppProps) {
	const [pluginContext, setPluginContext] = useState(context);

	const handleAuthenticated = async () => {
		const authenticatedContext = await getPluginContext(pluginContext.integrationId);
		setPluginContext(authenticatedContext);
	};

	const onSelectIntegration = (integrationId: string) => {
		setPluginContext({
			...pluginContext,
			integrationId,
		});
	};

	if (!pluginContext.isAuthenticated) {
		const integration = integrations[pluginContext.integrationId];

		if (!integration) {
			return <IntegrationsPage onSelectIntegration={onSelectIntegration} />;
		}

		const { AuthenticatePage } = integration;
		return <AuthenticatePage context={pluginContext} onAuthenticated={handleAuthenticated} />;
	}

	return <AuthenticatedApp context={pluginContext} />;
}

async function runPlugin() {
	try {
		let pluginContext: PluginContext = await getPluginContext();

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

		renderPlugin(<App context={pluginContext} />);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		// framer.closePlugin("An unexpected error ocurred: " + message, {
		// 	variant: "error",
		// });
	}
}

runPlugin();
