import React, { useState, useRef, useEffect } from "react";

import { Button, BackButton } from "@shared/components.jsx";

export function AirtablePage({ openPage, closePage }) {
	return (
		<div className="flex flex-col size-full p-3 pt-0">
			<BackButton onClick={closePage} />
			<h1>Sync Airtable with Framer</h1>
			<div className="flex-1"></div>
			<Button primary onClick={() => openPage(ConnectPage)}>
				Connect Airtable Account
			</Button>
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