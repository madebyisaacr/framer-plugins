import { airtableFetch } from "./airtable";
import { useEffect, useState } from "react";
import { assert } from "../utils";
import { usePluginContext } from "../general/PluginContext";
import SelectDatabasePageTemplate from "../general/SelectDatabaseTemplate";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();

	const [isLoading, setIsLoading] = useState(true);
	const [bases, setBases] = useState([]);
	const [isRefetching, setIsRefetching] = useState(false);

	async function fetchBases() {
		if (!isLoading) {
			setIsRefetching(true);
		}

		const data = await airtableFetch("meta/bases");

		setBases(data.bases);

		if (isLoading) {
			setIsLoading(false);
		} else {
			setIsRefetching(false);
		}

		if (!data.bases) return;
	}

	// TODO: Implement global cache for bases and tables to prevent refetching twice on first load
	useEffect(() => {
		fetchBases();
	}, []);

	const onSubmit = (baseId: string, table: object) => {
		assert(bases);

		const base = bases.find((base) => base.id === baseId);
		if (!base || !table) {
			return;
		}

		updatePluginContext({
			integrationContext: { baseId: base.id, tableId: table.id, baseSchema: base, table },
		});
	};

	const getSubdatabases = async (baseId: string) => {
		const baseSchema = await airtableFetch(`meta/bases/${baseId}/tables`);
		return baseSchema.tables || null;
	};

	const databases = bases.map((base) => ({
		id: base.id,
		title: base.name,
	}));

	return (
		<SelectDatabasePageTemplate
			databases={databases}
			refetch={fetchBases}
			isLoading={isLoading}
			isRefetching={isRefetching}
			onSubmit={onSubmit}
			title="Select an Airtable base to sync"
			subdatabases
			getSubdatabases={getSubdatabases}
		/>
	);
}
