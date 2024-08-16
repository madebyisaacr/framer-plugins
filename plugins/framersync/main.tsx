import "framer-plugin/framer.css";

import React, { createContext } from "react";
import ReactDOM from "react-dom/client";
import { framer, Collection } from "framer-plugin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { PageStack } from "@shared/PageStack";
import { HomePage } from "./src/HomePage";
import Notion from "./integrations/notion/Notion.tsx";
import { PluginContextProvider } from "./src/PluginContext";
import { pluginDataKeys } from "./src/shared";

const integrations = [Notion];

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

const collection = await framer.getManagedCollection();

const integrationId = await collection.getPluginData(pluginDataKeys.integrationId);
const isAuthenticated = await collection.getPluginData(pluginDataKeys.isAuthenticated);
const databaseId = await collection.getPluginData(pluginDataKeys.databaseId);
const lastSyncedTime = await collection.getPluginData(pluginDataKeys.lastSyncedTime);
const disabledFieldIds = JSON.parse((await collection.getPluginData(pluginDataKeys.disabledFieldIds)) || "[]");
const slugFieldId = await collection.getPluginData(pluginDataKeys.slugFieldId);
const collectionFields = await collection.getFields();

let action = "";

// const dataKeys = await collection.getPluginDataKeys();
// if (dataKeys.length) {
// 	for (const key of dataKeys) {
// 		console.log(key, await collection.getPluginData(key));
// 	}
// } else {
// 	console.log("No data keys found");
// }

if (!integrationId) {
	action = "openHomePage";
} else if (!isAuthenticated) {
	action = "openIntegrationPage";
} else {
	if (framer.mode === "syncCollection") {
		action = "syncCollection";
	} else if (framer.mode === "configureCollection") {
		action = "openIntegrationPage";
	}
}

const integration = integrations.find((integration) => integration.id === integrationId);

const pluginContext = {
	type: databaseId ? "update" : "new",
	collection,
	[pluginDataKeys.integrationId]: integrationId,
	[pluginDataKeys.isAuthenticated]: isAuthenticated,
	[pluginDataKeys.databaseId]: databaseId,
	[pluginDataKeys.lastSyncedTime]: lastSyncedTime,
	[pluginDataKeys.disabledFieldIds]: disabledFieldIds,
	[pluginDataKeys.slugFieldId]: slugFieldId,
	originalFields: collectionFields,
	fields: collectionFields,
	integrationData: {},
};

if (action == "syncCollection") {
	if (integration) {
		await integration.initialize(pluginContext);
		await integration.syncCollection(pluginContext);
	}
} else {
	let page: any = null;
	if (action == "openIntegrationPage") {
		const PageComponent = integration?.Page;
		if (PageComponent) {
			page = <PageComponent />;
		}
	}

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<PluginContextProvider value={pluginContext}>
					<main className="flex flex-col size-full select-none text-primary">
						<PageStack homePage={page || <HomePage />} />
					</main>
				</PluginContextProvider>
			</QueryClientProvider>
		</React.StrictMode>
	);

	framer.showUI({
		title: "FramerSync",
		width: 750,
		height: 550,
	});
}
