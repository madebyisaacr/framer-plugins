import React, { useState, useRef, useEffect } from "react";

import { AirtablePage } from "./integrations/airtable/Airtable";
import Notion from "./integrations/notion/Notion.tsx";

export function HomePage({ openPage }) {
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
