import { FormEvent, useState } from "react";
import { assert } from "../utils";
import { ReloadIcon } from "../components/Icons";
import Button from "@shared/Button";
import classNames from "classnames";
import { Spinner } from "@shared/spinner/Spinner";
import { updateWindowSize } from "./PageWindowSizes";
import { usePluginContext } from "./PluginContext";
import BackButton from "../components/BackButton";

interface Database {
	id: string;
	title: string;
	iconEmoji: string | null;
	iconUrl: string | null;
}

export default function SelectDatabasePageTemplate({
	databases,
	refetch,
	isLoading,
	isRefetching,
	instructions,
	title,
	onSubmit,
}) {
	const { updatePluginContext } = usePluginContext();

	const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);

	updateWindowSize(instructions ? "SelectDatabaseWide" : "SelectDatabase");

	const handleSubmit = () => {
		assert(databases);

		const database = databases.find((database) => database.id === selectedDatabase);
		if (!database) {
			setSelectedDatabase(null);
			return;
		}

		onSubmit(database.id);
	};

	const onBackButtonClick = () => {
		updatePluginContext({
			integrationId: null,
			integrationContext: null,
		});
	};

	return (
		<div className="flex flex-row gap-3 size-full p-3">
			<div className="absolute top-0 inset-x-3 h-px bg-divider"></div>
			{instructions && (
				<div className="flex flex-col gap-3 w-[280px]">
					<BackButton onClick={onBackButtonClick} />
					{instructions}
				</div>
			)}
			<div className="w-px bg-divider" />
			<div className="flex flex-col gap-2 flex-1 justify-between">
				{!instructions && <BackButton onClick={onBackButtonClick} />}
				<div className="flex items-center justify-between">
					<span className="font-semibold">{title}</span>
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
						{databases?.map((database) => (
							<DatabaseButton
								key={database.id}
								databaseName={database.title}
								databaseIconEmoji={database.iconEmoji}
								databaseIconUrl={database.iconUrl}
								selected={selectedDatabase === database.id}
								onClick={() =>
									setSelectedDatabase(selectedDatabase === database.id ? null : database.id)
								}
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

function DatabaseButton({ databaseName, databaseIconEmoji, databaseIconUrl, selected, onClick }) {
	let icon = null;
	if (!databaseIconEmoji && !databaseIconUrl) {
		icon = (
			<svg
				viewBox="0 0 16 16"
				className="block w-4 h-3.5 shrink-0 text-tertiary"
				fill="currentColor"
			>
				<path d="M4.35645 15.4678H11.6367C13.0996 15.4678 13.8584 14.6953 13.8584 13.2256V7.02539C13.8584 6.0752 13.7354 5.6377 13.1406 5.03613L9.55176 1.38574C8.97754 0.804688 8.50586 0.667969 7.65137 0.667969H4.35645C2.89355 0.667969 2.13477 1.44043 2.13477 2.91016V13.2256C2.13477 14.7021 2.89355 15.4678 4.35645 15.4678ZM4.46582 14.1279C3.80273 14.1279 3.47461 13.7793 3.47461 13.1436V2.99219C3.47461 2.36328 3.80273 2.00781 4.46582 2.00781H7.37793V5.75391C7.37793 6.73145 7.86328 7.20312 8.83398 7.20312H12.5186V13.1436C12.5186 13.7793 12.1836 14.1279 11.5205 14.1279H4.46582ZM8.95703 6.02734C8.67676 6.02734 8.56055 5.9043 8.56055 5.62402V2.19238L12.334 6.02734H8.95703ZM10.4336 9.00098H5.42969C5.16992 9.00098 4.98535 9.19238 4.98535 9.43164C4.98535 9.67773 5.16992 9.86914 5.42969 9.86914H10.4336C10.6797 9.86914 10.8643 9.67773 10.8643 9.43164C10.8643 9.19238 10.6797 9.00098 10.4336 9.00098ZM10.4336 11.2979H5.42969C5.16992 11.2979 4.98535 11.4893 4.98535 11.7354C4.98535 11.9746 5.16992 12.1592 5.42969 12.1592H10.4336C10.6797 12.1592 10.8643 11.9746 10.8643 11.7354C10.8643 11.4893 10.6797 11.2979 10.4336 11.2979Z"></path>
			</svg>
		);
	} else if (databaseIconEmoji) {
		icon = <span className="text-lg">{databaseIconEmoji}</span>;
	} else if (databaseIconUrl) {
		icon = <img src={databaseIconUrl} className="size-4 rounded-sm" />;
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
