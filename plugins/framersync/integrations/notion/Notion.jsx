import React, { useState, useRef, useEffect, useMemo, Fragment } from "react";
import classNames from "classnames";
import { framer } from "framer-plugin";

import { Button, BackButton } from "@shared/components.jsx";

const notionDatabases = ["Apps", "Buildings", "Fruits & Vegetables", "Database", "Kitchen Appliances"];

export function NotionPage({ openPage, closePage }) {
	const isAuthenticated = false;
	const databaseSelected = false;

	// let Page: any = null;
	// if (!isAuthenticated) {
	// 	Page = ConnectAccountPage;
	// } else if (!databaseSelected) {
	// 	Page = SelectDatabasePage;
	// } else {
	// 	Page = ConfigureFieldsPage;
	// }

	return (
		<div className="flex flex-col size-full px-3 gap-2 overflow-y-auto hide-scrollbar">
			<BackButton onClick={closePage} />
			<p>Notion Sync</p>
			{/* <Page /> */}
		</div>
	);
}

const propertyConversionTypes = {
	checkbox: ["boolean"],
	created_by: ["string"],
	created_time: ["date", "string"],
	date: ["date", "string"],
	email: ["string"],
	files: ["string", "link", "image"],
	formula: ["string"],
	last_edited_by: ["string"],
	last_edited_time: ["date", "string"],
	multi_select: ["string"],
	number: ["number"],
	people: ["string"],
	phone_number: ["string"],
	relation: ["string"],
	rich_text: ["formattedText", "string"],
	rollup: ["string"],
	select: ["enum", "string"],
	status: ["enum", "string"],
	title: ["string"],
	url: ["link", "string"],
};

const cmsFieldTypeNames = {
	boolean: "Toggle",
	color: "Color",
	number: "Number",
	string: "Text",
	formattedText: "Formatted Text",
	image: "Image",
	link: "Link",
	date: "Date",
	enum: "Option",
};