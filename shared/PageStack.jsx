import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

export function PageStack({ homePage }) {
	const [pageStack, setPageStack] = useState([]);

	function openPage(page, props = {}) {
		if (!page) {
			return;
		}

		setPageStack([...pageStack, [page, props]]);
	}

	function closePage() {
		if (pageStack.length > 0) {
			setPageStack(pageStack.slice(0, pageStack.length - 1));
		}
	}

	return (
		<div className="size-full hide-scrollbar">
			<AnimatePresence>
				{[[homePage, {}], ...pageStack].map((page, index) => {
					const PageComponent = page[0];

					return (
						<motion.div
							key={index}
							className="size-full flex flex-col absolute inset-0 bg-bg"
							initial={index == 0 ? {} : { opacity: 1, translateX: "100%", boxShadow: "0 32px 32px 0 rgba(0,0,0,0.2)" }}
							exit={{ opacity: 1, translateX: "100%", boxShadow: "0 32px 32px 0 rgba(0,0,0,0)" }}
							animate={{
								opacity: index == pageStack.length ? 1 : 0,
								translateX: index == pageStack.length ? 0 : "-12%",
								pointerEvents: index == pageStack.length ? "auto" : "none",
								boxShadow: "0 32px 32px 0 rgba(0,0,0,0.1)",
							}}
							transition={{
								type: "tween",
								ease: [0.25, 1, 0.4, 1],
								duration: 0.35,
								boxShadow: {
									type: "tween",
									ease: "linear",
									duration: 0.35,
								},
							}}
						>
							<PageComponent openPage={openPage} closePage={closePage} {...page[1]} />
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
