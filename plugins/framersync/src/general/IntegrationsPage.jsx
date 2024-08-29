import Window from "./Window";
import { NotionLogo, AirtableLogo, GoogleSheetsLogo } from "../assets/AppIcons";
import Button from "@shared/Button";
import { LicenceKeyPage } from "./LicenceKeyPage";
import { useState } from "react";

export default function IntegrationsPage({ onIntegrationSelected }) {
	const [licenseKeyPageOpen, setLicenseKeyPageOpen] = useState(false);
	const [checkoutPageOpen, setCheckoutPageOpen] = useState(false);

	return licenseKeyPageOpen || checkoutPageOpen ? (
		<LicenceKeyPage
			checkout={checkoutPageOpen}
			closePage={() => {
				setLicenseKeyPageOpen(false);
				setCheckoutPageOpen(false);
			}}
		/>
	) : (
		<Window page="Integrations" className="flex-col p-3 pt-0 gap-2 overflow-y-auto items-center">
			<div className="flex-1 flex-col gap-1 w-full items-center justify-center">
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
			<div className="w-full h-px bg-divider my-1" />
			<Button onClick={() => setLicenseKeyPageOpen(true)}>Activate your License Key</Button>
			<Button primary onClick={() => setCheckoutPageOpen(true)}>
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
			className="flex-col items-center justify-center gap-3 bg-secondary rounded aspect-square font-semibold cursor-pointer hover:bg-tertiary transition-colors"
		>
			{icon}
			{title}
		</div>
	);
}
