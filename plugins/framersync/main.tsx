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

const collection = await framer.getCollection();

const integrationId = await collection.getPluginData("integrationId");
const isAuthenticated = await collection.getPluginData("isAuthenticated");
const databaseId = await collection.getPluginData("databaseId");
const lastSyncedAt = await collection.getPluginData("lastSyncedAt");
const disabledFieldIds = await collection.getPluginData("disabledFieldIds");
const slugFieldId = await collection.getPluginData("slugFieldId");
const collectionFields = await collection.getFields();

let action = "";

const dataKeys = await collection.getPluginDataKeys()
if (dataKeys.length) {
	for (const key of dataKeys) {
		console.log(key, await collection.getPluginData(key));
	}
} else {
	console.log("No data keys found");
}

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

if (action == "syncCollection") {
	syncCollection();
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
				<PluginContextProvider
					value={{
						type: databaseId ? "update" : "new",
						collection,
						integrationId,
						isAuthenticated,
						databaseId,
						lastSyncedAt,
						disabledFieldIds,
						slugFieldId,
						collectionFields,
						integrationData: {},
					}}
				>
					<main className="flex flex-col size-full select-none text-color-base">
						<PageStack homePage={page || <HomePage />} />
					</main>
				</PluginContextProvider>
			</QueryClientProvider>
		</React.StrictMode>
	);

	framer.showUI({
		title: "FramerSync",
		width: 600,
		height: 500,
	});
}

function syncCollection() {}
