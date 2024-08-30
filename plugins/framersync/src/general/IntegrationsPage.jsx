import Window from "./Window";
import { NotionLogo, AirtableLogo, GoogleSheetsLogo } from "../assets/AppIcons";
import Button from "@shared/Button";
import { LicenseKeyPage } from "./LicenceKeyPage";
import { useState } from "react";
import { useLemonSqueezy } from "./LemonSqueezy";
import { Spinner } from "@shared/spinner/Spinner";

export default function IntegrationsPage({ onIntegrationSelected }) {
	const [licenseKeyPageOpen, setLicenseKeyPageOpen] = useState(false);

	const { openCheckout, licenseKeyValid, licenseKeyValidLoading } = useLemonSqueezy();

	const onLicenseKeyButtonClick = () => {
		setLicenseKeyPageOpen(true);
	};

	const onBuyButtonClick = () => {
		openCheckout();
		setTimeout(() => {
			setLicenseKeyPageOpen(true);
		}, 400);
	};

	return licenseKeyPageOpen ? (
		<LicenseKeyPage closePage={() => setLicenseKeyPageOpen(false)} />
	) : (
		<Window page="Integrations" className="flex-col p-3 pt-0 gap-2 overflow-y-auto items-center">
			<div className="flex-1 flex-col gap-1 w-full items-center justify-center">
				<Logo />
				<h1 className="text-xl font-bold mt-2 text-center">Sync your data with the Framer CMS</h1>
				<p>Select an app to connect to your website.</p>
				{licenseKeyValidLoading ? (
					<div className="flex-row items-center justify-center gap-2 text-secondary mt-2">
						<Spinner inline />
						Verifying License Key...
					</div>
				) : (
					licenseKeyValid && (
						<div className="text-secondary flex-row items-center gap-1 mt-2">
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
							License Key Activated
						</div>
					)
				)}
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
			{!licenseKeyValidLoading && !licenseKeyValid && (
				<>
					<div className="w-full h-px bg-divider my-1" />
					<Button onClick={onLicenseKeyButtonClick}>Activate your License Key</Button>
					<Button primary onClick={onBuyButtonClick}>
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
				</>
			)}
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

export function Logo() {
	return (
		<svg
			width="80"
			height="80"
			viewBox="0 0 99 112"
			fill="#09F"
			xmlns="http://www.w3.org/2000/svg"
			strokeWidth="2px"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path
				d="M55.7793 39.8202C56.0593 39.7402 56.3093 39.6202 56.5193 39.4502L55.7793 39.8202Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M76.6794 82.3701C76.6794 88.9801 75.5496 94.3802 73.2996 98.5802C71.5196 101.88 69.0394 104.44 65.8694 106.25C65.5094 106.46 65.1395 106.65 64.7595 106.84L64.6294 106.9C59.0894 109.56 52.6794 109.38 45.3994 106.38H45.3894C43.5194 105.61 41.5994 104.65 39.6194 103.5V108.23C39.6194 108.91 39.4195 109.35 39.0295 109.56L38.9895 109.58C38.8495 109.65 38.6795 109.69 38.4895 109.7C37.7295 109.74 37.0096 109.24 36.3196 108.22L23.4495 89.6801C22.3595 88.1001 21.8096 86.5201 21.8096 84.9501C21.8096 83.7701 22.1195 82.9502 22.7195 82.4802L23.3794 82.1401L23.4395 82.1201L36.3096 78.4401C36.9996 78.2101 37.7195 78.5502 38.4795 79.4602C39.2295 80.3602 39.6094 81.2901 39.6094 82.2401V86.9602C43.6894 89.3102 47.3694 90.3602 50.6694 90.1002C52.4294 89.9602 54.0794 89.4602 55.6194 88.5802C59.1294 86.5802 61.2495 83.1201 61.9695 78.2001C62.1695 76.9201 62.2595 75.5301 62.2595 74.0501C62.2595 71.4501 61.9295 68.7602 61.2795 65.9802C60.6295 63.2002 59.7196 60.4502 58.5496 57.7302C57.7996 56.0302 57.4894 54.5001 57.6294 53.1201C57.7194 52.1701 58.0196 51.4902 58.5396 51.0802C58.6396 50.9902 58.7594 50.9102 58.8794 50.8402L58.9795 50.7901C59.0995 50.7301 59.2394 50.6801 59.3794 50.6401L59.4595 50.6201L62.8794 49.7102C64.1094 49.3202 65.4895 49.7002 66.9995 50.8502C68.5095 52.0002 69.7094 53.5402 70.5994 55.4702C72.5194 59.9702 74.0093 64.4901 75.0793 69.0401C75.7893 72.0901 76.2595 75.0901 76.4895 78.0301C76.6095 79.4901 76.6694 80.9401 76.6694 82.3701H76.6794Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M57.4297 36.99C57.4297 38.16 57.1298 38.9801 56.5198 39.4501L55.7798 39.8201L42.9097 43.5C42.2297 43.73 41.5098 43.3901 40.7498 42.4801C39.9998 41.5801 39.6196 40.6501 39.6196 39.7001V34.9801C38.8196 34.5201 38.0298 34.1 37.2598 33.74C32.0098 31.28 27.4696 31.16 23.6096 33.36C23.3096 33.53 23.0097 33.7201 22.7297 33.9101C18.8897 36.5501 16.9697 41.22 16.9697 47.89C16.9697 50.49 17.2897 53.1801 17.9497 55.9601C18.5997 58.7401 19.5097 61.4901 20.6697 64.2101C21.4297 65.9101 21.7396 67.4401 21.5996 68.8201C21.4896 69.9401 21.0796 70.6901 20.3796 71.0801C20.2196 71.1801 20.0396 71.2501 19.8496 71.3001L16.3496 72.2301C15.1096 72.6201 13.7397 72.2601 12.2297 71.1501C10.7197 70.0401 9.51964 68.4801 8.62964 66.4701C6.63964 61.9301 5.12961 57.4 4.09961 52.87C3.06961 48.33 2.5498 43.9001 2.5498 39.5701C2.5498 27.7601 6.15962 19.7901 13.3596 15.6901C13.9096 15.3701 14.4798 15.0901 15.0498 14.8501C18.3698 13.3401 21.9997 12.85 25.9297 13.36C30.1397 13.91 34.6996 15.6001 39.6196 18.4401V13.7101C39.6196 12.7701 39.9998 12.28 40.7498 12.24C41.5098 12.2 42.2297 12.7001 42.9097 13.7201L48.5498 21.8401L55.7798 32.26C56.8798 33.84 57.4297 35.42 57.4297 36.99Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M59.8799 2.6803L60.75 2.24023C60.36 2.26023 60.0599 2.4103 59.8799 2.6803Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M96.6802 72.3701C96.6802 84.1801 93.0801 92.1501 85.8701 96.2501L85.3003 96.5401L84.3901 97.0001L84.2302 97.0701L64.7603 106.84C65.1403 106.65 65.5101 106.46 65.8701 106.25C69.0401 104.44 71.5203 101.88 73.3003 98.5802C75.5503 94.3802 76.6802 88.9801 76.6802 82.3701C76.6802 80.9401 76.6202 79.4901 76.5002 78.0301C76.2702 75.0901 75.8001 72.0901 75.0901 69.0401C74.0201 64.4901 72.5301 59.9702 70.6101 55.4702C69.7201 53.5402 68.5203 52.0002 67.0103 50.8502C65.5003 49.7002 64.1201 49.3202 62.8901 49.7102L59.4702 50.6201L59.3901 50.6401C59.2501 50.6801 59.1102 50.7301 58.9902 50.7901L78.8801 40.8402C79.0301 40.7602 79.2001 40.6901 79.3901 40.6401L82.8901 39.7102C84.1201 39.3202 85.5003 39.7002 87.0103 40.8502C88.5203 42.0002 89.7201 43.5402 90.6101 45.4702C92.5301 49.9702 94.0201 54.4901 95.0901 59.0401C96.1501 63.6001 96.6802 68.0401 96.6802 72.3701Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M61.9792 78.2C61.2592 83.12 59.1392 86.58 55.6292 88.58C54.0892 89.46 52.4392 89.96 50.6792 90.1C47.3792 90.36 43.6991 89.31 39.6191 86.96L46.2092 83.6599L59.6191 76.96C60.4191 77.42 61.2092 77.84 61.9792 78.2Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M59.6191 72.2401V76.9602L46.2092 83.6602L39.6191 86.9602V82.2401C39.6191 81.2901 39.2393 80.3602 38.4893 79.4602C37.7293 78.5502 37.0093 78.2102 36.3193 78.4402L23.4492 82.1201L43.0193 72.2902L43.0791 72.2602C43.1991 72.2002 43.3192 72.1601 43.4492 72.1201L56.3193 68.4402C57.0093 68.2102 57.7293 68.5502 58.4893 69.4602C59.2393 70.3602 59.6191 71.2901 59.6191 72.2401Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M41.5996 58.82C41.4896 59.95 41.0796 60.7 40.3696 61.09L40.1897 61.18L20.3796 71.08C21.0796 70.69 21.4896 69.94 21.5996 68.82C21.7396 67.44 21.4297 65.91 20.6697 64.21C19.5097 61.49 18.5997 58.74 17.9497 55.96C17.2897 53.18 16.9697 50.4899 16.9697 47.8899C16.9697 41.2199 18.8897 36.5499 22.7297 33.9099C23.0097 33.7199 23.3096 33.5299 23.6096 33.3599C27.4696 31.1599 32.0098 31.2799 37.2598 33.7399C37.0598 35.0199 36.9697 36.4099 36.9697 37.8899C36.9697 40.4899 37.2897 43.18 37.9497 45.96C38.5997 48.74 39.5097 51.49 40.6697 54.21C41.4297 55.91 41.7396 57.44 41.5996 58.82Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M77.4299 26.99C77.4299 28.57 76.88 29.5101 75.78 29.8201L56.52 39.4501C57.13 38.9801 57.4299 38.16 57.4299 36.99C57.4299 35.42 56.88 33.84 55.78 32.26L48.55 21.8401L42.9099 13.7201C42.2299 12.7001 41.51 12.2 40.75 12.24L53.98 5.62002L59.8799 2.68008L60.75 2.24002C61.51 2.20002 62.2299 2.70012 62.9099 3.72012L75.78 22.26C76.88 23.84 77.4299 25.42 77.4299 26.99Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M53.9797 5.62028L40.7498 12.2403C39.9998 12.2803 39.6196 12.7704 39.6196 13.7104V18.4403C34.6996 15.6003 30.1397 13.9103 25.9297 13.3603C21.9997 12.8503 18.3698 13.3404 15.0498 14.8504L33.3596 5.69034C39.2196 2.35034 46.0897 2.33028 53.9797 5.62028Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M45.3892 106.38L39.0293 109.56C39.4193 109.35 39.6191 108.91 39.6191 108.23V103.5C41.5991 104.65 43.5192 105.61 45.3892 106.38Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M23.4497 82.1201L23.3896 82.1401L22.7297 82.4702L22.7197 82.4802"
				stroke="white"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
