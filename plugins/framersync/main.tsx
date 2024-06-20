import "framer-plugin/framer.css";

import { framer, Collection, CollectionField } from "framer-plugin";
import React from "react";
import ReactDOM from "react-dom/client";
import { HomePage } from "./App.tsx";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PageStack } from "@shared/PageStack";
import Notion from "./integrations/notion/Notion.tsx";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

const collection = await framer.getCollection();

let showUI = false;
let pageComponent: any = HomePage;
let context: any = null;

if (framer.mode === "syncCollection") {
	let success = false;

	if (collection) {
		const integrationId = await collection.getPluginData("integrationId");

		switch (integrationId) {
			case "notion":
				context = Notion.createContext();
				pageComponent = Notion.Page;
				break;
		}

		if (context) {
			const isAuthenticated = context.isAuthenticated();

			if (isAuthenticated) {
				await syncCollection(context);
				success = true;
			}
		}
	}

	if (!success) {
		showUI = true;
	}
} else if (framer.mode === "configureCollection") {
	const integrationId = await collection.getPluginData("integrationId");
	switch (integrationId) {
		case "notion":
			context = Notion.createContext();
			pageComponent = Notion.Page;
			break;
	}

	showUI = true;
}

if (showUI) {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<main className="flex flex-col size-full select-none text-color-base">
					<PageStack homePage={pageComponent} homePageProps={{ context }} />
				</main>
			</QueryClientProvider>
		</React.StrictMode>
	);

	framer.showUI({
		title: "FramerSync",
		width: 600,
		height: 500,
	});
} else {
	await framer.closePlugin();
}

///////////////////////////////////////////////////////////////////////

async function syncCollection(context) {
	const fields = context.getFields();
	const items = context.getItems();
	const existingItemIds = await collection.getItemIds();
	const itemIds = items.map((item) => item.id);

	await collection.setFields(fields);
	await collection.addItems(items);

	const itemsToRemove = existingItemIds.filter((itemId) => !itemIds.includes(itemId));
	if (itemsToRemove.length > 0) {
		await collection.removeItems(itemsToRemove);
	}

	await collection.setPluginData("integrationId", context.integrationId);
}


export interface PluginContextNew {
	type: "new";
	collection: Collection;
	isAuthenticated: boolean;
}

export interface PluginContextUpdate {
	type: "update";
	integration: string;
	integrationContext: object;
	collection: Collection;
	collectionFields: CollectionField[];
	lastSyncedTime: string;
	hasChangedFields: boolean;
	disabledFieldIds: string[];
	slugFieldId: string | null;
	isAuthenticated: boolean;
}

export interface PluginContextError {
	type: "error";
	message: string;
	isAuthenticated: false;
}

export type PluginContext = PluginContextNew | PluginContextUpdate | PluginContextError;
