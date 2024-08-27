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
		shadowColor = "",
		...otherProps
	},
	ref
) {
	const Element = href.length ? "a" : "button";
	const elementProps = href.length ? { href, target: newTab ? "_blank" : undefined } : { onClick };

	shadowColor = shadowColor || (primary ? "var(--framer-color-tint)" : null);

	return (
		<Element
			ref={ref}
			style={style}
			className={classNames(
				"relative flex items-center gap-1.5 justify-center rounded font-semibold border-none text-xs min-h-6 max-h-6 decoration-[none] transition-colors overflow-visible",
				square ? "min-w-6 max-w-6" : "px-2",
				primary ? "framer-button-primary" : "bg-secondary text-primary hover:bg-tertiary active:!bg-tertiary",
				disabled ? "opacity-60" : "cursor-pointer",
				className
			)}
			disabled={disabled}
			{...elementProps}
			{...otherProps}
		>
			{shadowColor && (
				<div
					className="absolute inset-0 rounded-[inherit] opacity-30 pointer-events-none"
					style={{
						boxShadow: `0px 4px 8px 0px ${shadowColor}`,
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
