import Window from "./Window";
import { usePluginContext } from "./PluginContext";
import { NotionLogo, AirtableLogo, GoogleSheetsLogo } from "../assets/AppIcons";

export default function IntegrationsPage() {
	const { updatePluginContext } = usePluginContext();

	function onIntegrationClick(integrationId) {
		updatePluginContext({ integrationId });
	}

	return (
		<Window
			page="Integrations"
			className="flex flex-col p-3 pt-0 gap-3 overflow-y-auto items-center"
		>
			<div className="flex-1 flex flex-col gap-1 w-full items-center justify-center">
				<h1 className="text-xl font-bold">Welcome to FramerSync!</h1>
				<p>Select an app to connect to your website.</p>
			</div>
			<div className="grid grid-cols-3 gap-2 w-full">
				<AppButton
					icon={<NotionLogo size={45} />}
					title="Notion"
					onClick={() => onIntegrationClick("notion")}
				/>
				<AppButton
					icon={<AirtableLogo size={45} />}
					title="Airtable"
					onClick={() => onIntegrationClick("airtable")}
				/>
				<AppButton
					icon={<GoogleSheetsLogo size={45} />}
					title="Google Sheets"
					onClick={() => onIntegrationClick("google-sheets")}
				/>
			</div>
		</Window>
	);
}

///////////////////////////////////////////////////////////////////////

function AppButton({ title, icon, onClick }) {
	return (
		<div
			onClick={onClick}
			className="flex flex-col items-center justify-center gap-3 bg-secondary rounded aspect-square font-semibold cursor-pointer hover:bg-tertiary transition-colors"
		>
			{icon}
			{title}
		</div>
	);
}
