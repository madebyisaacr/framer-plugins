import { googleFetch, authorize } from "./googlesheets";
import { FormEvent, useEffect, useState, useCallback } from "react";
import { assert } from "./utils";
import { ReloadIcon } from "./components/Icons";
import { framer } from "framer-plugin";
import Button from "@shared/Button";
import classNames from "classnames";
import { Spinner } from "@shared/spinner/Spinner";

const GOOGLE_CLIENT_ID = "830588332904-7i1eb1jjv2ped73sniikp1od2d9ri0vl.apps.googleusercontent.com";
const GOOGLE_API_KEY = "";

declare global {
	interface Window {
		gapi: any;
	}
}

export function SelectDatabase({ onDatabaseSelected }) {
	// const { data, refetch, isRefetching, isLoading } = {} //useDatabasesQuery();
	const [selectedBase, setSelectedBase] = useState<string | null>(null);
	const [selectedTable, setSelectedTable] = useState<string | null>(null);
	const [baseTables, setBaseTables] = useState({});

	const [isLoading, setIsLoading] = useState(false);
	const [bases, setBases] = useState([]);
	const [isRefetching, setIsRefetching] = useState(false);

	framer.showUI({ width: 450, height: 550 });

	async function fetchBases() {}

	// TODO: Implement global cache for bases and tables to prevent refetching twice on first load
	useEffect(() => {
		fetchBases();
	}, []);

	function onSelect(data) {
		console.log("onSelect", data);
	}

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		assert(bases);

		const base = bases.find((base) => base.id === selectedBase);
		const table = baseTables[selectedBase]?.find((table) => table.id === selectedTable);
		if (!base || !table) {
			setSelectedBase(null);
			setSelectedTable(null);
			return;
		}

		onDatabaseSelected({ base, table });
	};

	return (
		<div className="flex flex-row gap-3 size-full p-3">
			<div className="absolute top-0 inset-x-3 h-px bg-divider"></div>
			<div className="flex flex-col gap-2 flex-1 justify-between">
				<div className="flex items-center justify-between">
					<span className="text-secondary">Select a Google Sheet to sync</span>
					<button
						className="w-[32px] bg-transparent flex items-center justify-center text-secondary"
						type="button"
						onClick={fetchBases}
					>
						<ReloadIcon className={isRefetching || isLoading ? "animate-spin" : undefined} />
					</button>
				</div>
				<Button primary href="" newTab>
					Pick a sheet
				</Button>
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
										className={classNames(
											"flex flex-row gap-1.5 items-center cursor-pointer px-2 py-1.5 rounded transition-colors",
											selectedTable == table.id && "bg-secondary"
										)}
									>
										<input
											type="checkbox"
											name={table.id}
											checked={selectedTable === table.id}
											readOnly
										/>
										{table.name}
									</label>
								))}
							</div>
						))}
					</div>
				)}
				<Button onClick={authorize}>Connect Another Sheet</Button>
				<Button primary disabled={!selectedBase} onClick={handleSubmit}>
					Next: Configure Collection Fields
				</Button>
			</div>
		</div>
	);
}
