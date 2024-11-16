import { useEffect, useContext, createContext, useState } from "react";
import { framer } from "framer-plugin";
import { isReview } from "../utils";

export const CHECKOUT_URL = "https://store.framersync.com/buy/6d6eb4c9-8ea4-462f-b7b3-f2080a4582b3";

const framestackStoreId = 20315;
const framestackProductId = 341988;
const framerSyncStoreId = 134584;
const framerSyncProductId = 393592;

const PluginDataLicenseKey = "lemonSqueezyLicenseKey";
const PluginDataInstanceId = "lemonSqueezyInstanceId";

const licenseKeyValidationCache = {};

export const LicenseContext = createContext();

export function useLicense() {
	return useContext(LicenseContext);
}

export function LemonSqueezyProvider({ children }) {
	const [isLoading, setIsLoading] = useState(true);
	const [licenseKeyValid, setLicenseKeyValid] = useState(false);

	async function validateLicenseKeyFunction() {
		const valid = await validateLicenseKey();
		setLicenseKeyValid(valid);
		return valid;
	}

	async function activateLicenseKey(licenseKey) {
		let activated = false;
		let error = null;
		let instanceId = null;

		if (isTestLicenseKey(licenseKey)) {
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

			const storeId = data.meta?.store_id;
			const productId = data.meta?.product_id;

			if (
				(storeId === framestackStoreId && productId === framestackProductId) ||
				(storeId === framerSyncStoreId && productId === framerSyncProductId)
			) {
				activated = false;
				error = "Invalid license key";
			} else if (data.error === "This license key has reached the activation limit.") {
				activated = false;
				error = "This license key is already in use in another Framer project.";
			} else {
				activated = data.activated;
				error = data.error;
				instanceId = data.instance.id;
			}
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
		<LicenseContext.Provider
			value={{
				validateLicenseKey: validateLicenseKeyFunction,
				activateLicenseKey,
				licenseKeyValid,
				setLicenseKeyValid,
				licenseKeyValidLoading: isLoading,
			}}
		>
			{children}
		</LicenseContext.Provider>
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

	if (isTestLicenseKey(licenseKey)) {
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

function isTestLicenseKey(licenseKey) {
	if (isReview() || window.location.hostname === "localhost") {
		return licenseKey === "ABC";
	}

	return false;
}
