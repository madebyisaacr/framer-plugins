import { framer } from "framer-plugin";
import React, { useState, useRef, useEffect } from "react";
import "./App.css";

import { PageStack } from "@shared/PageStack";
import { AirtablePage } from "./integrations/airtable/Airtable";
import Notion from "./integrations/notion/Notion.tsx";

const collection = await framer.getCollection();

if (framer.mode === "syncCollection") {
	let pageToOpen = null
	
	if (collection) {
		const integrationType = await collection.getPluginData("integration");

		let context: any = null;

		switch (integrationType) {
			case "notion":
				context = Notion.createContext();
				break;
		}

		if (!integrationType || !context) {
			pageToOpen = AppsPage;
		}

		if (context) {
			const isAuthenticated = context.isAuthenticated();

			if (isAuthenticated) {
				await syncCollection(context);
			} else {
				pageToOpen = Notion.Page
			}
		}

		if (pageToOpen) {

		}
	}

	await framer.closePlugin();
} else if (framer.mode === "configureCollection") {
	framer.showUI({
		title: "FramerSync",
		width: 600,
		height: 500,
	});
}

function InitialPage(page) {
	return (
		<main className="flex flex-col size-full select-none text-color-base">
			<PageStack homePage={page} />
		</main>
	);
}

export function App() {
	return <InitialPage page={AppsPage} />;
}

function AppsPage({ openPage }) {
	function openIntegrationPage(integration) {
		const context = integration.createContext();

		openPage(integration.Page, { context });
	}

	return (
		<div className="flex flex-col size-full p-3 pt-0 gap-3 flex-1 overflow-y-auto hide-scrollbar items-center">
			<div className="flex-1 flex flex-col gap-1 w-full items-center justify-center">
				<h1 className="text-xl font-bold">Welcome to FramerSync</h1>
				<p>Select an app to get started</p>
			</div>
			<div className="grid grid-cols-3 gap-2 w-full">
				<AppButton title="Airtable" onClick={() => openPage(AirtablePage)} />
				<AppButton title="Google Sheets" />
				<AppButton title="Notion" onClick={() => openIntegrationPage(Notion)} />
				<AppButton title="RSS Feed" />
				<AppButton title="Shopify" />
			</div>
		</div>
	);
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
}

function AppButton({ title, onClick = () => {} }) {
	return (
		<div
			onClick={onClick}
			className="flex flex-col items-center justify-center gap-2 bg-bg-secondary rounded aspect-square text-sm font-semibold cursor-pointer"
		>
			{title}
		</div>
	);
}
