import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
// import { richTextToPlainText, useDatabasesQuery } from "./airtable";
import { airtableFetch } from "./airtable";
import { FormEvent, useEffect, useState } from "react";
import notionConnectSrc from "./assets/notion-connect.png";
import { assert } from "./utils";
import { ReloadIcon } from "./components/Icons";
import { framer } from "framer-plugin";
import Button from "@shared/Button";
import classNames from "classnames";
import { Spinner } from "@shared/spinner/Spinner";

export function SelectDatabase({ onDatabaseSelected }) {
	// const { data, refetch, isRefetching, isLoading } = {} //useDatabasesQuery();
	const [selectedBase, setSelectedBase] = useState<string | null>(null);

	const [isLoading, setIsLoading] = useState(true);
	const [bases, setBases] = useState([]);
	const [isRefetching, setIsRefetching] = useState(false);

	framer.showUI({ width: 750, height: 550 });

	useEffect(() => {
		airtableFetch("meta/bases").then((data) => {
			setBases(data.bases);
			setIsLoading(false);
		});
	}, []);

	function refetch() {
		setIsRefetching(true);

		airtableFetch("meta/bases").then((data) => {
			setBases(data.bases);
			setIsRefetching(false);
		});
	}

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		assert(bases);

		const database = bases.find((base) => base.id === selectedBase);
		if (!database) {
			setSelectedBase(null);
			return;
		}

		onDatabaseSelected(database);
	};

	return (
		<div className="flex flex-row gap-3 size-full px-3 pb-3">
			<div className="flex flex-col gap-3 w-[280px]">
				<img src={notionConnectSrc} className="rounded" />
				<p>
					Connect your databases: open a database in Notion, click the ... button in the top-right corner of the page, then pick
					Connections → Connect to → Framer.
				</p>
			</div>
			<div className="w-[1px] bg-divider" />
			<div className="flex flex-col gap-2 flex-1 justify-between">
				<div className="flex items-center justify-between">
					<span>Select an Airtable base to sync</span>
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
						Loading bases...
					</div>
				) : (
					<div className="flex-1 flex flex-col">
						{bases?.map((database) => (
							<DatabaseButton
								key={database.id}
								databaseName={database.name}
								selected={selectedBase === database.id}
								onClick={() => setSelectedBase(selectedBase === database.id ? null : database.id)}
							/>
						))}
					</div>
				)}
				<Button primary disabled={!selectedBase} onClick={handleSubmit}>
					Next: Configure Collection Fields
				</Button>
			</div>
		</div>
	);
}

function DatabaseButton({ databaseName, selected, onClick }) {
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
