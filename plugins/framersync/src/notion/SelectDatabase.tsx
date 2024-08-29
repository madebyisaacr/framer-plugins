import { richTextToPlainText, useDatabasesQuery } from "./notion";
import notionConnectSrc from "../assets/notion-connect.png";
import { usePluginContext } from "../general/PluginContext";
import SelectDatabasePageTemplate from "../general/SelectDatabaseTemplate";
import getDatabaseIcon from "./getDatabaseIcon";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();

	const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();

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
					title: richTextToPlainText(database.title),
					icon: getDatabaseIcon(database, 18, true),
				};
		  });

	return (
		<SelectDatabasePageTemplate
			databases={databases}
			refetch={refetch}
			isLoading={isLoading}
			isRefetching={isRefetching}
			onSubmit={onSubmit}
			title="Select a Notion database to sync"
			databasesLabel="Databases"
			instructions={
				<>
					<img src={notionConnectSrc} alt="Notion connect" className="w-full rounded" />
					<p>
						Connect your databases: open a database in Notion, click the ... button in the top-right
						corner of the page, then pick Connections → Connect to → Framer.
					</p>
				</>
			}
		/>
	);
}
