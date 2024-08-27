import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { richTextToPlainText, useDatabasesQuery } from "./notion";
import { FormEvent, useEffect, useState } from "react";
import notionConnectSrc from "./assets/notion-connect.png";
import { assert } from "./utils";
import { ReloadIcon } from "./components/Icons";
import { framer } from "framer-plugin";
import Button from "@shared/Button";
import classNames from "classnames";
import { Spinner } from "@shared/spinner/Spinner";

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
		<div className="flex flex-row gap-3 size-full p-3">
			<div className="absolute top-0 inset-x-3 h-px bg-divider"></div>
			<div className="flex flex-col gap-3 w-[280px]">
				<img src={notionConnectSrc} className="rounded" />
				<p>
					Connect your databases: open a database in Notion, click the ... button in the top-right corner of the page, then pick
					Connections → Connect to → Framer.
				</p>
			</div>
			<div className="w-px bg-divider" />
			<div className="flex flex-col gap-2 flex-1 justify-between">
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
					<div className="flex flex-col items-center justify-center flex-1 gap-4">
						<Spinner inline />
						Loading Databases...
					</div>
				) : (
					<div className="flex-1 flex flex-col">
						{data?.map((database) => (
							<NotionDatabaseButton
								key={database.id}
								databaseName={richTextToPlainText(database.title)}
								databaseIcon={database.icon}
								selected={selectedDatabase === database.id}
								onClick={() => setSelectedDatabase(selectedDatabase === database.id ? null : database.id)}
							/>
						))}
					</div>
				)}
				<Button primary disabled={!selectedDatabase} onClick={handleSubmit}>
					Next: Configure Collection Fields
				</Button>
			</div>
		</div>
	);
}

function NotionDatabaseButton({ databaseName, databaseIcon, selected, onClick }) {
	let icon = null;

	if (!databaseIcon) {
		icon = (
			<svg viewBox="0 0 16 16" className="block w-4 h-3.5 shrink-0 text-tertiary" fill="currentColor">
				<path d="M4.35645 15.4678H11.6367C13.0996 15.4678 13.8584 14.6953 13.8584 13.2256V7.02539C13.8584 6.0752 13.7354 5.6377 13.1406 5.03613L9.55176 1.38574C8.97754 0.804688 8.50586 0.667969 7.65137 0.667969H4.35645C2.89355 0.667969 2.13477 1.44043 2.13477 2.91016V13.2256C2.13477 14.7021 2.89355 15.4678 4.35645 15.4678ZM4.46582 14.1279C3.80273 14.1279 3.47461 13.7793 3.47461 13.1436V2.99219C3.47461 2.36328 3.80273 2.00781 4.46582 2.00781H7.37793V5.75391C7.37793 6.73145 7.86328 7.20312 8.83398 7.20312H12.5186V13.1436C12.5186 13.7793 12.1836 14.1279 11.5205 14.1279H4.46582ZM8.95703 6.02734C8.67676 6.02734 8.56055 5.9043 8.56055 5.62402V2.19238L12.334 6.02734H8.95703ZM10.4336 9.00098H5.42969C5.16992 9.00098 4.98535 9.19238 4.98535 9.43164C4.98535 9.67773 5.16992 9.86914 5.42969 9.86914H10.4336C10.6797 9.86914 10.8643 9.67773 10.8643 9.43164C10.8643 9.19238 10.6797 9.00098 10.4336 9.00098ZM10.4336 11.2979H5.42969C5.16992 11.2979 4.98535 11.4893 4.98535 11.7354C4.98535 11.9746 5.16992 12.1592 5.42969 12.1592H10.4336C10.6797 12.1592 10.8643 11.9746 10.8643 11.7354C10.8643 11.4893 10.6797 11.2979 10.4336 11.2979Z"></path>
			</svg>
		);
	} else if (databaseIcon.type === "emoji") {
		icon = <span className="text-lg">{databaseIcon.emoji}</span>;
	} else if (databaseIcon.type === "external") {
		icon = <img src={databaseIcon.external.url} className="size-4 rounded-sm" />;
	} else if (databaseIcon.type === "file") {
		icon = <img src={databaseIcon.file.url} className="size-4 rounded-sm" />;
	}

	return (
		<div
			onClick={onClick}
			className={classNames(
				"relative p-2 cursor-pointer flex flex-row gap-2 items-center h-8",
				selected && "bg-secondary rounded"
			)}
		>
			{icon}
			{databaseName}
		</div>
	);
}
