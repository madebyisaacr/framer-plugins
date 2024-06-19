import React, { useState, useRef, useEffect } from "react";

import { Button, BackButton } from "@shared/components.jsx";

export function AirtablePage({ openPage, closePage }) {
	return (
		<div className="flex flex-col size-full p-3 pt-0">
			<BackButton onClick={closePage} />
			<h1>Sync Airtable with Framer</h1>
			<div className="flex-1"></div>
			<Button primary>Connect Airtable Account</Button>
		</div>
	);
}
