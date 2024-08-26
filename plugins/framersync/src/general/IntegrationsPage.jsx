import { updateWindowSize } from "./PageWindowSizes";
import { usePluginContext } from "./PluginContext";

export default function IntegrationsPage() {
	const { pluginContext, updatePluginContext } = usePluginContext();

	updateWindowSize("Integrations");

	function onIntegrationClick(integrationId) {
		updatePluginContext({ integrationId });
	}

	return (
		<div className="flex flex-col size-full p-3 pt-0 gap-3 flex-1 overflow-y-auto items-center">
			<div className="flex-1 flex flex-col gap-1 w-full items-center justify-center">
				<h1 className="text-xl font-bold">Welcome to FramerSync</h1>
				<p>Select an app to get started</p>
			</div>
			<div className="grid grid-cols-3 gap-2 w-full">
				<AppButton
					icon={IntegrationIcons.Notion}
					title="Notion"
					onClick={() => onIntegrationClick("notion")}
				/>
				<AppButton
					icon={IntegrationIcons.Airtable}
					title="Airtable"
					onClick={() => onIntegrationClick("airtable")}
				/>
				<AppButton
					icon={IntegrationIcons.GoogleSheets}
					title="Google Sheets"
					onClick={() => onIntegrationClick("google-sheets")}
				/>
			</div>
		</div>
	);
}

///////////////////////////////////////////////////////////////////////

function AppButton({ title, icon, onClick }) {
	return (
		<div
			onClick={onClick}
			className="flex flex-col items-center justify-center gap-3 bg-secondary rounded aspect-square font-semibold cursor-pointer hover:bg-tertiary transition-colors"
		>
			<img src={icon} alt={title} className="size-8 object-contain" />
			{title}
		</div>
	);
}

const IntegrationIcons = {
	Notion: "https://framerusercontent.com/images/VLUo9RYjhXNkOXdxunn6e5yfI.png",
	Airtable: "https://framerusercontent.com/images/ozUsM6fRvrcLkrMeAqSR9qoU.png",
	GoogleSheets:
		"https://framerusercontent.com/images/d3kOAeGY598PQHNCO0HcAvd510.png?scale-down-to=512",
	RSS: "https://framerusercontent.com/images/RMeHIgA4CrDtVG4gNZUTsiwgQ.png?scale-down-to=512",
	Shopify: "https://framerusercontent.com/images/Ty98YuqU2LLgBp8mOnpPIhfQn5c.png",
};
