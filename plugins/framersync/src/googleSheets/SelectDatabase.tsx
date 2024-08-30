import { usePluginContext } from "../general/PluginContext";
import SelectDatabasePageTemplate from "../general/SelectDatabaseTemplate";
import { useSpreadsheetsQuery, getSheetsList } from "./googleSheets";

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

	const getSubdatabases = async (spreadsheetId: string) => {
		const sheets = await getSheetsList(spreadsheetId);
		console.log("sheets", sheets);
		return sheets
			? sheets.map((sheet) => ({ id: sheet.properties.title, name: sheet.properties.title }))
			: null;
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
			databasesLabel="Spreadsheets"
			subdatabases
			getSubdatabases={getSubdatabases}
			subdatabasesLabel="Sheets"
		/>
	);
}
