import "framer-plugin/framer.css";

import { framer } from "framer-plugin";
import React from "react";
import ReactDOM from "react-dom/client";
import { HomePage } from "./App.tsx";
import "./App.css";

import { PageStack } from "@shared/PageStack";
import Notion from "./integrations/notion/Notion.tsx";

const collection = await framer.getCollection();

let showUI = false;
let pageComponent: any = HomePage
let context: any = null

if (framer.mode === "syncCollection") {
	let success = false

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
			<main className="flex flex-col size-full select-none text-color-base">
				<PageStack homePage={pageComponent} homePageProps={{ context }} />
			</main>
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
