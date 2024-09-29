import { ControlType } from "./ControlType";

const COMPONENT = "component";
const OVERRIDE = "override";
const CODE_SNIPPET = "codeSnippet";
const COMPONENT_AND_OVERRIDE = "componentAndOverride";

export const components = [
	{
		name: "Scroll-to-Top Button",
		tag: "Utility",
		type: COMPONENT,
		free: true,
		description: "Click to scroll to the top of the page.",
		componentURL: "",
	},
	{
		name: "Scroll Progress Bar",
		tag: "Utility",
		type: COMPONENT,
		wide: true,
		description: "Create a progress bar that shows the percentage of the page that has been scrolled.",
	},
	{
		name: "Negative Gap",
		tag: "Utility",
		type: OVERRIDE,
		wide: true,
		free: true,
		description: "Add negative gap sizes to any stack layout to make items overlap.",
		controls: {
			direction: {
				type: ControlType.Enum,
				options: ["horizontal", "vertical"],
				displaySegmentedControl: true,
			},
			gap: {
				type: ControlType.Number,
				min: 0,
				step: 1,
			},
		},
		code: `import type { ComponentType } from "react";

const direction = "[[direction]]";
const gap = [[gap]];

export function NegativeGap(Component): ComponentType {
	return (props) => {
		const className = \`framestack-negative-gap-\${direction}\${gap}\`

		return (
			<Component
				{...props}
				className={props.className + " " + className}
				style={{ ...props.style, gap: 0 }}
			>
				<style>{\`.\${className} > *:not(:first-child) { margin-\${
					direction == "vertical" ? "top" : "left"
				}: \${gap}px; }\`}</style>
			</Component>
		)
	}
}
`,
	},
	{
		name: "Rating",
		tag: "Utility",
		type: COMPONENT,
		description: "Displays a number as a star rating. Has customization for shape, size, color, number of stars, and more.",
	},
	{
		name: "Circular Progress Bar",
		tag: "Utility",
		type: COMPONENT,
		description: "Create a radial progress bar with customizable size and colors.",
	},
	{
		name: "Progress Bar",
		tag: "Utility",
		type: COMPONENT,
		description: "Create a horizontal or vertical progress bar with customizable alignment, colors, gradient, and more.",
	},
	{
		name: "Auto Copyright Year",
		tag: "Utility",
		type: OVERRIDE,
		free: true,
		description: "Keep your copyright footer up to date by always displaying the current year.",
		code: `import type { ComponentType } from "react";

export function AutoCopyrightYear(Component): ComponentType {
	return (props) => {
		let text = "";
		const textProps = props.children?.props?.children?.props;
		if (textProps && typeof textProps.children == "string") {
			text = textProps.children.replace("YYYY", new Date().getFullYear());
		}
		return <Component {...props} text={text} />;
	};
}
`,
	},
	{
		name: "Circular Layout",
		tag: "Utility",
		type: COMPONENT,
		description: "Places items in a circle with customizable sizing, animations, and more.",
	},
	{
		name: "Keyboard Shortcuts",
		tag: "Utility",
		type: OVERRIDE,
		wide: true,
		description:
			"Add keyboard shortcuts to your Framer website. Keyboard shortcuts can trigger any action - links, buttons, component variants, search, and overlays.",
		docs: "To set the keyboard shortcut for a layer, rename the layer to the key combination with each key separated by a + symbol. For example, Cmd+K or Ctrl+Shift+T.",
		code: `import type { ComponentType } from "react"
import { useEffect, useRef, forwardRef } from "react"
import Mousetrap from "mousetrap"

const TEXT_LAYER_TYPES = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "span"]

export function KeyboardShortcut(Component): ComponentType {
    return forwardRef((props, ref) => {
        const { onTap } = props
        const name = props["data-framer-name"] ?? props.name
        const shortcutRef = useRef(null)

        useEffect(() => {
            if (name) {
                const keys = name
                    .toLowerCase()
                    .replace("ctrl", "mod")
                    .replace("cmd", "mod")
                    .replace("command", "mod")
                    .replace("delete", "del")
                    .replace("insert", "ins")

                Mousetrap.bind(keys, (event) => {
                    if (!shortcutRef.current) {
                        return
                    }

                    if (
                        props.hasOwnProperty("backdropOptions") &&
                        props.hasOwnProperty("inputOptions") &&
                        props.hasOwnProperty("modalOptions") &&
                        props.hasOwnProperty("iconColor")
                    ) {
                        // Search component
                        shortcutRef.current.firstElementChild?.firstElementChild?.click()
                    } else {
                        // Other component or layer
                        if (
                            shortcutRef.current.firstElementChild?.firstElementChild?.getAttribute(
                                "name"
                            ) == name
                        ) {
                            shortcutRef.current.firstElementChild?.firstElementChild?.click()
                        } else if (
                            TEXT_LAYER_TYPES.includes(
                                props.children?.props?.children?.type
                            )
                        ) {
                            // It is a text layer, so click the text link if it has one.
                            shortcutRef.current.querySelector("a")?.click()
                        } else {
                            shortcutRef.current.firstElementChild?.click()
                        }
                    }

                    // The onTap function switches variants inside components and opens overlays.
                    if (typeof onTap == "function") {
                        onTap()
                    }

                    event.preventDefault()
                })

                return () => {
                    Mousetrap.unbind(keys)
                }
            }
        }, [onTap])

        // The element is wrapped in an empty div so that the ref can be added properly in all cases.
        // Code components do not have ref forwarding, which causes the ref to be unset.
        return (
            <div ref={shortcutRef} style={{ display: "contents" }}>
                <Component {...props} ref={ref} />
            </div>
        )
    })
}
`,
	},
	{
		name: "Back Button",
		tag: "Utility",
		type: COMPONENT,
		free: true,
		description: "Add a back button to your website for navigating to the previous page.",
	},
	{
		name: "URL Label",
		tag: "Utility",
		type: COMPONENT,
		description: "Display a link in a clean, readable format by optionally hiding https://, www., URL parameters, and more.",
	},
	{
		name: "Stopwatch",
		tag: "Utility",
		type: COMPONENT,
		description:
			"Add a stopwatch to your website for measuring time. Make it start and pause by clicking it, or make it start when the page loads as a creative design element.",
	},
	{
		name: "OS Variants",
		tag: "Utility",
		type: COMPONENT,
		description:
			"Display different variants of a layer on different operating systems. Useful for creating app download buttons that direct you to the correct download link for your device.",
	},
	{
		name: "Theme Toggle",
		tag: "Themes",
		type: COMPONENT,
		wide: true,
		description:
			"Add a theme toggle button or dropdown menu to your website to switch between light and dark modes based on Framer color styles. Saves the user's theme as a cookie to remember their preference.",
		componentURL: "https://framer.com/m/ThemeToggle-zFey.js",
	},
	{
		name: "Dark / Light Image",
		tag: "Themes",
		type: COMPONENT,
		description: "Show a different image for dark and light themes.",
	},
	{
		name: "Dark / Light Variants",
		tag: "Themes",
		type: COMPONENT,
		description: "Show a different layer or component variant for dark and light themes.",
	},
	{
		name: "Before & After Image Slider",
		tag: "Images",
		type: COMPONENT,
		wide: true,
		description:
			"Beautifully display before and after images with in a horizontal or vertical slider, complete with custom transitions and handle designs.",
		componentURL: "https://framer.com/m/ImageSlider-yKo3.js",
	},
	{
		name: "Aspect Ratio Image",
		tag: "Images",
		type: COMPONENT,
		free: true,
		description:
			"Maintain the aspect ratio of an image. Useful for images from the CMS or component variables that might not have the same aspect ratio.",
	},
	{
		name: "Pixelated Image",
		tag: "Images",
		type: COMPONENT,
		free: true,
		description:
			"Show a low-resolution image as pixel art, removing the default anti-aliasing (pixel smoothing) applied to images.",
	},
	{
		name: "Rotate Toward Cursor",
		tag: "Effects",
		type: OVERRIDE,
		description: "Rotates a layer to face the cursor.",
		code: `import type { ComponentType } from "react"
import { useState, useEffect, useRef } from "react"

export function RotateTowardCursor(Component): ComponentType {
	return (props) => {
		const [rotation, setRotation] = useState(0)
		const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
		const ref = useRef(null)

		const calculateRotation = () => {
			if (ref.current) {
				const rect = ref.current.getBoundingClientRect()
				const dx = mousePosition.x - (rect.left + rect.width / 2)
				const dy = mousePosition.y - (rect.top + rect.height / 2)
				const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
				setRotation(angle)
			}
		}

		useEffect(() => {
			const handleMouseMove = (event: MouseEvent) => {
				setMousePosition({ x: event.clientX, y: event.clientY })
				calculateRotation()
			}

			const handleScroll = () => {
				calculateRotation()
			}

			document.addEventListener("mousemove", handleMouseMove)
			window.addEventListener("scroll", handleScroll)

			return () => {
				document.removeEventListener("mousemove", handleMouseMove)
				window.removeEventListener("scroll", handleScroll)
			}
		}, [mousePosition])

		return (
			<Component
				{...props}
				ref={ref}
				style={{
					...props.style,
					rotate: rotation,
				}}
			/>
		)
	}
}
`,
	},
	{
		name: "Text Encryption Effect",
		tag: "Effects",
		type: COMPONENT,
		description:
			"A sci-fi animated text encryption effect. Includes options for triggering the effect on hover or click in addition to when it appears. Looks best with monospace fonts such as Fragment Mono or Roboto Mono.",
	},
	{
		name: "Animated Number Counter",
		tag: "Effects",
		type: COMPONENT,
		wide: true,
		description: "Animate a number up or down with customizable transitions, start and end values, styling, and more.",
	},
	{
		name: "Confetti",
		tag: "Effects",
		type: COMPONENT,
		free: true,
		description:
			"Add some fun and excitement to your site with a confetti effect! Fire confetti on click, hover, or appear and customize colors and motion.",
	},
	{
		name: "Card Flip",
		tag: "Effects",
		type: COMPONENT,
		description: "Connect a layer for the front and back sides, and flip it over on click or hover.",
	},
	{
		name: "Animated Border",
		tag: "Effects",
		type: COMPONENT,
		free: true,
		description: "A fancy animated gradient border with customizable colors, width, animations, and more.",
	},
	{
		name: "3D Hover",
		tag: "Effects",
		type: COMPONENT,
		description: "Display a layer in with 3D hover and rotation animations.",
	},
	{
		name: "Pulse",
		tag: "Effects",
		type: COMPONENT,
		description: "Create an animated pulse effect around a circle or frame.",
	},
	{
		name: "Image & Video Mask",
		tag: "Effects",
		type: COMPONENT,
		wide: true,
		description:
			"Add an image or video fill to text, SVG icons, and images. Includes full font customization and supports uploading video files or linking to videos by URL.",
	},
	{
		name: "3D Spin",
		tag: "Effects",
		type: COMPONENT,
		free: true,
		description: "Makes a layer spin around continuously in any direction.",
	},
	{
		name: "Hue Cycle",
		tag: "Effects",
		type: COMPONENT,
		description: "Gradually animates a color's hue through the rainbow.",
	},
	{
		name: "Corner Styles",
		tag: "Effects",
		type: COMPONENT,
		description:
			"Squircle, inset rounded, and flat corners. Squircle corners are a smoother form of rounded corners used by Apple on iOS. Flat corners are straight angled corners. Inset rounded corners are the opposite of rounded corners.",
	},
	{
		name: "Text Highlight Color",
		tag: "Effects",
		type: CODE_SNIPPET,
		description: "Change the text selection highlight color in Framer.",
		controls: {
			color: {
				type: ControlType.Color,
				defaultValue: "#0099FF",
			},
			fontColor: {
				type: ControlType.Color,
				defaultValue: "#FFFFFF",
			},
		},
		code: `<style>::selection { background-color: [[color]]; color: [[fontColor]]; }</style>`,
	},
	// {
	// 	name: "Typewriter",
	// 	tag: "Text",
	// 	type: COMPONENT,
	// 	description: "Cycle though a list of text lines by typing them out and deleting them, creating a typing effect.",
	// },
	{
		name: "Truncated Text",
		tag: "Text",
		type: OVERRIDE,
		wide: true,
		free: true,
		description: "Limit text to a certain number of lines and truncate the rest with an ellipsis.",
		controls: {
			lines: {
				type: ControlType.Number,
				min: 1,
				step: 1,
				displayStepper: true,
			},
		},
		code: `import type { ComponentType } from "react"

const lines = [[lines]];

export function TruncatedText(Component): ComponentType {
	return (props) => {
		return (
			<Component
				{...props}
				style={{
					...props.style,
					display: "-webkit-box",
					WebkitLineClamp: lines,
					WebkitBoxOrient: "vertical",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			/>
		)
	}
}`,
	},
	{
		name: "Drop Cap",
		tag: "Text",
		type: OVERRIDE,
		description: "Englarges the first letter of a paragraph to span multiple lines, creating a classic drop cap design.",
		controls: {
			lines: {
				type: ControlType.Number,
				min: 1,
				step: 1,
				displayStepper: true,
			},
			lineHeight: {
				type: ControlType.Number,
				defaultValue: 1.2,
				min: 0,
				step: 0.1,
			},
			lineHeightUnit: {
				type: ControlType.Enum,
				defaultValue: "em",
				options: ["em", "px", "%"],
				displaySegmentedControl: true,
				title: " ",
			},
		},
		code: `import type { ComponentType } from "react";

const lines = [[lines]];
const lineHeight = "[[lineHeight]][[lineHeightUnit]]";

export function DropCap(Component): ComponentType {
	return (props) => {
		const className = \`framestack-dropcap-\${lineCount}-\${lineHeight}\`;

		return (
			<Component {...props} className={props.className + " " + className}>
				{props.children}
				<style>{\`
					@supports (initial-letter: 2) {
						.\${className} p:first-child:first-letter {
							initial-letter: \${lines};
							margin-right: \${0.2 * lines}em;
						}
					}

					@supports not (initial-letter: 2) {
						.\${className} p:first-child:first-letter {
							float: left;
							font-size: calc(\${lines} * \${lineHeight});
							line-height: 1;
							margin-left: -0.05em;
							margin-right: 0.05em;
							margin-bottom: -1px;
						}
					}\`}</style>
			</Component>
		);
	};
}
`,
	},
	// {
	// 	name: "Text Magnifier",
	// 	tag: "Text",
	// 	type: COMPONENT,
	// 	description: "Uses variable fonts to create a text magnifier effect that boldens the section of text that is being hovered.",
	// },
	{
		name: "Text Cycle",
		tag: "Text",
		type: COMPONENT,
		wide: true,
		description:
			"Cycles through a list of text lines by vertically animating between each line, with options for direction, alignment, edge fading, and motion.",
	},
	{
		name: "CMS Item Counter",
		tag: "CMS",
		type: COMPONENT,
		wide: true,
		description:
			"Display the number of items in a CMS collection. Works with Collection List filters for complete control over the items being counted.",
	},
	// {
	// 	name: "Table of Contents",
	// 	tag: "CMS",
	// 	type: COMPONENT,
	// 	description: "Generates an interactive table of contents from the headings in the CMS item's content.",
	// },
	{
		name: "Masonry Layout",
		tag: "CMS",
		type: COMPONENT,
		description: "Layout CMS items in a masonry grid with a configurable number of columns and spacing.",
		componentURL: "https://framer.com/m/MasonryLayout-mJpS.js",
	},
	{
		name: "Article Read Time",
		tag: "CMS",
		type: COMPONENT,
		description: "Show the estimated number of minutes to read an article.",
	},
	{
		name: "Previous & Next Page Buttons",
		tag: "CMS",
		type: COMPONENT,
		wide: true,
		description: "Add buttons to navigate between the previous and next pages in a CMS collection.",
	},
	{
		name: "CMS Slideshow",
		tag: "CMS",
		type: COMPONENT,
		free: true,
		description:
			"A custom version of the Slideshow from Framer's insert menu component that supports connecting a CMS collection to display items in a looping slideshow.",
	},
	{
		name: "CMS Carousel",
		tag: "CMS",
		type: COMPONENT,
		free: true,
		description:
			"A custom version of the Carousel from Framer's insert menu component that supports connecting a CMS collection to display items in a carousel.",
	},
	{
		name: "Customize CMS Images",
		tag: "CMS",
		type: CODE_SNIPPET,
		description: "Add corner radius, border, and shadows to images in CMS text content blocks.",
		controls: {
			radius: {
				type: ControlType.FusedNumber,
				defaultValue: 0,
				toggleKey: "radiusIsMixed",
				toggleTitles: ["All", "Individual"],
				valueKeys: ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"],
				valueLabels: ["TL", "TR", "BR", "BL"],
				min: 0,
			},
			border: {
				type: ControlType.Object,
				optional: true,
				controls: {
					color: {
						type: ControlType.Color,
						defaultValue: "#222",
					},
					width: {
						type: ControlType.FusedNumber,
						defaultValue: 1,
						toggleKey: "widthIsMixed",
						toggleTitles: ["All", "Individual"],
						valueKeys: ["widthTop", "widthRight", "widthBottom", "widthLeft"],
						valueLabels: ["T", "R", "B", "L"],
						min: 0,
					},
					style: {
						type: ControlType.Enum,
						defaultValue: "solid",
						options: ["solid", "dashed", "dotted", "double"],
						optionTitles: ["Solid", "Dashed", "Dotted", "Double"],
					},
				},
			},
			shadows: {
				type: ControlType.BoxShadow,
			},
		},
		code: `<style>
	.framer-text.framer-image {
		border-radius: [[radius]]px;
		border: [[border]];
		box-shadow: [[shadows]];
	}
</style>`,
	},
	{
		name: "Relative Date Label",
		tag: "Date & Time",
		type: COMPONENT,
		wide: true,
		description:
			'Display a date or time label relative to the current date and time. For example, "Two days ago" or "3 weeks from now". You can connect it to a CMS date field to contextualize dates relative to the current date.',
	},
	{
		name: "Current Date Label",
		tag: "Date & Time",
		type: COMPONENT,
		free: true,
		description: "Display today's date in a customizable format.",
	},
	{
		name: "Clock",
		tag: "Date & Time",
		type: COMPONENT,
		free: true,
		description:
			"Display the current time locally or in a specific time zone, with options for formatting and including seconds.",
	},
	{
		name: "Show in Date Range",
		tag: "Date & Time",
		type: COMPONENT,
		description:
			'Show a layer if it\'s within a specified date range. Useful for creating a "new" tag on recently added CMS items.',
	},
	{
		name: "Random Rotation",
		tag: "Randomization",
		type: OVERRIDE,
		free: true,
		description: "Rotate layers randomly on each page load for a creative design effect.",
		controls: {
			min: {
				type: ControlType.Number,
				defaultValue: 0,
				min: 0,
				max: 360,
				step: 0.1,
			},
			max: {
				type: ControlType.Number,
				defaultValue: 360,
				min: 0,
				max: 360,
				step: 0.1,
			},
		},
		code: `import type { ComponentType } from "react";
import { useState, useEffect } from "react";

const min = [[min]];
const max = [[max]];

export function RandomRotation(Component): ComponentType {
	return (props) => {
		const [rotation, setRotation] = useState(0);

		useEffect(() => {
			setRotation(Math.random() * (max - min) + min);
		}, []);

		return <Component {...props} style={{ ...props.style, rotate: rotation }} />;
	};
}
`,
	},
	{
		name: "Shuffle CMS Collection",
		tag: "Randomization",
		type: OVERRIDE,
		description: "Randomize the order of items in a CMS collection list.",
		code: `import type { ComponentType } from "react"
import { useState, useEffect, Children } from "react"
// @ts-ignore
import { useQueryData } from "framer"

// Shuffle the children of a CMS Collection List
export function ShuffleCMSCollectionList(Component): ComponentType {
    return (props) => {
        const query = props.children?.props?.query
        const [shuffledData, setShuffledData] = useState(
            query?.from?.data || []
        )

        if (!query) {
            return <Component {...props} />
        }

        useEffect(() => {
            const data = query?.from?.data
            if (data) {
                const newData = []
                for (const i in data) {
                    newData[i] = data[i]
                }

                setShuffledData(shuffleArray(newData))
            }
        }, [])

        return (
            <Component {...props}>
                {props.children?.props?.children(
                    useQueryData({
                        ...query,
                        from: { ...query?.from, data: shuffledData },
                    })
                )}
            </Component>
        )
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}
`,
	},
	{
		name: "CMS Shuffle Button",
		tag: "Randomization",
		type: COMPONENT_AND_OVERRIDE,
		description: "Shuffle the order of items in a CMS collection list by pressing a button.",
		controls: {
			startOrder: {
				type: ControlType.Enum,
				options: ["default", "random"],
				optionTitles: ["Default", "Random"],
				displaySegmentedControl: true,
			},
		},
		code: ``,
	},
	{
		name: "Show Random Layer",
		tag: "Randomization",
		type: COMPONENT,
		description: "Show a random layer from a list of layers.",
	},
	{
		name: "Shuffle Stack & Grid",
		tag: "Randomization",
		type: OVERRIDE,
		free: true,
		description: "Randomize the order of items in a stack or grid layout.",
		code: `import type { ComponentType } from "react"
import { useState, useEffect, Children } from "react"

export function Shuffle(Component): ComponentType {
    return (props) => {
        const { children, ...otherProps } = props
        const childrenArray = Children.toArray(children)
        const [shuffledChildren, setShuffledChildren] = useState([])

        useEffect(() => {
            setShuffledChildren(shuffleArray(childrenArray))
        }, [])

        return <Component {...otherProps}>{shuffledChildren}</Component>
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}`,
	},
	{
		name: "Random CMS Item",
		tag: "Randomization",
		type: COMPONENT,
		description: "Show a random item from a CMS collection.",
	},
];

export const tags = ["Utility", "Text", "CMS", "Themes", "Images", "Date & Time", "Effects", "Randomization"];

export const componentsByName = {};
for (const component of components) {
	componentsByName[component.name] = component;
}

export const icons = {
	FramerForms: (
		<svg width="16" height="16" viewBox="0 0 83 83" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M82.0509 37.859V0H46.7833C20.9451 0 0 21.1817 0 47.3194V82.9941H82.0509V37.8738C82.042 62.7983 62.0679 83 37.4279 83V37.862L82.0509 37.859Z"
				fill="currentColor"
			/>
		</svg>
	),
	Superfields: (
		<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M12.0415 6.36377H1.96515L0.798938 7.74835C0.652839 7.92562 0.55485 8.14908 0.517214 8.39081C0.479579 8.63254 0.503966 8.88182 0.587327 9.10751C0.670688 9.3332 0.809327 9.52529 0.985924 9.65977C1.16252 9.79426 1.36924 9.86519 1.58027 9.86368H12.4214C12.6323 9.8648 12.8388 9.79361 13.0151 9.65897C13.1915 9.52434 13.3298 9.33223 13.413 9.10662C13.4962 8.88101 13.5204 8.63189 13.4827 8.39034C13.445 8.14879 13.3471 7.9255 13.2011 7.74835L12.0415 6.36377Z"
				fill="#26010A"
			/>
			<path
				d="M12.0415 10.5H1.96515L0.798938 11.8846C0.652839 12.0619 0.55485 12.2853 0.517214 12.527C0.479579 12.7688 0.503966 13.0181 0.587327 13.2437C0.670688 13.4694 0.809327 13.6615 0.985924 13.796C1.16252 13.9305 1.36924 14.0014 1.58027 13.9999H12.4214C12.6323 14.001 12.8388 13.9298 13.0151 13.7952C13.1915 13.6606 13.3298 13.4685 13.413 13.2428C13.4962 13.0172 13.5204 12.7681 13.4827 12.5266C13.445 12.285 13.3471 12.0617 13.2011 11.8846L12.0415 10.5Z"
				fill="#26010A"
			/>
			<path
				d="M1.58746 5.72717H12.4138C13.3706 5.72717 13.8589 4.8058 13.1925 4.2595L10.9853 2.42329L8.77975 0.595223C8.7185 0.544171 8.65463 0.496272 8.5884 0.451717C8.52295 0.407512 8.45522 0.366688 8.3855 0.329412C8.3558 0.313104 8.32611 0.296797 8.29642 0.283751L8.25848 0.264182L8.20569 0.241351C8.18433 0.23022 8.1623 0.220417 8.13971 0.211998H8.12651C8.08032 0.192429 8.03083 0.174491 7.98299 0.156553L7.83783 0.109262H7.81473C7.76194 0.0945849 7.70751 0.0815386 7.64977 0.0701234C7.59204 0.0587082 7.5376 0.0472929 7.48481 0.0375084C7.16568 -0.0125028 6.84057 -0.0125028 6.52144 0.0375084C6.46205 0.0472929 6.40267 0.0587086 6.34493 0.0717545C6.22717 0.0972508 6.1114 0.131039 5.99851 0.17286C5.94243 0.192429 5.88634 0.215259 5.83355 0.23809C5.76016 0.268911 5.68857 0.303754 5.6191 0.342458L5.54157 0.386487L5.46569 0.433779L5.39146 0.482701L5.31888 0.534886L5.22485 0.608269L3.01602 2.42329L0.807197 4.25298C0.139105 4.8058 0.633987 5.72717 1.58746 5.72717Z"
				fill="#26010A"
			/>
		</svg>
	),
	Home: (
		<svg width="20" height="20" viewBox="0 0 140 116" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M6.20474 51.1632L16.546 51.1632C18.4422 51.148 20.2041 52.0719 21.2955 53.6536L45.1687 88.2161C48.4625 92.6133 53.595 95.3045 59.1106 95.5264L101.066 95.4805C102.962 95.4653 104.724 96.3891 105.815 97.9708L111.623 106.389C114.935 111.187 112.873 115.12 107.03 115.149L45.639 115.196C42.0195 114.959 38.6745 113.205 36.4465 110.376L1.58523 59.8277C-1.73876 54.9914 0.33628 51.1796 6.20474 51.1632ZM19.6326 25.6572L29.938 25.6228C31.8341 25.6076 33.596 26.5315 34.6874 28.1132L58.5607 62.6757C61.8545 67.0729 66.9869 69.7641 72.5025 69.986L114.457 69.9401C116.354 69.9249 118.116 70.8488 119.207 72.4305L125.015 80.8487C128.327 85.6461 126.265 89.5794 120.422 89.6091L59.0309 89.656C55.4114 89.4188 52.0664 87.6649 49.8385 84.836L14.9772 34.2874C11.6532 29.451 13.7641 25.6735 19.6326 25.6572Z"
				fill="currentColor"
			/>
			<path
				d="M94.4031 0.0309595C98.0104 0.229195 101.355 1.98314 103.57 4.83758L138.419 55.3473C141.731 60.1447 139.669 64.0779 133.826 64.1076L72.435 64.1545C68.8155 63.9173 65.4705 62.1634 63.2426 59.3345L28.3813 8.78589C25.0573 3.94955 27.1196 0.0163339 32.9881 0L94.4031 0.0309595Z"
				fill="currentColor"
			/>
		</svg>
	),
	Utility: (
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
			<path
				d="M 13.938 8 C 13.938 8.558 14.132 9.098 14.486 9.529 L 14.805 9.916 C 15.07 10.238 15.107 10.69 14.899 11.051 L 14.092 12.449 C 13.883 12.81 13.473 13.004 13.062 12.935 L 12.567 12.853 C 12.016 12.761 11.452 12.864 10.969 13.143 L 10.969 13.143 C 10.486 13.423 10.115 13.861 9.919 14.383 L 9.743 14.851 C 9.597 15.241 9.224 15.5 8.807 15.5 L 7.193 15.5 C 6.776 15.5 6.403 15.241 6.257 14.851 L 6.081 14.383 C 5.885 13.861 5.514 13.423 5.031 13.143 L 5.031 13.143 C 4.548 12.864 3.984 12.761 3.433 12.853 L 2.938 12.935 C 2.527 13.004 2.117 12.81 1.908 12.449 L 1.101 11.051 C 0.893 10.69 0.93 10.238 1.195 9.916 L 1.514 9.529 C 1.868 9.098 2.062 8.558 2.062 8 L 2.062 8 C 2.062 7.442 1.868 6.902 1.514 6.471 L 1.195 6.084 C 0.93 5.762 0.893 5.31 1.101 4.949 L 1.908 3.551 C 2.117 3.19 2.527 2.996 2.938 3.065 L 3.433 3.147 C 3.984 3.239 4.548 3.136 5.031 2.857 L 5.031 2.857 C 5.514 2.577 5.885 2.139 6.081 1.617 L 6.257 1.149 C 6.403 0.759 6.776 0.5 7.193 0.5 L 8.807 0.5 C 9.224 0.5 9.597 0.759 9.743 1.149 L 9.919 1.617 C 10.115 2.139 10.486 2.577 10.969 2.857 L 10.969 2.857 C 11.452 3.136 12.016 3.239 12.567 3.147 L 13.062 3.065 C 13.473 2.996 13.883 3.19 14.092 3.551 L 14.899 4.949 C 15.107 5.31 15.07 5.762 14.805 6.084 L 14.486 6.471 C 14.132 6.902 13.938 7.442 13.938 8 Z M 5 8 C 5 9.657 6.343 11 8 11 C 9.657 11 11 9.657 11 8 C 11 6.343 9.657 5 8 5 C 6.343 5 5 6.343 5 8 Z"
				fill="currentColor"
			></path>
		</svg>
		// <svg
		// 	xmlns="http://www.w3.org/2000/svg"
		// 	width="20"
		// 	height="20"
		// 	viewBox="0 0 24 24"
		// 	fill="none"
		// 	stroke="currentColor"
		// 	strokeWidth="2"
		// 	strokeLinecap="round"
		// 	strokeLinejoin="round"
		// >
		// 	<path d="M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4" />
		// 	<path d="M14.5 5.5l4 4" />
		// 	<path d="M12 8l-5 -5l-4 4l5 5" />
		// 	<path d="M7 8l-1.5 1.5" />
		// 	<path d="M16 12l5 5l-4 4l-5 -5" />
		// 	<path d="M16 17l-1.5 1.5" />
		// </svg>
	),
	Images: (
		<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 22 22">
			<path
				d="M 10.838 9.29 C 10.444 8.683 9.556 8.683 9.162 9.29 L 4.504 16.455 C 4.072 17.12 4.549 18 5.343 18 L 14.657 18 C 15.451 18 15.928 17.12 15.496 16.455 Z"
				fill="currentColor"
			></path>
			<path
				d="M 16 4 C 17.105 4 18 4.895 18 6 C 18 7.105 17.105 8 16 8 C 14.895 8 14 7.105 14 6 C 14 4.895 14.895 4 16 4 Z"
				fill="currentColor"
			></path>
		</svg>
		// <svg
		//     xmlns="http://www.w3.org/2000/svg"
		//     width="20"
		//     height="20"
		//     viewBox="0 0 24 24"
		//     fill="currentColor"
		// >
		//     <path d="M8.813 11.612c.457 -.38 .918 -.38 1.386 .011l.108 .098l4.986 4.986l.094 .083a1 1 0 0 0 1.403 -1.403l-.083 -.094l-1.292 -1.293l.292 -.293l.106 -.095c.457 -.38 .918 -.38 1.386 .011l.108 .098l4.674 4.675a4 4 0 0 1 -3.775 3.599l-.206 .005h-12a4 4 0 0 1 -3.98 -3.603l6.687 -6.69l.106 -.095zm9.187 -9.612a4 4 0 0 1 3.995 3.8l.005 .2v9.585l-3.293 -3.292l-.15 -.137c-1.256 -1.095 -2.85 -1.097 -4.096 -.017l-.154 .14l-.307 .306l-2.293 -2.292l-.15 -.137c-1.256 -1.095 -2.85 -1.097 -4.096 -.017l-.154 .14l-5.307 5.306v-9.585a4 4 0 0 1 3.8 -3.995l.2 -.005h12zm-2.99 5l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007z" />
		// </svg>
	),
	Text: (
		<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="currentColor">
			<path d="M7 10a1 1 0 0 1 1-1h14a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1ZM7 15a1 1 0 0 1 1-1h14a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1ZM7 20a1 1 0 0 1 1-1h10a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1Z"></path>
		</svg>
		// <svg
		//     xmlns="http://www.w3.org/2000/svg"
		//     width="20"
		//     height="20"
		//     viewBox="0 0 24 24"
		//     fill="none"
		//     stroke="currentColor"
		//     strokeWidth="2"
		//     strokeLinecap="round"
		//     strokeLinejoin="round"
		// >
		//     <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
		//     <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
		//     <path d="M16 5l3 3" />
		// </svg>
	),
	CMS: (
		<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
			<path
				d="M 15.062 6.8 C 19.038 6.8 22.262 8.311 22.262 10.175 C 22.262 12.039 19.038 13.55 15.062 13.55 C 11.085 13.55 7.862 12.039 7.862 10.175 C 7.862 8.311 11.085 6.8 15.062 6.8 Z"
				fill="currentColor"
			></path>
			<path
				d="M 22.262 12.56 L 22.262 15.26 C 22.262 17.124 19.038 18.635 15.062 18.635 C 11.085 18.635 7.862 17.124 7.862 15.26 L 7.862 12.56 L 7.877 12.56 C 8.124 14.319 11.246 15.71 15.062 15.71 C 18.877 15.71 21.999 14.319 22.246 12.56 Z"
				fill="currentColor"
			></path>
			<path
				d="M 22.262 17.6 L 22.262 20.3 C 22.262 22.164 19.038 23.675 15.062 23.675 C 11.085 23.675 7.862 22.164 7.862 20.3 L 7.862 17.6 L 7.877 17.6 C 8.124 19.359 11.246 20.75 15.062 20.75 C 18.877 20.75 21.999 19.359 22.246 17.6 Z"
				fill="currentColor"
			></path>
		</svg>
	),
	Effects: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
		</svg>
	),
	Themes: (
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 1.992a10 10 0 1 0 9.236 13.838c.341 -.82 -.476 -1.644 -1.298 -1.31a6.5 6.5 0 0 1 -6.864 -10.787l.077 -.08c.551 -.63 .113 -1.653 -.758 -1.653h-.266l-.068 -.006l-.06 -.002z" />
		</svg>
	),
	"Date & Time": (
		<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 22 22">
			<path
				d="M 5 8 C 5 6.343 6.343 5 8 5 L 14 5 C 15.657 5 17 6.343 17 8 L 17 8 C 17 8.552 16.552 9 16 9 L 6 9 C 5.448 9 5 8.552 5 8 Z"
				fill="white"
			></path>
			<path
				d="M 5 11 C 5 10.448 5.448 10 6 10 L 16 10 C 16.552 10 17 10.448 17 11 L 17 14 C 17 15.657 15.657 17 14 17 L 8 17 C 6.343 17 5 15.657 5 14 Z"
				fill="white"
			></path>
		</svg>
	),
	Randomization: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M18 4l3 3l-3 3" />
			<path d="M18 20l3 -3l-3 -3" />
			<path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5" />
			<path d="M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3" />
		</svg>
	),
};
