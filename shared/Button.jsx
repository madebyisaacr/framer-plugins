import { forwardRef } from "react";
import classNames from "classnames";
import { Spinner } from "./spinner/Spinner";

const Button = forwardRef(function Button(
	{
		primary = false,
		newTab = false,
		square = false,
		children,
		className = "",
		style = {},
		href = "",
		onClick = null,
		loading = false,
		disabled = false,
	},
	ref
) {
	const Element = href.length ? "a" : "button";
	const elementProps = href.length ? { href, target: newTab ? "_blank" : undefined } : { onClick };

	return (
		<Element
			ref={ref}
			style={style}
			className={classNames(
				"relative flex items-center gap-1.5 justify-center rounded font-semibold border-none text-xs min-h-6 max-h-6 decoration-[none] transition-colors",
				square ? "min-w-6 max-w-6" : "px-2",
				primary ? "framer-button-primary" : "bg-secondary text-primary hover:bg-tertiary",
				disabled ? "opacity-60" : "cursor-pointer",
				className
			)}
			disabled={disabled}
			{...elementProps}
		>
			{primary && (
				<div
					className="absolute inset-0 rounded-[inherit] opacity-20 pointer-events-none"
					style={{
						boxShadow: "0px 4px 8px 0px var(--framer-color-tint)",
					}}
				/>
			)}
			{loading ? (
				<div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center">
					<Spinner color={primary ? "light" : "system"} />
				</div>
			) : (
				children
			)}
		</Element>
	);
});

export default Button;
