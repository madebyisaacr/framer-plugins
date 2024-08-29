import {
	synchronizeDatabase,
	isAuthenticated,
	getIntegrationContext,
	useSynchronizeDatabaseMutation,
	hasFieldConfigurationChanged,
} from "./googleSheets";
import { SelectDatabasePage } from "./SelectDatabase";
import { MapFieldsPage } from "./MapFields";
import { AuthenticatePage } from "./Authenticate";

export default {
	id: "google-sheets",

	synchronizeDatabase,
	isAuthenticated,
	getIntegrationContext,
	useSynchronizeDatabaseMutation,
	hasFieldConfigurationChanged,

	AuthenticatePage,
	SelectDatabasePage,
	MapFieldsPage,
};
