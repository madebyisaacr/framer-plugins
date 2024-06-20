import { motion, AnimatePresence } from "framer-motion";
import React, { useState, createContext } from "react";

export const PageStackContext = createContext({});

export function PageStack({ homePage }) {
	const [pageStack, setPageStack] = useState([]);

	function openPage(page) {
		if (!page) {
			return;
		}

		setPageStack([...pageStack, page]);
	}

	function closePage() {
		if (pageStack.length > 0) {
			setPageStack(pageStack.slice(0, pageStack.length - 1));
		}
	}

	return (
		<div className="size-full">
			<PageStackContext.Provider value={{ openPage, closePage, pageCount: pageStack.length + 1 }}>
				<AnimatePresence>
					{[homePage, ...pageStack].map((page, index) => {
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
								{page}
							</motion.div>
						);
					})}
				</AnimatePresence>
			</PageStackContext.Provider>
		</div>
	);
}
