import { useState, createContext, useContext, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";

export const PageStackContext = createContext({});

const TRANSITION = {
	type: "tween",
	ease: [0.25, 1, 0.4, 1],
	duration: 0.35,
};

// Page:
// component

export function PageStack({ homePage }) {
	const [pageStack, setPageStack] = useState([]);
	const [modal, setModal] = useState(null);

	const home = { component: homePage };

	function openPage(page, { replace = false } = {}) {
		if (!page) {
			return;
		}

		const item = { component: page };

		if (replace) {
			setPageStack([...pageStack.slice(0, pageStack.length - 1), item]);
		} else {
			setPageStack([...pageStack, item]);
		}
	}

	function closePage() {
		if (pageStack.length > 0) {
			setPageStack(pageStack.slice(0, pageStack.length - 1));
		}
	}

	function openModal(modal) {
		setModal(modal);
	}

	function closeModal() {
		setModal(null);
	}

	return (
		<div className="size-full">
			<PageStackContext.Provider
				value={{
					openPage,
					closePage,
					openModal,
					closeModal,
					modalOpen: modal !== null,
					pageCount: pageStack.length + 1,
				}}
			>
				<motion.div className={classNames("size-full", modal && "pointer-events-none")}>
					<AnimatePresence>
						{[home, ...pageStack].map((page, index) => {
							return (
								<motion.div
									key={index}
									className="size-full flex flex-col absolute inset-0 bg-primary rounded-bl-xl overflow-hidden"
									initial={
										index == 0
											? {}
											: { translateX: "100%", boxShadow: "0 32px 32px 0 rgba(0,0,0,0.2)" }
									}
									exit={{ translateX: "100%", boxShadow: "0 32px 32px 0 rgba(0,0,0,0)" }}
									animate={{
										translateX: index == pageStack.length ? 0 : "-16%",
										pointerEvents: index == pageStack.length ? "auto" : "none",
									}}
									style={{
										boxShadow: "0 32px 32px 0 rgba(0,0,0,0.1)",
									}}
									transition={{
										...TRANSITION,
										boxShadow: {
											type: "tween",
											ease: "linear",
											duration: 0.35,
										},
									}}
								>
									<motion.div
										className="size-full"
										animate={{
											opacity: index < pageStack.length ? 0.2 : modal ? 0.3 : 1,
											scale: modal ? 0.95 : 1,
										}}
										initial={false}
										transition={TRANSITION}
									>
										{page.component}
									</motion.div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</motion.div>
				{modal && <div className="absolute inset-0 cursor-pointer" onClick={closeModal} />}
				<AnimatePresence>
					{modal && (
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={TRANSITION}
							className="absolute inset-x-0 bottom-0 bg-primary"
							style={{
								boxShadow: "0 -12px 12px -12px rgba(0,0,0,0.05)",
							}}
						>
							<div className="absolute top-0 inset-x-3 h-[1px] bg-divider" />
							{modal}
						</motion.div>
					)}
				</AnimatePresence>
			</PageStackContext.Provider>
		</div>
	);
}

export function BackButton({ className = "", onClick = null }) {
	const { closePage, pageCount, modalOpen } = useContext(PageStackContext);

	const originalPageCount = useMemo(() => pageCount, []);

	useEffect(() => {
		if (originalPageCount <= 1 || pageCount !== originalPageCount || modalOpen) {
			return;
		}

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				if (onClick) {
					onClick();
				} else {
					closePage();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [pageCount, modalOpen]);

	return originalPageCount > 1 ? (
		<span
			onClick={onClick || closePage}
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
