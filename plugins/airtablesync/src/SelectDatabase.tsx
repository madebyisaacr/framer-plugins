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
	const [selectedTable, setSelectedTable] = useState<string | null>(null);
	const [baseTables, setBaseTables] = useState({});

	const [isLoading, setIsLoading] = useState(true);
	const [bases, setBases] = useState([]);
	const [isRefetching, setIsRefetching] = useState(false);

	framer.showUI({ width: 750, height: 550 });

	async function fetchBases() {
		if (!isLoading) {
			setIsRefetching(true);
		}

		const data = await airtableFetch("meta/bases");

		setBases(data.bases);

		if (isLoading) {
			setIsLoading(false);
		} else {
			setIsRefetching(false);
		}

		if (!data.bases) return;

		for (const base of data.bases) {
			const baseSchema = await airtableFetch(`meta/bases/${base.id}/tables`);
			if (baseSchema?.tables) {
				setBaseTables((prev) => ({ ...prev, [base.id]: baseSchema.tables }));
			}
		}
	}

	// TODO: Implement global cache for bases and tables to prevent refetching twice on first load
	useEffect(() => {
		fetchBases();
	}, []);

	const onTableClick = (base, table) => {
		if (selectedTable == table.id) {
			setSelectedBase(null);
			setSelectedTable(null);
		} else {
			setSelectedBase(base.id);
			setSelectedTable(table.id);
		}
	};

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
			<div className="flex flex-col gap-1 flex-1 justify-between">
				<div className="flex items-center justify-between">
					<span>Select a table from an Airtable base to sync</span>
					<button
						className="w-[32px] bg-transparent flex items-center justify-center text-secondary"
						type="button"
						onClick={fetchBases}
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
					<div className="flex-1 flex flex-col gap-2 divide-y divide-divider">
						{bases?.map((base) => (
							<div key={base.id} className="flex flex-col pt-1">
								<div
									className={classNames(
										"flex flex-row items-center h-7 font-semibold transition-colors",
										selectedBase == base.id ? "text-primary" : "text-secondary"
									)}
								>
									{base.name}
								</div>
								{baseTables[base.id]?.map((table) => (
									<label
										htmlFor={table.id}
										key={table.id}
										onClick={() => onTableClick(base, table)}
										className={classNames(
											"flex flex-row gap-1.5 items-center cursor-pointer px-2 py-1.5 rounded transition-colors",
											selectedTable == table.id && "bg-secondary"
										)}
									>
										<input type="checkbox" name={table.id} checked={selectedTable === table.id} readOnly />
										{table.name}
									</label>
								))}
							</div>
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
