import React, { useContext } from "react";
import { Button, BackButton } from "@shared/components.jsx";
import PluginContext from "@plugin/PluginContext.js";

function AuthenticatePage() {
	return (
		<div className="p-3 pt-0 flex-1 flex flex-col">
			AuthenticatePage
			<div className="flex-1" />
			<Button primary>Connect Notion Account</Button>
		</div>
	);
}

function SelectDatabasePage() {
	return <div className="p-3 pt-0 flex-1 flex flex-col">SelectDatabasePage</div>;
}

function ConfigureFieldsPage() {
	return <div className="p-3 pt-0 flex-1 flex flex-col">ConfigureFieldsPage</div>;
}

function Page() {
	const { isAuthenticated, databaseId } = useContext(PluginContext);

	if (!isAuthenticated) {
		return <AuthenticatePage />;
	}

	if (!databaseId) {
		return <SelectDatabasePage />;
	}

	return <ConfigureFieldsPage />;
}

const Notion = {
	id: "notion",
	Page,
};

export default Notion;
