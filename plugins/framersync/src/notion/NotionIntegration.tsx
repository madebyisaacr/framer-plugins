import {
	synchronizeDatabase,
	isAuthenticated,
	getIntegrationContext,
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
	useSynchronizeDatabaseMutation,

	AuthenticatePage,
	SelectDatabasePage,
	MapFieldsPage,
};