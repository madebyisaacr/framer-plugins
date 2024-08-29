import { usePluginContext } from "../general/PluginContext";
import SelectDatabasePageTemplate from "../general/SelectDatabaseTemplate";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();

	// const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();

	const data = [];
	const refetch = () => {};
	const isRefetching = false;
	const isLoading = false;

	const onSubmit = (databaseId: string) => {
		const database = data?.find((database) => database.id === databaseId);
		if (!database) {
			return;
		}

		updatePluginContext({
			integrationContext: { database },
		});
	};

	const databases = isLoading
		? []
		: data?.map((database) => {
				return {
					id: database.id,
					title: database.title,
				};
		  });

	return (
		<SelectDatabasePageTemplate
			databases={databases}
			refetch={refetch}
			isLoading={isLoading}
			isRefetching={isRefetching}
			onSubmit={onSubmit}
			title="Select a Google Sheet to sync"
			databasesLabel="Sheets"
		/>
	);
}
