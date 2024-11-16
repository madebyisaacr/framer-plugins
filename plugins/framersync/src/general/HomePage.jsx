import Window from "./Window";
import { Logo } from "../assets/AppIcons";
import Button from "@shared/Button";
import { LicenseKeyPage } from "./LicenceKeyPage";
import { useState } from "react";
import { useLicense, CHECKOUT_URL } from "./License";
import classNames from "classnames";
import ArrowRightIcon from "../assets/ArrowRightIcon";

export default function IntegrationsPage({ onIntegrationSelected }) {
	const [licenseKeyPageOpen, setLicenseKeyPageOpen] = useState(false);

	const { licenseKeyValid, licenseKeyValidLoading } = useLicense();

	const onLicenseKeyButtonClick = () => {
		setLicenseKeyPageOpen(true);
	};

	const onBuyButtonClick = () => {
		setTimeout(() => {
			setLicenseKeyPageOpen(true);
		}, 400);
	};

	return licenseKeyPageOpen ? (
		<LicenseKeyPage closePage={() => setLicenseKeyPageOpen(false)} />
	) : (
		<Window page="Integrations" className="flex-col p-3 pt-0 gap-2 overflow-y-auto items-center">
			<div className="flex-col gap-1 px-2 flex-1 items-center justify-center relative text-center text-balance">
				<img src="/icon.svg" className="size-10 rounded-lg" />
				<h1 className="text-lg font-bold mt-3">Sync your content with the Framer CMS</h1>
				<p>
					FramerSync connects other apps with Framer so you can focus on building your website, not
					managing data between apps.
				</p>
				<div
					className={classNames(
						"text-tertiary flex-row items-center gap-1 mt-2 transition-opacity",
						licenseKeyValid ? "opacity-100" : "opacity-0",
						!licenseKeyValid && !licenseKeyValidLoading && "!hidden"
					)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M5 12l5 5l10 -10" />
					</svg>
					License Activated
				</div>
			</div>
			<p className="mb-1">Select an app to get started:</p>
			<div className="grid grid-cols-3 gap-2 w-full">
				<AppButton iconId="notion" title="Notion" onClick={() => onIntegrationSelected("notion")} />
				<AppButton
					iconId="airtable"
					title="Airtable"
					onClick={() => onIntegrationSelected("airtable")}
				/>
				<AppButton
					iconId="google-sheets"
					title="Google Sheets"
					onClick={() => onIntegrationSelected("google-sheets")}
				/>
				{/* <AppButton iconId="rss" title="RSS Feeds" onClick={() => onIntegrationSelected("rss")} /> */}
			</div>
			{!licenseKeyValidLoading && !licenseKeyValid && (
				<>
					<div className="w-full h-px bg-divider" />
					<div className="flex-row gap-2 w-full">
						<Button className="flex-1" onClick={onLicenseKeyButtonClick}>
							Activate a License Key
						</Button>
						<Button className="flex-1" primary onClick={onBuyButtonClick} href={CHECKOUT_URL}>
							Buy Now
							<ArrowRightIcon />
						</Button>
					</div>
				</>
			)}
		</Window>
	);
}

///////////////////////////////////////////////////////////////////////

function AppButton({ title, iconId, onClick }) {
	return (
		<div
			onClick={onClick}
			className="flex-col items-center justify-center gap-3 bg-secondary rounded aspect-square font-semibold cursor-pointer hover:bg-tertiary transition-colors"
		>
			<Logo id={iconId} size={40} shadow />
			{title}
		</div>
	);
}
