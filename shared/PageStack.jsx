import { motion, AnimatePresence } from "framer-motion";
import React, { useState, createContext, useContext, useEffect, useRef } from "react";

export const PageStackContext = createContext({});

const scaleTransition = {
	type: "spring",
	stiffness: 800,
	damping: 60,
	mass: 1,
	boxShadow: {
		type: "tween",
		ease: "linear",
		duration: 0.2,
	},
};

// Page:
// component
// buttonRef

export function PageStack({ homePage }) {
	const [pageStack, setPageStack] = useState([]);
	const originalButtonRectRef = useRef({});

	const home = { component: homePage, buttonRef: null };

	function openPage(page, ref = null) {
		if (!page) {
			return;
		}

		setPageStack([...pageStack, { component: page, buttonRef: ref }]);

		if (ref?.current) {
			originalButtonRectRef.current[pageStack.length] = ref.current.getBoundingClientRect();
		}
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
					{[home, ...pageStack].map((page, index) => {
						const button = page.buttonRef?.current;

						const nextPageHasButton = pageStack[index]?.buttonRef?.current ? true : false;
						const animate = {
							opacity: index == pageStack.length ? 1 : 0,
							translateX: index == pageStack.length ? 0 : nextPageHasButton ? 0 : "-12%",
							pointerEvents: index == pageStack.length ? "auto" : "none",
							scale: index == pageStack.length || !nextPageHasButton ? 1 : 0.9,
						};

						if (button) {
							const rect = originalButtonRectRef.current[index - 1] || button.getBoundingClientRect();

							const buttonStyle = window.getComputedStyle(button);
							const borderRadiusPercent = convertBorderRadiusToPercentage(buttonStyle.borderRadius, rect.width, rect.height);

							const left = rect.left / window.innerWidth;
							const top = rect.top / window.innerHeight;
							const width = rect.width / window.innerWidth;
							const height = rect.height / window.innerHeight;

							const initialStyle = {
								left: `${left * 100}%`,
								top: `${top * 100}%`,
								scaleX: width,
								scaleY: height,
								borderRadius: borderRadiusPercent,
								boxShadow: "0 30px 50px -10px rgba(0,0,0,0)",
							};

							return (
								<motion.div
									key={index}
									className="size-full flex flex-col absolute inset-0 rounded-xl bg-primary"
									style={{
										transformOrigin: "top left",
										overflow: "hidden",
									}}
									initial={initialStyle}
									exit={initialStyle}
									animate={{
										left: 0,
										top: 0,
										scaleX: 1,
										scaleY: 1,
										borderRadius: "15px",
										boxShadow: "0 30px 50px -10px rgba(0,0,0,0.2)",
										...animate,
									}}
									transition={scaleTransition}
								>
									{page.component}
									<motion.div
										className="absolute rounded-xl pointer-events-none [&>*:first-child]:rounded-none"
										initial={{
											opacity: 1,
										}}
										animate={{
											opacity: 0,
										}}
										exit={{
											opacity: 1,
											transition: {
												type: "tween",
												ease: "linear",
												duration: 0.1,
												delay: 0.05,
											},
										}}
										style={{
											width: rect.width,
											height: rect.height,
											scaleX: 1 / width,
											scaleY: 1 / height,
											transformOrigin: "top left",
										}}
										transition={{
											type: "tween",
											ease: "linear",
											duration: 0.1,
										}}
										dangerouslySetInnerHTML={{ __html: button.outerHTML }}
									></motion.div>
								</motion.div>
							);
						} else {
							return (
								<motion.div
									key={index}
									className="size-full flex flex-col absolute inset-0 bg-primary overflow-hidden rounded-bl-xl"
									initial={index == 0 ? {} : { opacity: 1, translateX: "100%", boxShadow: "0 32px 32px 0 rgba(0,0,0,0.2)" }}
									exit={{ opacity: 1, translateX: "100%", boxShadow: "0 32px 32px 0 rgba(0,0,0,0)" }}
									animate={animate}
									style={{
										boxShadow: "0 32px 32px 0 rgba(0,0,0,0.1)",
									}}
									transition={
										nextPageHasButton
											? scaleTransition
											: {
													type: "tween",
													ease: [0.25, 1, 0.4, 1],
													duration: 0.35,
													boxShadow: {
														type: "tween",
														ease: "linear",
														duration: 0.35,
													},
											  }
									}
								>
									{page.component}
								</motion.div>
							);
						}
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
		<span onClick={closePage} className={`text-tertiary flex flex-row items-center gap-1 cursor-pointer w-max pr-1 ${className}`}>
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

function convertBorderRadiusToPercentage(borderRadius, width, height) {
	// Get the border-radius in px
	let borderRadiusPx = parseFloat(borderRadius);

	// Calculate the percentage based on the width
	let v = (Math.min(borderRadiusPx, width / 2) / width) * 100;
	let h = (Math.min(borderRadiusPx, height / 2) / height) * 100;

	return h == v ? `${h}%` : `${h}% / ${v}%`;
}
