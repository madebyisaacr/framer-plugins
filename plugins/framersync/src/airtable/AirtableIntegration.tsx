import {
	synchronizeDatabase,
	isAuthenticated,
	refreshAirtableToken,
	getIntegrationContext,
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
	useSynchronizeDatabaseMutation,

	AuthenticatePage,
	SelectDatabasePage,
	MapFieldsPage,
};
