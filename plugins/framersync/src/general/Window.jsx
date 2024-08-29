import { framer } from "framer-plugin";
import { motion } from "framer-motion";
import classNames from "classnames";

const pageSizes = {
	Integrations: {
		width: 500,
		height: 450,
	},
	Authenticate: {
		width: 350,
		height: 450,
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
	framer.showUI(pageSizes[page]);

	return (
		<motion.div
			className={classNames("size-full", className)}
			initial={{
				opacity: 0,
			}}
			animate={{
				opacity: 1,
			}}
			transition={{
				type: "tween",
				ease: "easeInOut",
				duration: 0.15,
			}}
		>
			{children}
		</motion.div>
	);
}
