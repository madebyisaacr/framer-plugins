const videoURL = "https://framerusercontent.com/assets/jJ7GProNLEEkQw0A6ozYjFRc7DI.mp4";

export default function CanvasPage() {
	return (
		<div className="size-full px-3 pb-3 flex flex-col gap-2">
			<div className="flex flex-col gap-2 text-center items-center justify-center flex-1">
				<h1 className="text-xl font-bold">Welcome to FramerSync!</h1>
				<p className="max-w-[400px]">
					To connect your website with data from Notion, Airtable or Google Sheets, open the Framer
					CMS editor, click <strong>Add...</strong>, then <strong>Import via Plugin</strong>, and
					select <strong>FramerSync</strong>.
				</p>
				<p>Here's a quick video showing you how to get started:</p>
			</div>
			<video
				src={videoURL}
				className="w-full rounded"
				muted
				autoPlay
				loop
				style={{
					boxShadow: "0 10px 20px 0 rgba(0, 0, 0, 0.05)",
				}}
			/>
		</div>
	);
}
