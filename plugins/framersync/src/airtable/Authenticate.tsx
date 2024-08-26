import { useEffect, useRef, useState } from "react";
import { PluginContext, authorize, getPluginContext } from "./airtable";
import loginIllustration from "../assets/notion-login.png";
import Button from "@shared/Button";
import { framer } from "framer-plugin";
import { updateWindowSize } from "../general/PageWindowSizes";

function useIsDocumentVisibile() {
	const [isVisible, setIsVisible] = useState(document.visibilityState === "visible");

	useEffect(() => {
		const handleVisibilityChange = () => {
			setIsVisible(document.visibilityState === "visible");
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return isVisible;
}

interface AuthenticationProps {
	onAuthenticated: () => void;
	context: PluginContext;
}

export function AuthenticatePage({ onAuthenticated, context }: AuthenticationProps) {
	const [isLoading, setIsLoading] = useState(false);
	const isDocumentVisible = useIsDocumentVisibile();
	const notifiedForContextRef = useRef<PluginContext | null>(null);

	useEffect(() => {
		// after authentication the user may not have returned to Framer yet.
		// So the toast is only displayed upon document being visible
		if (!isDocumentVisible) return;
		// Only notify once per context
		if (notifiedForContextRef.current === context) return;
		if (context.type !== "error") return;

		notifiedForContextRef.current = context;
		framer.notify(context.message, { variant: "error" });
	}, [context, isDocumentVisible]);

	updateWindowSize("Authenticate");

	const handleAuth = () => {
		setIsLoading(true);
		// const writeKey = generateRandomId();

		// It is important to call `window.open` directly in the event handler
		// So that Safari does not block any popups.

		authorize()
			.then(onAuthenticated)
			.finally(() => {
				setIsLoading(false);
			});
	};
	return (
		<div className="w-full h-full flex flex-col items-center justify-center gap-3 pb-3 px-3">
			<img src={loginIllustration} className="max-w-100% rounded flex-shrink-0" />
			<div className="flex flex-col items-center gap-2 flex-1 justify-center w-full">
				{isLoading ? (
					<span className="text-center max-w-[80%] block text-secondary">
						Complete the authentication and return to this page.
					</span>
				) : (
					<ol className="list-inside list-decimal w-full text-secondary gap-2 text-md flex flex-col flex-1">
						<li>Log in to your Airtable account</li>
						<li>Pick the base you want to import</li>
						<li>Map the base fields to the Framer CMS</li>
					</ol>
				)}
			</div>
			<Button primary onClick={handleAuth} loading={isLoading} disabled={isLoading}>
				Log in to Airtable
			</Button>
		</div>
	);
}
