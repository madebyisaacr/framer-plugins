import { useEffect, useRef, useState } from "react";
import { authorize } from "./airtable";
import Button from "@shared/Button";
import { framer } from "framer-plugin";
import { PluginContext, usePluginContext } from "../general/PluginContext";
import Window from "../general/Window";
import BackButton from "../components/BackButton";
import { AirtableLogo, FramerLogo } from "../assets/AppIcons";

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
}

export function AuthenticatePage({ onAuthenticated }: AuthenticationProps) {
	const { pluginContext, updatePluginContext } = usePluginContext();

	const [isLoading, setIsLoading] = useState(false);
	const isDocumentVisible = useIsDocumentVisibile();
	const notifiedForContextRef = useRef<PluginContext | null>(null);

	useEffect(() => {
		// after authentication the user may not have returned to Framer yet.
		// So the toast is only displayed upon document being visible
		if (!isDocumentVisible) return;
		// Only notify once per context
		if (notifiedForContextRef.current === pluginContext) return;
		if (pluginContext.type !== "error") return;

		notifiedForContextRef.current = pluginContext;
		framer.notify(pluginContext.message, { variant: "error" });
	}, [pluginContext, isDocumentVisible]);

	const handleAuth = () => {
		setIsLoading(true);

		// It is important to call `window.open` directly in the event handler
		// So that Safari does not block any popups.

		authorize()
			.then(onAuthenticated)
			.finally(() => {
				setIsLoading(false);
			});
	};

	const onBackButtonClick = () => {
		updatePluginContext({ integrationId: null, integrationContext: null });
	};

	return (
		<Window page="Authenticate" className="flex flex-col justify-center gap-3 pb-3 px-3">
			<BackButton onClick={onBackButtonClick} />
			<h1 className="text-base font-bold text-primary">
				Connect your Airtable account
				<br />
				with FramerSync
			</h1>
			<div className="w-full aspect-[1.8] rounded bg-secondary flex flex-row items-center justify-center gap-3">
				<AirtableLogo size={50} />
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-tertiary"
				>
					<path d="M5 12l14 0" />
					<path d="M13 18l6 -6" />
					<path d="M13 6l6 6" />
				</svg>
				<FramerLogo size={42} />
			</div>
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
		</Window>
	);
}
