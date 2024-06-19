import React from "react";

import { App } from "./App";

export function NotionPage({ openPage, closePage }) {
	return (
		<div className="flex flex-col size-full p-3 pt-0">
			<App />
		</div>
	);
}
