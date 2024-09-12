import { usePluginContext } from "../general/PluginContext";
import { useEffect, useRef, useState } from "react";
import Button from "@shared/Button";
import { openGooglePicker, getFullSheet, getSheetsList } from "./googleSheets";
import Window from "../general/Window";

const apiBaseUrl =
	window.location.hostname === "localhost"
		? "http://localhost:8787/google-sheets"
		: "https://framersync-workers.isaac-b49.workers.dev/google-sheets";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();
	const [isLoading, setIsLoading] = useState(false);
	const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState(null);
	const [sheets, setSheets] = useState([]);
	const pollIntervalRef = useRef(null);
	const readKeyRef = useRef(null);

	const handleSelectSheet = async () => {
		setIsLoading(true);
		readKeyRef.current = openGooglePicker();

		// Start polling for the picker result
		pollIntervalRef.current = setInterval(pollForPickerResult, 2500);
	};

	const pollForPickerResult = async () => {
		try {
			console.log(`${apiBaseUrl}/poll-picker?readKey=${readKeyRef.current}`);
			const response = await fetch(`${apiBaseUrl}/poll-picker?readKey=${readKeyRef.current}`, {
				method: "POST",
			});
			if (response.status === 200) {
				const result = await response.json();
				if (result && result.spreadsheetId) {
					clearInterval(pollIntervalRef.current);
					readKeyRef.current = null;
					await processPickerResult(result);
				}
			}
		} catch (error) {
			console.error("Error polling for picker result:", error);
		}
	};

	const processPickerResult = async (result) => {
		const { spreadsheetId } = result;
		setSelectedSpreadsheetId(spreadsheetId);
		const sheetsList = await getSheetsList(spreadsheetId);
		setSheets(sheetsList);
		setIsLoading(false);
	};

	const handleSheetSelect = async (sheetId) => {
		setIsLoading(true);
		const fullSheet = await getFullSheet(selectedSpreadsheetId, sheetId);

		updatePluginContext({
			integrationContext: {
				spreadsheet: { id: selectedSpreadsheetId, name: fullSheet.properties.title },
				sheet: fullSheet,
				spreadsheetId: selectedSpreadsheetId,
				sheetId: fullSheet.properties.sheetId,
			},
		});

		setIsLoading(false);
	};

	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, []);

	return (
		<Window
			page="SelectDatabase"
			className="flex-col gap-2 p-3 size-full items-center justify-center"
		>
			{!selectedSpreadsheetId && (
				<Button
					primary
					onClick={handleSelectSheet}
					loading={isLoading}
					disabled={isLoading}
					className="w-[200px]"
				>
					Select a Google Sheet
				</Button>
			)}
			{selectedSpreadsheetId && sheets.length > 0 && (
				<>
					<h2 className="text-base font-bold">Select a sheet:</h2>
					<ul className="list-none p-0">
						{sheets.map((sheet) => (
							<li key={sheet.properties.sheetId} className="mb-2">
								<Button
									onClick={() => handleSheetSelect(sheet.properties.sheetId)}
									disabled={isLoading}
								>
									{sheet.properties.title}
								</Button>
							</li>
						))}
					</ul>
				</>
			)}
		</Window>
	);
}

export function SelectDatabasePageOld() {
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

	const spreadsheets =
		isLoading || !Array.isArray(data)
			? []
			: data.map((sheet) => ({
					id: sheet.id,
					title: sheet.name,
			  }));

	useEffect(() => {
		if (!isLoading && !spreadsheets.length) {
			openGooglePicker();
		}
	}, [isLoading]);

	return (
		<SelectDatabasePageTemplate
			databases={spreadsheets}
			refetch={refetch}
			isLoading={isLoading}
			isRefetching={isRefetching}
			onSubmit={onSubmit}
			title="Select a Google Sheet to sync"
			databasesLabel="Sheets"
			subdatabases
			getSubdatabases={getSubdatabases}
			subdatabasesLabel="Sheets"
			connectMoreDatabases={openGooglePicker}
		/>
	);
}
