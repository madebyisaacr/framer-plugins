import {
	synchronizeDatabase,
	isAuthenticated,
	refreshAirtableToken,
	getIntegrationContext,
	getStoredIntegrationData,
	useSynchronizeDatabaseMutation,
} from "./airtable";
import { SelectDatabasePage } from "./SelectDatabase";
import { MapFieldsPage } from "./MapFields";
import { AuthenticatePage } from "./Authenticate";

export default {
	id: "airtable",

	synchronizeDatabase,
	isAuthenticated,
	refreshToken: refreshAirtableToken,
	getIntegrationContext,
	getStoredIntegrationData,
	useSynchronizeDatabaseMutation,

	AuthenticatePage,
	SelectDatabasePage,
	MapFieldsPage,
};
