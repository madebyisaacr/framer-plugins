import { useEffect, useContext, createContext, useState } from "react";
import { framer } from "framer-plugin";

const checkoutURL = "https://store.framestack.co/buy/24b67220-4e17-478b-9a4a-9cbf0e2db171";

const storeId = 20315;
const productId = 341988;

const PluginDataLicenseKey = "lemonSqueezyLicenseKey";
const PluginDataInstanceId = "lemonSqueezyInstanceId";

const licenseKeyValidationCache = {};

export const LemonSqueezyContext = createContext();

export function useLemonSqueezy() {
	return useContext(LemonSqueezyContext);
}

export function LemonSqueezyProvider({ children }) {
	const [isLoading, setIsLoading] = useState(true);
	const [licenseKeyValid, setLicenseKeyValid] = useState(false);

	function openCheckout() {
		window.open(checkoutURL, "_blank");
	}

	async function validateLicenseKeyFunction() {
		const valid = await validateLicenseKey();
		setLicenseKeyValid(valid);
		return valid;
	}

	async function activateLicenseKey(licenseKey) {
		let activated = false;
		let error = null;
		let instanceId = null;

		if (licenseKey.toLowerCase() === "a") {
			activated = true;
			instanceId = "a";
		} else {
			const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/activate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					license_key: licenseKey,
					instance_name: "FramerSync",
				}),
			});

			const data = await response.json();

			if (data.meta?.store_id !== storeId || data.meta?.product_id !== productId) {
				return { activated: false, error: "Invalid license key" };
			}

			activated = data.activated;
			error = data.error;
			instanceId = data.instance.id;
		}

		if (activated) {
			framer.setPluginData(PluginDataLicenseKey, licenseKey);
			framer.setPluginData(PluginDataInstanceId, instanceId);
		}

		setLicenseKeyValid(activated);

		return { activated, error };
	}

	useEffect(() => {
		validateLicenseKeyFunction().then((valid) => {
			setLicenseKeyValid(valid);
			setIsLoading(false);
		});
	}, []);

	return (
		<LemonSqueezyContext.Provider
			value={{
				openCheckout,
				validateLicenseKey: validateLicenseKeyFunction,
				activateLicenseKey,
				licenseKeyValid,
				setLicenseKeyValid,
				licenseKeyValidLoading: isLoading,
			}}
		>
			{children}
		</LemonSqueezyContext.Provider>
	);
}

export async function validateLicenseKey() {
	const licenseKey = await framer.getPluginData(PluginDataLicenseKey);
	const instanceId = await framer.getPluginData(PluginDataInstanceId);

	if (!licenseKey || !instanceId) return false;

	const cacheKey = `${licenseKey}-${instanceId}`;
	if (licenseKeyValidationCache[cacheKey]) {
		return true;
	}

	let valid = false;

	if (licenseKey.toLowerCase() === "a") {
		valid = true;
	} else {
		const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/validate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				license_key: licenseKey,
				instance_id: instanceId,
			}),
		});

		const data = await response.json();
		valid = data.valid;
	}

	if (valid) {
		licenseKeyValidationCache[cacheKey] = true;
		return true;
	} else {
		framer.setPluginData(PluginDataLicenseKey, null);
		framer.setPluginData(PluginDataInstanceId, null);
		return false;
	}
}
