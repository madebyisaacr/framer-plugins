import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { richTextToPlainText, useDatabasesQuery } from "./notion";
import { FormEvent, useEffect, useState } from "react";
import notionConnectSrc from "./assets/notion-connect.png";
import { assert } from "./utils";
import { ReloadIcon } from "./components/Icons";
import { framer } from "framer-plugin";
import Button from "@shared/Button";
import classNames from "classnames";

interface SelectDatabaseProps {
	onDatabaseSelected: (database: GetDatabaseResponse) => void;
}

export function SelectDatabase({ onDatabaseSelected }: SelectDatabaseProps) {
	const { data, refetch, isRefetching, isLoading } = useDatabasesQuery();
	const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);

	framer.showUI({ width: 750, height: 550 });

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		assert(data);

		const database = data.find((database) => database.id === selectedDatabase);
		if (!database) {
			setSelectedDatabase(null);
			return;
		}

		onDatabaseSelected(database);
	};

	return (
		<div className="flex flex-row gap-3 size-full">
			<div className="flex flex-col gap-4 w-[280px]">
				<img src={notionConnectSrc} className="rounded" />
				<p>
					Connect your databases: open a database in Notion, click the ... button in the top-right corner of the page, then pick
					Connections → Connect to → Framer.
				</p>
			</div>
			<div className="w-[1px] bg-divider" />
			<div className="flex flex-col gap-3 flex-1 justify-between">
				<div className="flex items-center justify-between">
					<span>Select a Notion database to sync</span>
					<button
						className="w-[32px] bg-transparent flex items-center justify-center text-secondary"
						type="button"
						onClick={() => refetch()}
					>
						<ReloadIcon className={isRefetching || isLoading ? "animate-spin" : undefined} />
					</button>
				</div>
				{isLoading ? (
					<div className="flex items-center justify-center h-[200px]">Loading Databases...</div>
				) : (
					<div className="flex-1 flex flex-col divide-y divide-divider">
						{data?.map((database) => (
							<NotionDatabaseButton
								key={database.id}
								databaseName={richTextToPlainText(database.title)}
								selected={selectedDatabase === database.id}
								onClick={() => setSelectedDatabase(selectedDatabase === database.id ? null : database.id)}
							/>
						))}
					</div>
				)}
				<Button primary disabled={!selectedDatabase} onClick={handleSubmit}>
					Next
				</Button>
			</div>
		</div>
	);
}

function NotionDatabaseButton({ databaseName, selected, onClick }) {
	return (
		<label
			htmlFor={databaseName}
			className={classNames("p-2 cursor-pointer flex flex-row gap-2 items-center", selected && "bg-secondary rounded")}
		>
			<input type="checkbox" name="database" id={databaseName} checked={selected} onChange={onClick} />
			{databaseName}
		</label>
	);
}
