import { authorize } from "./googleSheets";
import { GoogleSheetsLogo } from "../assets/AppIcons";
import { AuthenticatePageTemplate } from "../general/AuthenticateTemplate";

export function AuthenticatePage({ onAuthenticated }) {
	return (
		<AuthenticatePageTemplate
			onAuthenticated={onAuthenticated}
			authorize={authorize}
			integrationName="Google"
			accountPlatformName="Google"
			databaseLabel="sheet"
			logo={<GoogleSheetsLogo size={50} />}
			steps={[
				"Log in to your Google account",
				"Pick the sheet you want to import",
				"Map the sheet columns to the CMS",
			]}
		/>
	);
}
