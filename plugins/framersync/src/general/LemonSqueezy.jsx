import { useEffect, useContext, createContext } from "react";
import { framer } from "framer-plugin";

const checkoutURL = "https://store.framestack.co/buy/24b67220-4e17-478b-9a4a-9cbf0e2db171";

export const LemonSqueezyContext = createContext();

export function useLemonSqueezy() {
	return useContext(LemonSqueezyContext);
}

export function LemonSqueezyProvider({ children }) {
	function openCheckout() {
		window.open(checkoutURL, "_blank");
	}

	async function validateLicenseKey() {
		const licenseKey = await framer.getPluginData("lemonSqueezyLicenseKey");
		const instanceId = await framer.getPluginData("lemonSqueezyInstanceId");

		if (!licenseKey || !instanceId) return false;

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

		if (!data.valid) {
			await framer.setPluginData("lemonSqueezyLicenseKey", null);
			await framer.setPluginData("lemonSqueezyInstanceId", null);
		}

		return data.valid;
	}

	async function activateLicenseKey(licenseKey) {
		const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/activate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				license_key: licenseKey,
			}),
		});

		const data = await response.json();

		if (data.activated) {
			await framer.setPluginData("lemonSqueezyLicenseKey", licenseKey);
			await framer.setPluginData("lemonSqueezyInstanceId", data.instance.id);
		}

		return data.activated;
	}

	return (
		<LemonSqueezyContext.Provider value={{ openCheckout, validateLicenseKey, activateLicenseKey }}>
			{children}
		</LemonSqueezyContext.Provider>
	);
}
