import { framer } from "framer-plugin";
import React, { useState, useRef, useEffect } from "react";
import "./App.css";

import { Button, BackButton } from "@shared/components.jsx";
import { PageStack } from "@shared/PageStack.jsx";

// if (framer.mode === "syncCollection") {
//   // await importData(collection, rssSourceId)
//   await framer.closePlugin()
// } else if (framer.mode === "configureCollection") {
//   framer.showUI({
// 		title: "Airport",
// 		width: 315,
// 		height: 400,
// 	});
// }

framer.showUI({
	title: "Airport",
	width: 270,
	height: 300,
});

export function App() {
	return (
		<main className="flex flex-col size-full select-none text-color-base">
			<PageStack homePage={HomePage} />
		</main>
	);
}

function HomePage({openPage}) {
	return (
		<div className="flex flex-col size-full p-3 pt-0">
			<h1>Sync Airtable with Framer</h1>
			<div className="flex-1"></div>
			<Button primary onClick={() => openPage(ConnectPage)}>Connect Airtable Account</Button>
		</div>
	);
}

function ConnectPage({ closePage }) {
	return (
		<div className="flex flex-col size-full p-3 pt-0 gap-2">
			<BackButton onClick={closePage} />
			<h1 className="text-xl font-bold -mb-1 mt-1">Connect Airtable account</h1>
			<p>Connect your Airtable account to get started.</p>
			<div className="flex-1" />
			<Button primary>Connect</Button>
		</div>
	);
}
