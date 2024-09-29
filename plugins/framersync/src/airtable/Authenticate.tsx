import { authorize } from "./airtable";
import { Logo } from "../assets/AppIcons";
import { AuthenticatePageTemplate } from "../general/AuthenticateTemplate";

export function AuthenticatePage({ onAuthenticated }) {
	return <AuthenticatePageTemplate
		onAuthenticated={onAuthenticated}
		authorize={authorize}
		integrationName="Airtable"
		accountPlatformName="Airtable"
		databaseLabel="base"
		logo={<Logo id="airtable" size={50} />}
		steps={[
			"Log in to your Airtable account",
			"Pick the base you want to import",
			"Map the base fields to the CMS",
		]}
	/>;
}
