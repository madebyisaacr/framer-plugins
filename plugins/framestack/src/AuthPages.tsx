import { useState, useRef } from "react";
import { usePageStack, BackButton } from "@shared/PageStack";
import Button from "@shared/Button";
import { supabase } from "./supabase";
import classNames from "classnames";

export function SignUpPage({}) {
	return (
		<AccountFormPage
			type="signUp"
			title="Sign Up"
			subtitle="Create an account to get started"
			buttonText="Sign Up"
			errorMessage="Error signing up. Please try again."
			passwordInput
			termsInput
			googleSignIn
		/>
	);
}

export function LogInPage({}) {
	return (
		<AccountFormPage
			type="logIn"
			title="Log In"
			subtitle="Welcome back!"
			buttonText="Log In"
			errorMessage="Error logging in. Please try again."
			passwordInput
			googleSignIn
		/>
	);
}

export function ForgotPasswordPage({}) {
	return (
		<AccountFormPage
			type="forgotPassword"
			title="Reset Password"
			subtitle="Enter your email address to reset your password."
			buttonText="Reset Password"
			errorMessage="Error sending password reset email. Please try again."
		/>
	);
}

// type = "signUp" | "logIn" | "forgotPassword"
function AccountFormPage({
	type,
	title,
	subtitle,
	buttonText,
	errorMessage,
	passwordInput = false,
	termsInput = false,
	googleSignIn = false,
	className = "",
	onSuccess = null,
}) {
	const { openPage, closePage } = usePageStack();

	// none, loading, success, error
	const [state, setState] = useState("none");

	const emailRef = useRef(null);
	const passwordRef = useRef(null);
	const termsRef = useRef(null);

	const onGoogleSignInClick = async () => {
		let { data, error } = await supabase.auth.signInWithOAuth({
			provider: "google",
		});

		if (error) {
			console.log(error);
			return;
		}

		console.log(data, "Signed in with Google");
	};

	const onFormSubmit = async (e) => {
		e.preventDefault();

		const email = emailRef.current?.value || "";
		const password = passwordRef.current?.value || "";
		const terms = termsRef.current?.checked || false;

		setState("loading");

		let error = null;

		switch (type) {
			case "signUp":
				if (email && password && terms) {
					let { error: signUpError, data } = await supabase.auth.signUp({
						email,
						password,
					});
					console.log(data, error);
					error = signUpError;
				}
				break;
			case "logIn":
				if (email && password) {
					let { error: logInError } = await supabase.auth.signInWithPassword({
						email,
						password,
					});
					error = logInError;
				}
				break;
			case "forgotPassword":
				if (email) {
					let { error: forgotPasswordError } = await supabase.auth.resetPasswordForEmail(email);
					error = forgotPasswordError;
				}
				break;
		}

		if (error) {
			setState("error");
			console.log("error", error);
			return;
		}

		setState("success");
		if (onSuccess) {
			onSuccess();
		} else {
			closePage();
		}
	};

	return (
		<div
			className={classNames(
				"relative p-3 flex flex-col items-center justify-center gap-6 size-full text-center",
				className
			)}
		>
			<BackButton className="absolute top-0 left-3" />
			<div className="flex flex-col items-center text-center gap-1 px-2">
				<span className="font-bold text-xl mt-2">{title}</span>
				{subtitle}
			</div>
			<div className="flex flex-col gap-1 w-full text-start">
				{googleSignIn && (
					<>
						<Button primary disabled={state == "loading"} onClick={onGoogleSignInClick}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width={14}
								height={14}
								viewBox="0 0 488 512"
								fill="currentColor"
								className="text-reversed"
							>
								<path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
							</svg>
							Sign in with Google
						</Button>
						<div className="w-full flex flex-row gap-1 items-center text-tertiary my-2 px-1">
							<div className="h-[1px] flex-1 bg-divider" />
							or
							<div className="h-[1px] flex-1 bg-divider" />
						</div>
					</>
				)}
				<form onSubmit={onFormSubmit} className="w-full flex flex-col gap-1">
					<label htmlFor="email">Email Address</label>
					<input
						ref={emailRef}
						type="email"
						id="email"
						placeholder="hello@example.com"
						required
						className="w-full mb-2"
					/>
					{passwordInput && (
						<>
							<label key="passwordLabel" htmlFor="password">
								Password
							</label>
							<input
								key="passwordInput"
								ref={passwordRef}
								type="password"
								id="password"
								placeholder="Min 8 characters"
								required
								className="w-full mb-2"
							/>
						</>
					)}
					{termsInput && (
						<label
							htmlFor="terms"
							className="flex flex-row items-center gap-2 w-full mb-2 cursor-pointer"
						>
							<input ref={termsRef} type="checkbox" id="terms" required />
							<span className="text-secondary">
								I agree with the{" "}
								<a href="https://www.blocsui.com/terms-and-conditions" target="_blank">
									Terms & Conditions
								</a>
							</span>
						</label>
					)}
					<Button primary loading={state == "loading"}>
						{buttonText}
					</Button>
				</form>
				<div className="mt-2 flex flex-col w-full text-center text-secondary">
					{state == "error" && <p className="text-error mb-1">{errorMessage}</p>}
					{type == "signUp" && (
						<span>
							Already have an account?{" "}
							<a onClick={() => openPage(<LogInPage />, { replace: true })}>Log In</a>
						</span>
					)}
					{type == "logIn" && (
						<>
							<span>
								Don't have an account?{" "}
								<a onClick={() => openPage(<SignUpPage />, { replace: true })}>Sign Up</a>
							</span>
							<span>
								Forgot password? <a onClick={() => openPage(<ForgotPasswordPage />)}>Reset</a>
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
