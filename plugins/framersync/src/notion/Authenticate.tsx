import { useEffect, useRef, useState } from "react";
import { authorize } from "./notion";
import loginIllustration from "../assets/notion-login.png";
import Button from "@shared/Button";
import { framer } from "framer-plugin";
import { PluginContext, usePluginContext } from "../general/PluginContext";
import Window from "../general/Window";
import BackButton from "../components/BackButton";

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
		// Only notify once per pluginContext
		if (notifiedForContextRef.current === pluginContext) return;
		if (pluginContext.type !== "error") return;

		notifiedForContextRef.current = pluginContext;
		framer.notify(pluginContext.message, { variant: "error" });
	}, [pluginContext, isDocumentVisible]);

	const handleAuth = () => {
		setIsLoading(true);

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
			<img src={loginIllustration} className="max-w-100% rounded flex-shrink-0" />
			<div className="flex flex-col items-center gap-2 flex-1 justify-center w-full">
				{isLoading ? (
					<span className="text-center max-w-[80%] block text-secondary">
						Complete the authentication and return to this page.
					</span>
				) : (
					<ol className="list-inside list-decimal w-full text-secondary gap-2 text-md flex flex-col flex-1">
						<li>Log in to your Notion account</li>
						<li>Pick the database you want to import</li>
						<li>Map the database fields to the CMS</li>
					</ol>
				)}
			</div>
			<Button primary onClick={handleAuth} loading={isLoading} disabled={isLoading}>
				Log in to Notion
			</Button>
		</Window>
	);
}
