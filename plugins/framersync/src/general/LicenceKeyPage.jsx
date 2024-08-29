import Window from "./Window";
import Button from "@shared/Button";
import BackButton from "../components/BackButton";
import { useState, useEffect } from "react";
import { useLemonSqueezy } from "./LemonSqueezy";

export function LicenseKeyPage({ closePage, checkout }) {
	return (
		<Window page="LicenceKey" className="flex-col">
			<BackButton onClick={closePage} />
			<LicenseKeyMenu closePage={closePage} checkout={checkout} />
		</Window>
	);
}

export function LicenseKeyMenu({ checkout }) {
	const [licenseKey, setLicenseKey] = useState("");
	const [isActivating, setIsActivating] = useState(false);
	const [isValidated, setIsValidated] = useState(false);
	const [error, setError] = useState(null);

	const { openCheckout, activateLicenseKey } = useLemonSqueezy();

	useEffect(() => {
		if (checkout) {
			openCheckout();
		}
	}, [checkout]);

	const onBuyButtonClick = () => {
		openCheckout();
	};

	async function onSubmitLicenseKey() {
		if (isValidated) {
			return;
		}

		if (!licenseKey.length) {
			setError("Please enter a license key.");
			return;
		}

		setIsActivating(true);
		setError(null);
		setIsValidated(false);

		try {
			const activated = await activateLicenseKey(licenseKey);
			if (activated) {
				setIsValidated(true);
				setLicenseKey("");
			} else {
				setError("The license key is not valid.");
			}
		} catch (error) {
			setError(error.message || "An error occurred while activating the license key.");
		} finally {
			setIsActivating(false);
		}
	}

	return (
		<div className="flex-col justify-center px-3 pb-3 gap-2 flex-1 w-full">
			<div className="flex-col gap-2 flex-1 items-center justify-center w-full">
				<KeyIcon />
				<h1 className="font-bold text-base">Activate your Licence Key</h1>
				<p className="text-center px-3 text-balance mb-2">
					If you have a FramerSync license, you can find your licence key in your order confirmation
					email or on the{" "}
					<a
						href="https://app.lemonsqueezy.com/my-orders/"
						target="_blank"
						className="text-tint dark:text-primary font-semibold hover:underline"
					>
						order page
					</a>
					.
				</p>
				<input
					type="text"
					className="w-full"
					placeholder="Licence Key"
					value={licenseKey}
					autoFocus
					onChange={(e) => setLicenseKey(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							onSubmitLicenseKey();
						}
					}}
					disabled={isValidated}
				/>
				<Button primary onClick={onSubmitLicenseKey} className="w-full" loading={isActivating}>
					{isValidated ? "Activated License Key!" : "Activate License Key"}
				</Button>
				{error && <p className="text-error text-center">{error}</p>}
			</div>
			<div className="flex-col gap-1 bg-secondary rounded p-3 text-secondary">
				<span className="font-semibold text-primary">
					Don't have a licence yet? Get lifetime access to FramerSync for $49
				</span>
				<ul className="list-disc pl-3 flex flex-col gap-1">
					<li>One time purchase - buy once, use forever.</li>
					<li>Includes all future updates.</li>
					<li>One license key unlocks syncing unlimited collections in a single Framer project.</li>
					<li>Connect Notion, Airtable, and Google Sheets.</li>
				</ul>
			</div>
			<Button onClick={onBuyButtonClick} className="w-full">
				Get a Licence Key
			</Button>
		</div>
	);
}

function KeyIcon() {
	return (
		<svg
			width="80"
			height="80"
			viewBox="0 0 124 102"
			fill="#09F"
			xmlns="http://www.w3.org/2000/svg"
			strokeWidth="2px"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path
				d="M101.51 86.2101C101.28 85.5101 100.98 84.8301 100.59 84.1701L95.8998 76.11C95.6198 75.64 95.3298 75.2101 95.0098 74.8101C94.7998 74.5401 94.5798 74.29 94.3498 74.05C93.7798 73.46 93.1898 72.9901 92.5798 72.6401L78.3699 64.48L76.0998 63.18L60.2498 54.07L56.2298 51.7601C54.3898 44.7801 51.1598 37.9501 46.5398 31.2801C44.1698 27.8601 41.5899 24.85 38.8099 22.25C36.1699 19.79 33.3498 17.69 30.3498 15.97C28.1598 14.71 26.0698 13.76 24.0698 13.12C19.6898 11.71 15.7699 11.77 12.2999 13.3L10.9398 13.98C5.61981 17.03 2.96986 22.92 2.98986 31.65C3.00986 40.39 5.69985 49.34 11.0398 58.5201C16.3898 67.6901 22.8798 74.47 30.4998 78.84C36.3598 82.21 41.6499 83.3301 46.3699 82.2001C51.0799 81.0701 54.3898 77.91 56.2798 72.72L57.8798 73.6401L63.8398 83.86C64.2998 84.65 64.7898 85.31 65.3298 85.83C65.8598 86.36 66.4298 86.7901 67.0398 87.1401C67.6498 87.4901 68.2198 87.71 68.7598 87.8C69.2898 87.89 69.7799 87.8 70.2399 87.54L76.1699 84.1401L84.1799 95.94C84.6399 96.64 85.1599 97.2601 85.7299 97.8101C86.2999 98.3601 86.8898 98.7601 87.4998 99.0201C88.1098 99.2901 88.6598 99.4101 89.1598 99.3901C89.4698 99.3701 89.7598 99.3001 90.0198 99.1801L90.1699 99.1001C90.2799 99.0401 90.3698 98.98 90.4698 98.9L100.72 91.3101C101.1 91.0101 101.39 90.6001 101.58 90.1001C101.77 89.6001 101.86 89 101.86 88.3C101.86 87.6 101.74 86.9001 101.51 86.2101ZM42.0298 62.5601C41.5098 63.1901 40.8798 63.71 40.1598 64.12C37.4998 65.64 34.2698 65.3101 30.4598 63.1301C26.6498 60.9401 23.4098 57.55 20.7298 52.96C18.0598 48.37 16.7198 43.9 16.7098 39.53C16.6998 35.16 18.0199 32.2201 20.6799 30.6901C21.6299 30.1501 22.6598 29.83 23.7698 29.76C25.7398 29.65 27.9498 30.2901 30.3898 31.6901C34.1998 33.8801 37.4398 37.26 40.0998 41.84H40.1099C40.3299 42.22 40.5298 42.59 40.7298 42.96C40.7398 42.97 40.7398 42.9801 40.7498 42.9901C42.9998 47.1801 44.1298 51.28 44.1398 55.28C44.1498 58.46 43.4398 60.8901 42.0298 62.5601Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M76.2298 41.76L56.2298 51.76C54.3898 44.78 51.1598 37.95 46.5398 31.28C44.1698 27.86 41.5898 24.85 38.8098 22.25C36.1698 19.79 33.3498 17.69 30.3498 15.97C28.1598 14.71 26.0698 13.76 24.0698 13.12C19.6898 11.71 15.7698 11.77 12.2998 13.3L30.9398 3.98003C36.2598 0.930034 42.7298 1.60003 50.3498 5.97003C56.5198 9.52003 61.9198 14.62 66.5398 21.28C71.1598 27.95 74.3898 34.78 76.2298 41.76Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M121.86 78.3C121.86 79 121.77 79.6 121.58 80.1C121.39 80.6 121.1 81.01 120.72 81.31L110.47 88.9C110.35 88.99 110.23 89.07 110.1 89.14L90.17 99.1C90.28 99.04 90.37 98.98 90.47 98.9L100.72 91.31C101.1 91.01 101.39 90.6 101.58 90.1C101.77 89.6 101.86 89 101.86 88.3C101.86 87.6 101.74 86.9 101.51 86.21C101.28 85.51 100.98 84.83 100.59 84.17L95.9 76.11C95.62 75.64 95.3299 75.21 95.0099 74.81C94.7999 74.54 94.58 74.29 94.35 74.05C93.78 73.46 93.19 72.99 92.58 72.64L78.37 64.48L76.1 63.18L60.2499 54.07L56.23 51.76L76.23 41.76L112.58 62.64C113.19 62.99 113.78 63.46 114.35 64.05C114.92 64.64 115.44 65.33 115.9 66.11L120.59 74.17C120.98 74.83 121.28 75.51 121.51 76.21C121.74 76.9 121.86 77.6 121.86 78.3Z"
				stroke="white"
				strokeLinejoin="round"
			/>
			<path
				d="M44.1398 55.28C44.1498 58.46 43.4398 60.89 42.0298 62.56C41.5098 63.19 40.8798 63.71 40.1598 64.12C37.4998 65.64 34.2698 65.31 30.4598 63.13C26.6498 60.94 23.4098 57.55 20.7298 52.96C18.0598 48.37 16.7198 43.9 16.7098 39.53C16.6998 35.16 18.0199 32.22 20.6799 30.69C21.6299 30.15 22.6598 29.83 23.7698 29.76C25.7398 29.65 27.9498 30.29 30.3898 31.69C34.1998 33.88 37.4398 37.26 40.0998 41.84H40.1099C40.3299 42.22 40.5298 42.59 40.7298 42.96C40.7398 42.97 40.7398 42.98 40.7498 42.99C42.9998 47.18 44.1298 51.28 44.1398 55.28Z"
				stroke="white"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
