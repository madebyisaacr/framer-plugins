import Window from "./Window";
import Button from "@shared/Button";
import BackButton from "../components/BackButton";
import { useState, useEffect } from "react";
import { framer } from "framer-plugin";

const checkoutURL = "https://store.framestack.co/buy/24b67220-4e17-478b-9a4a-9cbf0e2db171";

export function LicenceKeyPage({ closePage, checkout = false }) {
	const [showCheckout, setShowCheckout] = useState(checkout);

	useEffect(() => {
		framer.showUI({
			width: showCheckout ? 1000 : 400,
			height: showCheckout ? 800 : 550,
		});
	}, [showCheckout]);

	const onCheckoutBackButtonClick = () => {
		if (checkout) {
			closePage();
		} else {
			setShowCheckout(false);
		}
	};

	return showCheckout ? (
		<div className="size-full flex-col">
			<div className="flex-row items-center px-3 pb-3 gap-2">
				<Button className="w-fit" onClick={onCheckoutBackButtonClick}>
					<BackButton className="pr-0 !text-secondary" />
				</Button>
				<a
					href={checkoutURL}
					target="_blank"
					className="px-2 h-6 rounded bg-secondary w-full cursor-pointer flex-row items-center justify-between"
				>
					<span className="text-secondary">{checkoutURL}</span>
					<span className="flex-row gap-1 text-secondary items-center">
						Secure checkout by <LemonSqueezyLogo />
					</span>
				</a>
			</div>
			<div className="w-full min-h-px bg-divider" />
			<iframe src={checkoutURL} className="w-full flex-1 border-none" title="FramerSync Checkout" />
		</div>
	) : (
		<Window page="LicenceKey" className="flex-col justify-center px-3 pb-3 gap-2">
			<BackButton onClick={closePage} />
			<div className="flex-col gap-2 flex-1 items-center justify-center w-full">
				<h1 className="font-semibold text-sm">Enter your Licence Key</h1>
				<input type="text" className="w-full" placeholder="Licence Key" />
			</div>
			<div className="flex-col gap-1 bg-secondary rounded p-3 text-secondary">
				<span className="font-semibold text-primary">
					Get lifetime access to FramerSync for a one-time payment of $49.
				</span>
				<ul className="list-disc pl-4">
					<li>Includes all future updates and improvements.</li>
					<li>One license key enables syncing unlimited collections in a single Framer project.</li>
				</ul>
			</div>
			<Button primary onClick={() => setShowCheckout(true)} className="w-full">
				Get a Licence Key
			</Button>
		</Window>
	);
}

function LemonSqueezyLogo() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={212 * 0.5}
			height={28 * 0.5}
			viewBox="0 0 212 28"
			fill="none"
			className="text-primary"
		>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M42.5841 13.854H48.8876C48.4678 12.2526 47.3178 11.6033 45.9172 11.6033C44.3772 11.6033 43.143 12.4427 42.5841 13.854ZM52.5858 16.5927H42.3605C42.7803 18.6553 44.5164 19.4153 46.029 19.4153C47.934 19.4153 48.7484 18.2756 48.7484 18.2756H52.2777C51.2124 20.9877 48.664 22.4787 45.9173 22.4787C42.1347 22.4787 38.8291 19.6848 38.8291 15.4551C38.8291 11.25 42.1072 8.646 45.8053 8.646C49.3918 8.646 53.0352 11.0598 52.5858 16.5927Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M87.323 15.5632C87.323 13.4473 86.0341 11.7932 83.9054 11.7932C81.7749 11.7932 80.3465 13.4473 80.3465 15.5632C80.3465 17.6791 81.7749 19.3333 83.9054 19.3333C86.0341 19.3333 87.323 17.6791 87.323 15.5632ZM76.6758 15.5896C76.6758 11.25 80.1503 8.646 83.9053 8.646C87.6879 8.646 90.9935 11.2764 90.9935 15.5345C90.9935 19.848 87.5738 22.4784 83.7915 22.4784C79.9814 22.4784 76.6758 19.848 76.6758 15.5896Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M105.991 14.9937V22.3439H102.263V15.8064C102.263 15.3449 102.601 11.9279 99.9107 11.7935C98.5922 11.7117 96.2398 12.416 96.2398 15.9699V22.3439H92.542V8.78076H95.9366L95.9477 10.6636C95.9477 10.6636 97.4783 8.646 100.333 8.646C103.947 8.646 105.991 11.25 105.991 14.9937Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M119.617 11.5216C118.44 11.5216 117.936 12.0914 117.936 12.6613C117.936 13.5824 119.197 13.854 120.037 14.0175C122.533 14.5319 125.054 15.2653 125.054 18.1385C125.054 20.9326 122.672 22.4787 119.786 22.4787C116.565 22.4787 114.071 20.5814 113.902 17.7058H117.347C117.432 18.5185 117.993 19.5764 119.702 19.5764C121.13 19.5764 121.468 18.8455 121.468 18.2756C121.468 17.2707 120.486 16.9724 119.533 16.7559C117.881 16.4026 114.322 15.7534 114.322 12.6613C114.322 10.0022 116.957 8.646 119.674 8.646C122.811 8.646 124.885 10.4903 125.054 12.7694H121.606C121.495 12.3079 121.048 11.5216 119.617 11.5216Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M136.381 15.5632C136.381 13.3105 135.119 11.983 133.299 11.983C131.59 11.983 129.879 13.1757 129.879 15.5632C129.879 17.9487 131.59 19.1434 133.299 19.1434C135.119 19.1434 136.381 17.8139 136.381 15.5632ZM139.883 8.78076V27.7681H136.381V21.0141C135.485 21.9903 134.223 22.4784 132.765 22.4784C129.209 22.4784 126.238 19.6582 126.238 15.5632C126.238 11.4662 129.209 8.646 132.765 8.646C135.561 8.646 136.608 10.4625 136.608 10.4625L136.602 8.78076H139.883Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M159.904 13.854H166.208C165.788 12.2526 164.638 11.6033 163.238 11.6033C161.698 11.6033 160.463 12.4427 159.904 13.854ZM169.906 16.5927H159.679C160.101 18.6553 161.837 19.4153 163.349 19.4153C165.254 19.4153 166.069 18.2756 166.069 18.2756H169.598C168.533 20.9877 165.984 22.4787 163.238 22.4787C159.455 22.4787 156.149 19.6848 156.149 15.4551C156.149 11.25 159.428 8.646 163.126 8.646C166.712 8.646 170.356 11.0598 169.906 16.5927Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M174.79 13.854H181.093C180.674 12.2526 179.524 11.6033 178.123 11.6033C176.583 11.6033 175.349 12.4427 174.79 13.854ZM184.792 16.5927H174.567C174.986 18.6553 176.722 19.4153 178.235 19.4153C180.14 19.4153 180.954 18.2756 180.954 18.2756H184.484C183.418 20.9877 180.87 22.4787 178.123 22.4787C174.341 22.4787 171.035 19.6848 171.035 15.4551C171.035 11.25 174.313 8.646 178.011 8.646C181.598 8.646 185.241 11.0598 184.792 16.5927Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M197.267 19.3069V22.3436H185.36V20.5527L192.113 11.8198H185.641V8.78076H196.988V10.5717L190.235 19.3069H197.267Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M211.844 8.78076V20.7161V20.9877C211.844 24.6497 209.909 27.9053 205.119 27.9053C200.636 27.9053 198.199 25.056 198.199 22.9138H201.701C201.701 22.9138 202.233 24.7314 205.007 24.7314C207.361 24.7314 208.342 23.4282 208.342 21.5309V20.9611C207.724 21.6393 206.549 22.4787 204.448 22.4787C200.777 22.4787 198.48 19.9034 198.48 16.1331L198.45 8.78076H202.093V15.3183C202.093 17.1623 202.767 19.3336 205.091 19.3336C206.296 19.3336 208.285 18.7637 208.285 15.1548V8.78076H211.844Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M36.1625 18.2723C36.1625 19.1181 36.4957 19.467 37.114 19.467C37.5496 19.467 37.8326 19.4164 38.2453 19.2926L38.476 22.0799C37.7047 22.3272 36.9589 22.4774 36.0074 22.4774C33.8242 22.4774 32.4873 21.7817 32.4873 18.7693V3.35645H36.1625V18.2723Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M75.0944 14.9937V22.3439H71.3665V15.8064C71.3665 13.9357 71.563 11.5749 68.9848 11.7935C68.3142 11.8465 66.4639 12.1444 66.4639 15.9699V22.3439H62.7658V15.8064C62.7658 13.9357 62.9619 11.5749 60.3841 11.7935C59.711 11.8465 57.8632 12.1444 57.8632 15.9699V22.3439H54.165V8.78075H57.56L57.5631 10.6636C57.5631 10.6636 58.8605 8.64599 61.2805 8.64599C64.1966 8.64599 65.3412 10.8424 65.3412 10.8424C65.3412 10.8424 66.5967 8.61963 69.7992 8.61963C73.4405 8.61963 75.0944 11.2236 75.0944 14.9937Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M141.455 16.131V8.78076H145.183V15.3183C145.183 15.7797 144.845 19.1967 147.535 19.3312C148.854 19.413 151.206 18.7086 151.206 15.1548V8.78076H154.904V22.3439H151.514L151.498 20.4611C151.498 20.4611 149.967 22.4787 147.113 22.4787C143.499 22.4787 141.455 19.8747 141.455 16.131Z"
				fill="currentColor"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M6.92882 17.1856L14.4401 20.6583C15.3711 21.0889 16.0282 21.8116 16.3831 22.6406C17.2807 24.7399 16.0539 26.8869 14.1281 27.6591C12.2019 28.4309 10.1491 27.9342 9.21568 25.7511L5.94677 18.0866C5.69346 17.4925 6.3298 16.9087 6.92882 17.1856Z"
				fill="#FFC233"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M7.37906 14.9376L15.1327 12.0066C17.7096 11.0325 20.5245 12.8756 20.4865 15.5536C20.4859 15.5886 20.4853 15.6235 20.4844 15.6588C20.4287 18.2666 17.6921 20.0194 15.1718 19.0968L7.3864 16.2473C6.76536 16.0201 6.76077 15.1713 7.37906 14.9376Z"
				fill="#FFC233"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M6.94499 13.9224L14.5671 10.6837C17.0999 9.60736 17.7427 6.37695 15.759 4.51043C15.733 4.48585 15.707 4.46156 15.6807 4.43728C13.7358 2.63207 10.5208 3.26767 9.41358 5.64539L5.99323 12.9915C5.72033 13.5773 6.3371 14.1806 6.94499 13.9224Z"
				fill="#FFC233"
			/>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				d="M4.98349 12.6426L7.75465 5.04415C8.09822 4.102 8.03458 3.1412 7.67939 2.3122C6.77994 0.21378 4.34409 -0.463579 2.41853 0.309741C0.493284 1.08336 -0.594621 2.84029 0.340622 5.02253L3.63095 12.6787C3.8861 13.272 4.76261 13.2486 4.98349 12.6426Z"
				fill="#FFC233"
			/>
		</svg>
	);
}