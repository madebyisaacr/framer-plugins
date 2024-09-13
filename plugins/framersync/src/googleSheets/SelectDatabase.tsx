import { usePluginContext } from "../general/PluginContext";
import { useEffect, useState } from "react";
import Button from "@shared/Button";
import { getSheetsList, getFullSheet, getGoogleAccessToken } from "./googleSheets";
import Window from "../general/Window";

export function SelectDatabasePage() {
	const { updatePluginContext } = usePluginContext();
	const [isLoading, setIsLoading] = useState(false);
	const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState(null);
	const [sheets, setSheets] = useState([]);
	const [isScriptLoaded, setIsScriptLoaded] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);

	useEffect(() => {
		const script = document.createElement("script");
		script.src = "https://apis.google.com/js/api.js";
		script.async = true;
		script.onload = () => {
			gapi.load("picker", () => setIsScriptLoaded(true));
		};
		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, []);

	const handleSelectSheet = () => {
		if (!isScriptLoaded) return;

		setPickerOpen(true);

		const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
			.setMimeTypes("application/vnd.google-apps.spreadsheet")
			.setIncludeFolders(true)
			.setSelectFolderEnabled(false);

		const picker = new google.picker.PickerBuilder()
			.addView(view)
			.setOAuthToken(getGoogleAccessToken())
			.setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
			.setAppId(import.meta.env.VITE_GOOGLE_APP_ID)
			.setCallback(pickerCallback)
			.setTitle("Select a Google Sheet to sync with Framer")
			.build();

		picker.setVisible(true);
	};

	const pickerCallback = async (data) => {
		if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
			const doc = data[google.picker.Response.DOCUMENTS][0];
			const spreadsheetId = doc.id;
			setSelectedSpreadsheetId(spreadsheetId);

			setIsLoading(true);
			const sheetsList = await getSheetsList(spreadsheetId);
			setSheets(sheetsList);
			setIsLoading(false);
		}
		setPickerOpen(false);
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

	return (
		<Window
			page={pickerOpen ? "GooglePicker" : "SelectDatabase"}
			className="flex-col gap-2 p-3 size-full items-center justify-center"
		>
			{!selectedSpreadsheetId && (
				<Button
					primary
					onClick={handleSelectSheet}
					loading={isLoading}
					disabled={isLoading || !isScriptLoaded}
					className="w-[200px]"
				>
					Select a Google Sheet
				</Button>
			)}
			{selectedSpreadsheetId && sheets?.length > 0 && (
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
