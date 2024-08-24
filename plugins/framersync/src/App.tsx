import { framer } from "framer-plugin";
import { useEffect, useState } from "react";
import "./App.css";
import { PluginContext, useSynchronizeDatabaseMutation } from "./airtable/airtable";

import { SelectDatabase } from "./airtable/SelectDatabase";
import { MapDatabaseFields } from "./airtable/MapFields";
import { logSyncResult } from "./debug";
import { Authentication } from "./airtable/Authenticate";

interface AppProps {
	context: PluginContext;
}

export function AuthenticatedApp({ context }: AppProps) {
	const [databaseConfig, setDatabaseConfig] = useState(
		context.type === "update" ? { base: context.base, table: context.table } : null
	);

	const synchronizeMutation = useSynchronizeDatabaseMutation(databaseConfig?.base, databaseConfig?.table, {
		onSuccess(result) {
			logSyncResult(result);

			if (result.status === "success") {
				framer.closePlugin("Synchronization successful");
				return;
			}
		},
	});

	if (!databaseConfig) {
		return <SelectDatabase onDatabaseSelected={setDatabaseConfig} />;
	}

	return (
		<MapDatabaseFields
			base={databaseConfig.base}
			table={databaseConfig.table}
			pluginContext={context}
			onSubmit={synchronizeMutation.mutate}
			error={synchronizeMutation.error}
			isLoading={synchronizeMutation.isPending}
		/>
	);
}

export function App({ context }: AppProps) {
	const [pluginContext, setPluginContext] = useState(context);

	const handleAuthenticated = (authenticatedContext: PluginContext) => {
		setPluginContext(authenticatedContext);

		// The authenticated UI is larger in size than the authentication screen.
		framer.showUI({
			width: 350,
			height: 370,
		});
	};

	if (!pluginContext.isAuthenticated) {
		return <Authentication context={pluginContext} onAuthenticated={handleAuthenticated} />;
	}

	return <AuthenticatedApp context={pluginContext} />;
}
