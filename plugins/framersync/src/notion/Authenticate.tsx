import { authorize } from "./notion";
import { NotionLogo } from "../assets/AppIcons";
import { AuthenticatePageTemplate } from "../general/AuthenticateTemplate";

export function AuthenticatePage({ onAuthenticated }) {
	return <AuthenticatePageTemplate
		onAuthenticated={onAuthenticated}
		authorize={authorize}
		integrationName="Notion"
		accountPlatformName="Notion"
		databaseLabel="database"
		logo={<NotionLogo size={50} />}
		steps={[
			"Log in to your Notion account",
			"Pick the database you want to import",
			"Map the database fields to the CMS",
		]}
	/>;
}
