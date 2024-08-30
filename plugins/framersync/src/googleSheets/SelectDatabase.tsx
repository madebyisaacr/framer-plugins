import { usePluginContext } from "../general/PluginContext";
import SelectDatabasePageTemplate from "../general/SelectDatabaseTemplate";
import { useSpreadsheetsQuery } from "./googleSheets";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();

	const { data, refetch, isRefetching, isLoading } = useSpreadsheetsQuery();

	const onSubmit = (spreadsheetId: string) => {
		const spreadsheet = data?.find((sheet) => sheet.id === spreadsheetId);
		if (!spreadsheet) {
			return;
		}

		updatePluginContext({
			integrationContext: { database: spreadsheet },
		});
	};

	const spreadsheets = isLoading
		? []
		: data?.map((sheet) => ({
				id: sheet.id,
				title: sheet.name,
		  }));

	return (
		<SelectDatabasePageTemplate
			databases={spreadsheets}
			refetch={refetch}
			isLoading={isLoading}
			isRefetching={isRefetching}
			onSubmit={onSubmit}
			title="Select a Google Sheet to sync"
			databasesLabel="Sheets"
		/>
	);
}
