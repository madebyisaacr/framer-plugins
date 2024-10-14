import Window from "./Window";
import Button from "@shared/Button";
import BackButton from "../components/BackButton";
import { useState, useEffect } from "react";
import { useLemonSqueezy } from "./LemonSqueezy";
import classNames from "classnames";
import ArrowRightIcon from "../assets/ArrowRightIcon";
import { isReview } from "../utils";

export function LicenseKeyPage({ closePage, checkout }) {
	return (
		<Window page="LicenceKey" className="flex-col overflow-y-auto">
			<BackButton onClick={closePage} className="ml-3" />
			<LicenseKeyMenu closePage={closePage} checkout={checkout} className="flex-1" />
		</Window>
	);
}

export function LicenseKeyMenu({
	checkout,
	databaseLabel = "",
	paywall = false,
	className = "",
	onActivated = null,
}) {
	const [licenseKey, setLicenseKey] = useState("");
	const [isActivating, setIsActivating] = useState(false);
	const [isValidated, setIsValidated] = useState(false);
	const [error, setError] = useState(null);

	const [paywallMode, setPaywallMode] = useState(paywall);

	const { openCheckout, activateLicenseKey } = useLemonSqueezy();

	useEffect(() => {
		if (checkout) {
			openCheckout();
		}
	}, [checkout]);

	const onBuyButtonClick = () => {
		openCheckout();
		setTimeout(() => {
			setPaywallMode(false);
		}, 400);
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
			const { activated, error } = await activateLicenseKey(licenseKey);
			if (activated) {
				setIsValidated(true);
				setLicenseKey("");
				onActivated?.();
			} else {
				setError(error || "The license key is not valid.");
			}
		} catch (error) {
			setError(error.message || "An error occurred while activating the license key.");
		} finally {
			setIsActivating(false);
		}
	}

	const activateHeadingText = isValidated ? "Activated License Key!" : "Activate Your License Key";

	let isSubmitButtonDisabled = licenseKey.length != 36;
	if (isReview() && isSubmitButtonDisabled) {
		isSubmitButtonDisabled = licenseKey != "ABC";
	}

	return (
		<div className={classNames("flex-col justify-center px-3 pb-3 gap-2 w-full", className)}>
			<div className="flex-col gap-2 flex-1 py-3 items-center justify-center w-full text-center">
				<KeyIcon />
				{paywallMode ? (
					<>
						<h1 className="font-bold text-base text-balance">
							Upgrade to sync your {databaseLabel} with the Framer CMS
						</h1>
						<p className="text-balance px-3 mb-4">
							Start syncing your {databaseLabel} with your website's CMS today.
						</p>
						<Button primary onClick={onBuyButtonClick} className="w-full">
							Buy Now
							<ArrowRightIcon />
						</Button>
						<FeaturesList paywallMode />
					</>
				) : (
					<>
						<h1 className="font-bold text-base text-balance">{activateHeadingText}</h1>
						<p className="text-balance mb-4">
							{isValidated ? (
								<>
									Success! Your FramerSync license is now connected to this Framer project. You can
									now sync unlimited CMS collections in this project.
								</>
							) : (
								<>
									After checkout you'll receive an email with your licence key. You can also find
									your licence key on the{" "}
									<a
										href="https://app.lemonsqueezy.com/my-orders/"
										target="_blank"
										className="font-semibold hover:underline"
									>
										orders page
									</a>
									.
								</>
							)}
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
							maxLength={36}
						/>
						<Button
							primary
							onClick={onSubmitLicenseKey}
							className="w-full"
							loading={isActivating}
							disabled={isSubmitButtonDisabled}
						>
							{isValidated ? "Success" : "Activate License Key"}
						</Button>
						{error && <p className="text-error text-center text-balance">{error}</p>}
						{/* {isReview() && (
							<p className="text-center">
								Licence key for plugin reviewer: <strong>ABC</strong>
							</p>
						)} */}
					</>
				)}
			</div>
			{paywallMode ? (
				<div className="flex-col gap-2">
					<p className="text-balance text-center">
						Already have a license? Activate it to get started.
					</p>
					<Button onClick={() => setPaywallMode(false)}>Activate License Key</Button>
				</div>
			) : paywall ? (
				<Button onClick={onBuyButtonClick}>Buy FramerSync License</Button>
			) : (
				<>
					<FeaturesList />
					<Button primary onClick={onBuyButtonClick} className="w-full">
						Get a Licence Key
						<ArrowRightIcon />
					</Button>
				</>
			)}
		</div>
	);
}

function KeyIcon() {
	return (
		<svg
			width="60"
			height="60"
			viewBox="0 0 22 22"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="text-accent dark:text-primary"
		>
			<path
				d="M18.8734 9.16683H11.5951C11.1518 7.91149 10.2686 6.85937 9.10897 6.2054C7.94936 5.55144 6.59202 5.33996 5.28843 5.61016C3.18926 6.03183 1.48426 7.7185 1.04426 9.8085C0.866155 10.6126 0.870836 11.4464 1.05796 12.2484C1.24508 13.0504 1.60988 13.8002 2.12543 14.4425C2.64098 15.0847 3.29413 15.603 4.03671 15.9591C4.7793 16.3153 5.59236 16.5002 6.41593 16.5002C7.55254 16.5002 8.66116 16.1475 9.58883 15.4908C10.5165 14.834 11.2175 13.9056 11.5951 12.8335H11.9159L13.0984 14.016C13.4559 14.3735 14.0334 14.3735 14.3909 14.016L15.5826 12.8335L16.7651 14.016C17.1226 14.3735 17.7093 14.3735 18.0668 14.016L20.4409 11.6235C20.5264 11.5377 20.5939 11.4359 20.6398 11.3239C20.6856 11.2118 20.7087 11.0918 20.7079 10.9708C20.707 10.8497 20.6822 10.73 20.6348 10.6186C20.5874 10.5073 20.5184 10.4064 20.4318 10.3218L19.5243 9.43266C19.3409 9.2585 19.1118 9.16683 18.8734 9.16683ZM6.41593 13.7502C4.90343 13.7502 3.66593 12.5127 3.66593 11.0002C3.66593 9.48766 4.90343 8.25016 6.41593 8.25016C7.92843 8.25016 9.16593 9.48766 9.16593 11.0002C9.16593 12.5127 7.92843 13.7502 6.41593 13.7502Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function FeaturesList({ paywallMode = false }) {
	return (
		<div className="flex-col gap-1 bg-secondary rounded p-3 text-secondary text-left">
			<span className="font-semibold text-primary">
				{paywallMode ? "" : "Don't have a licence yet? "}Get lifetime access to FramerSync for $49
			</span>
			<ul className="list-disc flex-col gap-1">
				<ChecklistItem>One time purchase - buy once, use forever.</ChecklistItem>
				<ChecklistItem>Includes all future updates.</ChecklistItem>
				<ChecklistItem>
					Sync unlimted collections in a single Framer project with one license key.
				</ChecklistItem>
				<ChecklistItem>Connect Notion, Airtable, and Google Sheets.</ChecklistItem>
			</ul>
		</div>
	);
}

function ChecklistItem({ children }) {
	return (
		<div className="flex-row items-start gap-1 w-full">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="min-w-3 mt-px"
			>
				<path d="M5 12l5 5l10 -10" />
			</svg>
			{children}
		</div>
	);
}
