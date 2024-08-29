import Window from "./Window";
import { NotionLogo, AirtableLogo, GoogleSheetsLogo } from "../assets/AppIcons";
import Button from "@shared/Button";

export default function IntegrationsPage({ onIntegrationSelected }) {
	return (
		<Window
			page="Integrations"
			className="flex flex-col p-3 pt-0 gap-2 overflow-y-auto items-center"
		>
			<div className="flex-1 flex flex-col gap-1 w-full items-center justify-center">
				<h1 className="text-xl font-bold">Welcome to FramerSync!</h1>
				<p>Select an app to connect to your website.</p>
			</div>
			<div className="grid grid-cols-3 gap-2 w-full">
				<AppButton
					icon={<NotionLogo size={45} />}
					title="Notion"
					onClick={() => onIntegrationSelected("notion")}
				/>
				<AppButton
					icon={<AirtableLogo size={45} />}
					title="Airtable"
					onClick={() => onIntegrationSelected("airtable")}
				/>
				<AppButton
					icon={<GoogleSheetsLogo size={45} />}
					title="Google Sheets"
					onClick={() => onIntegrationSelected("google-sheets")}
				/>
			</div>
			<Button>Activate your License Key</Button>
			<Button primary>
				Get a License Key
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="-ml-0.5"
				>
					<path d="M5 12l14 0" />
					<path d="M13 18l6 -6" />
					<path d="M13 6l6 6" />
				</svg>
			</Button>
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
