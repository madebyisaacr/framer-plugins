import {
	synchronizeDatabase,
	isAuthenticated,
	refreshAirtableToken,
	getIntegrationContext,
	getStoredIntegrationData,
} from "./airtable";
import { SelectDatabasePage } from "./SelectDatabase";
import { MapFieldsPage } from "./MapFields";

export default {
	synchronizeDatabase,
	isAuthenticated,
	refreshToken: refreshAirtableToken,
	getIntegrationContext,
	getStoredIntegrationData,
	SelectDatabasePage,
	MapFieldsPage,
};
