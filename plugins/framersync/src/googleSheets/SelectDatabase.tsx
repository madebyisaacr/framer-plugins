import { usePluginContext } from "../general/PluginContext";
import SelectDatabasePageTemplate from "../general/SelectDatabaseTemplate";
import {
	useSpreadsheetsQuery,
	getSheetsList,
	getFullSheet,
	openGooglePicker,
} from "./googleSheets";
import { useEffect } from "react";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();

	const { data, refetch, isRefetching, isLoading } = useSpreadsheetsQuery();

	const onSubmit = async (spreadsheetId: string, sheet: object) => {
		const spreadsheet = data?.find((spreadsheet) => spreadsheet.id === spreadsheetId);
		if (!spreadsheet || !sheet) {
			return;
		}

		const fullSheet = await getFullSheet(spreadsheetId, sheet.id);

		updatePluginContext({
			integrationContext: {
				spreadsheet,
				sheet: fullSheet,
				spreadsheetId,
				sheetId: fullSheet.properties.sheetId,
			},
		});
	};

	const getSubdatabases = async (spreadsheetId: string) => {
		const sheets = await getSheetsList(spreadsheetId);
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

	useEffect(() => {
		openGooglePicker();
	}, []);

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
