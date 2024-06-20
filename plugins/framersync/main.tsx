import "framer-plugin/framer.css";

import React, { createContext } from "react";
import ReactDOM from "react-dom/client";
import { framer, Collection } from "framer-plugin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { PageStack } from "@shared/PageStack";
import { HomePage } from "./HomePage";
import Notion from "./integrations/notion/Notion.tsx";
import PluginContext from "./PluginContext.js";

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
// const lastSyncedAt = await collection.getPluginData("lastSyncedAt");
// const disabledFieldIds = await collection.getPluginData("disabledFieldIds");
// const slugFieldId = await collection.getPluginData("slugFieldId");

let action = "";

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

if (action == "syncCollection") {
	syncCollection();
} else {
	let page: any = null;
	if (action == "openIntegrationPage") {
		switch (integrationId) {
			case "notion":
				page = <Notion.Page />
				break;
		}
	}

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<PluginContext.Provider
					value={{
						collection,
						integrationId,
						isAuthenticated,
						databaseId,
					}}
				>
					<main className="flex flex-col size-full select-none text-color-base">
						<PageStack homePage={page || <HomePage />} />
					</main>
				</PluginContext.Provider>
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
