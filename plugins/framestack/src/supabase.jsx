import { createClient } from "@supabase/supabase-js";
import { createContext, useState, useEffect, useContext, useCallback } from "react";
import Tier from "./tier";

export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLIC_KEY
);

const SupabaseContext = createContext(null);

export const useSupabase = () => {
	return useContext(SupabaseContext);
};

export const SupabaseProvider = ({ children }) => {
	const [session, setSession] = useState(null);
	const [userData, setUserData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [subscriptionCheckInterval, setSubscriptionCheckInterval] = useState(null);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		// Initial session check
		checkSession();

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (session?.user) {
			fetchUserData(session.user.id);
		} else if (session === null) {
			setUserData(null);
			setIsLoading(false);
		}
	}, [session]);

	const checkSession = async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		setSession(session);
	};

	const fetchUserData = async (userId) => {
		setIsLoading(true);
		const { data, error } = await supabase.from("users").select("*").eq("user_id", userId).single();

		if (error) {
			console.error("Error fetching user data", error);
		} else {
			setUserData(data);
		}
		setIsLoading(false);
		return data;
	};

	const updateUserData = async () => {
		if (session?.user) {
			const updatedData = await fetchUserData(session.user.id);
			setUserData(updatedData);
			return updatedData;
		}
	};

	const startSubscriptionCheck = useCallback(() => {
		if (subscriptionCheckInterval) {
			clearInterval(subscriptionCheckInterval);
		}

		const intervalId = setInterval(async () => {
			const updatedData = await updateUserData();
			if (updatedData?.subscription_active) {
				clearInterval(intervalId);
				setSubscriptionCheckInterval(null);
				setUserData(updatedData);
			}
		}, 1000);

		setSubscriptionCheckInterval(intervalId);
	}, [session]);

	useEffect(() => {
		return () => {
			if (subscriptionCheckInterval) {
				clearInterval(subscriptionCheckInterval);
			}
		};
	}, [subscriptionCheckInterval]);

	return (
		<SupabaseContext.Provider
			value={{
				session,
				tier: userData ? (userData.pro ? Tier.Pro : Tier.Free) : Tier.NoUser,
				userData,
				isLoading,
				updateUserData,
				startSubscriptionCheck,
			}}
			children={children}
		/>
	);
};
