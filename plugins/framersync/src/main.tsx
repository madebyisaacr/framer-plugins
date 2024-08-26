import "./globals.css";
import "./App.css";

import { ReactNode, StrictMode, Suspense, useState } from "react";
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

function renderPlugin(context: PluginContext, app: ReactNode) {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	framer.showUI({
		width: 350,
		height: context.isAuthenticated ? 370 : 340,
	});

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

async function getPluginContext(): Promise<PluginContext> {
	const collection = await framer.getManagedCollection();
	const [
		collectionFields,
		integrationId,
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

	const integration = integrations[integrationId];

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
	const [databaseConfig, setDatabaseConfig] = useState(
		context.type === "update" ? { base: context.base, table: context.table } : null
	);

	const integration = integrations[context.integrationId];

	if (!integration) {
		return <div>Invalid integration</div>;
	}

	const synchronizeMutation = integration.useSynchronizeDatabaseMutation(
		context.integrationContext,
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

	if (!databaseConfig) {
		return <SelectDatabasePage onDatabaseSelected={setDatabaseConfig} />;
	}

	return (
		<MapFieldsPage
			pluginContext={context}
			onSubmit={synchronizeMutation.mutate}
			error={synchronizeMutation.error}
			isLoading={synchronizeMutation.isPending}
		/>
	);
}

function App({ context }: AppProps) {
	const [pluginContext, setPluginContext] = useState(context);

	const handleAuthenticated = (authenticatedContext: PluginContext) => {
		setPluginContext(authenticatedContext);
	};

	if (!pluginContext.isAuthenticated) {
		const integration = integrations[pluginContext.integrationId];

		if (!integration) {
			return null;
		}

		const { AuthenticatePage } = integration;
		return <AuthenticatePage context={pluginContext} onAuthenticated={handleAuthenticated} />;
	}

	return <AuthenticatedApp context={pluginContext} />;
}

async function runPlugin() {
	const collection = await framer.getManagedCollection();

	const integrationId = await collection.getPluginData(PluginDataKey.integrationId);
	const integration = integrations[integrationId];

	// TODO: Figure out why pluginContext is set in two places
	let pluginContext: PluginContext;

	if (!integration) {
		pluginContext = {
			type: "new",
			collection,
			isAuthenticated: false,
		};
	} else {
		try {
			if (integration.isAuthenticated() && typeof integration.refreshToken === "function") {
				await integration.refreshToken();
			}

			// Here is the other place where pluginContext is set
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
