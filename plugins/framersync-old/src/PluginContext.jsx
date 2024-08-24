import { createContext, useState } from "react";

// collection
// integrationId
// isAuthenticated
// databaseId
// lastSyncedTime
// disabledFieldIds
// slugFieldId
// integrationData
// collectionFields
// fields

const PluginContext = createContext({});
export default PluginContext;

export const PluginContextProvider = ({ value, children }) => {
	const [context, setContext] = useState(value);

	function setIntegrationData(data) {
		setContext({ ...context, integrationData: data });
	}

	return <PluginContext.Provider value={{...context, setIntegrationData, setContext}}>{children}</PluginContext.Provider>;
};
