import { framer } from "framer-plugin";

const CHUNK_SIZE = 2000; // Slightly less than 2KB to account for key size

export async function setLargePluginData(key: string, value: string) {
	if (value.length <= CHUNK_SIZE) {
		return framer.setPluginData(key, value);
	}

	const chunks = [];
	for (let i = 0; i < value.length; i += CHUNK_SIZE) {
		chunks.push(value.slice(i, i + CHUNK_SIZE));
	}

	for (let i = 0; i < chunks.length; i++) {
		await framer.setPluginData(`${key}-${i + 1}`, chunks[i]);
	}
}

export async function getLargePluginData(key: string) {
	const allKeys = await framer.getPluginDataKeys();

	if (allKeys.includes(key)) {
		return framer.getPluginData(key);
	}

	let result = "";
	let index = 1;

	while (allKeys.includes(`${key}-${index}`)) {
		const chunk = await framer.getPluginData(`${key}-${index}`);
		if (chunk === null) break;
		result += chunk;
		index++;
	}

	if (result === "") return null;

	try {
		return JSON.parse(result);
	} catch {
		return result;
	}
}
