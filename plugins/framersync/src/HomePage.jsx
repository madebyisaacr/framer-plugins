import React, { useContext } from "react";
import Notion from "@plugin/integrations/notion/Notion.tsx";
import { PageStackContext } from "@shared/PageStack";

export function HomePage() {
	const { openPage } = useContext(PageStackContext);

	return (
		<div className="flex flex-col size-full p-3 pt-0 gap-3 flex-1 overflow-y-auto items-center">
			<div className="flex-1 flex flex-col gap-1.5 w-full items-center justify-center">
				<h1 className="text-2xl font-bold">Welcome to FramerSync</h1>
				<p>Select an app to get started</p>
			</div>
			<div className="grid grid-cols-3 gap-2 w-full">
				<AppButton icon={IntegrationIcons.Airtable} title="Airtable" />
				<AppButton icon={IntegrationIcons.GoogleSheets} title="Google Sheets" />
				<AppButton icon={IntegrationIcons.Notion} title="Notion" onClick={() => openPage(<Notion.Page />)} />
				<AppButton icon={IntegrationIcons.RSS} title="RSS Feed" />
				<AppButton icon={IntegrationIcons.Shopify} title="Shopify" />
			</div>
		</div>
	);
}

///////////////////////////////////////////////////////////////////////

function AppButton({ title, icon, onClick = () => {} }) {
	return (
		<div
			onClick={onClick}
			className="flex flex-col items-center justify-center gap-4 bg-secondary rounded aspect-square text-sm font-semibold cursor-pointer hover:bg-tertiary transition-colors"
		>
			<img src={icon} alt={title} className="size-10 object-contain" />
			{title}
		</div>
	);
}

const IntegrationIcons = {
	Notion: "https://framerusercontent.com/images/VLUo9RYjhXNkOXdxunn6e5yfI.png",
	Airtable: "https://framerusercontent.com/images/ozUsM6fRvrcLkrMeAqSR9qoU.png",
	GoogleSheets: "https://framerusercontent.com/images/d3kOAeGY598PQHNCO0HcAvd510.png?scale-down-to=512",
	RSS: "https://framerusercontent.com/images/RMeHIgA4CrDtVG4gNZUTsiwgQ.png?scale-down-to=512",
	Shopify: "https://framerusercontent.com/images/Ty98YuqU2LLgBp8mOnpPIhfQn5c.png",
};
