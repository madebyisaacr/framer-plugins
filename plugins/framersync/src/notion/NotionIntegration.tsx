import {
	synchronizeDatabase,
	isAuthenticated,
	getIntegrationContext,
	getStoredIntegrationData,
	useSynchronizeDatabaseMutation,
} from "./notion";
import { SelectDatabasePage } from "./SelectDatabase";
import { MapFieldsPage } from "./MapFields";
import { AuthenticatePage } from "./Authenticate";

export default {
	id: "notion",

	synchronizeDatabase,
	isAuthenticated,
	getIntegrationContext,
	getStoredIntegrationData,
	useSynchronizeDatabaseMutation,

	AuthenticatePage,
	SelectDatabasePage,
	MapFieldsPage,
};
