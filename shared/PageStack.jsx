import { motion, AnimatePresence } from "framer-motion";
import React, { useState, createContext, useContext, useEffect } from "react";

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
								className="size-full flex flex-col absolute inset-0 bg-primary"
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

export function BackButton({ className = "" }) {
	const { closePage, pageCount } = useContext(PageStackContext);

	useEffect(() => {
		if (pageCount <= 1) {
			return;
		}

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				closePage();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	return pageCount > 1 ? (
		<span
			onClick={closePage}
			className={`text-tertiary flex flex-row items-center gap-1 cursor-pointer w-max pr-1 ${className}`}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
				<g transform="translate(1.5 1)">
					<path
						d="M 3.5 0 L 0 4 L 3.5 7.5"
						fill="transparent"
						strokeWidth="1.5"
						stroke="currentColor"
						strokeLinecap="round"
					></path>
				</g>
			</svg>
			Back
		</span>
	) : null;
}
