import "framer-plugin/framer.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";
import { SupabaseProvider } from "./supabase.jsx";
import { PageStack } from "@shared/PageStack";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<SupabaseProvider>
			<PageStack homePage={<App />} />
		</SupabaseProvider>
	</React.StrictMode>
);
