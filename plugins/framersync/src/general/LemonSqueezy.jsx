import { useEffect, useContext, createContext } from "react";

const checkoutURL = "https://store.framestack.co/buy/24b67220-4e17-478b-9a4a-9cbf0e2db171";

export const LemonSqueezyContext = createContext();

export function useLemonSqueezy() {
	return useContext(LemonSqueezyContext);
}

export function LemonSqueezyProvider({ children }) {
	useEffect(() => {
		if (window.hasOwnProperty("createLemonSqueezy")) {
			window.createLemonSqueezy();

			LemonSqueezy.Setup({
				eventHandler: (event) => {
					console.log(event);
				},
			});
		}
	}, []);

	return (
		<LemonSqueezyContext.Provider value={{ openCheckout }}>{children}</LemonSqueezyContext.Provider>
	);
}
