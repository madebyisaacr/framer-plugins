import { framer } from "framer-plugin";
import { useEffect } from "react";

const pageSizes = {
	Integrations: {
		width: 500,
		height: 350,
	},
	Authenticate: {
		width: 350,
		height: 380,
	},
	SelectDatabaseWide: {
		width: 750,
		height: 550,
	},
	SelectDatabase: {
		width: 400,
		height: 550,
	},
	MapFields: {
		width: 1000,
		height: 650,
	},
};

export default function Window({ page, className, children }) {
	useEffect(() => {
		framer.showUI(pageSizes[page]);
	}, [page]);

	return (
		<div
			className={className}
			style={{
				...pageSizes[page],
				minWidth: pageSizes[page].width,
				minHeight: pageSizes[page].height,
			}}
		>
			{children}
		</div>
	);
}
