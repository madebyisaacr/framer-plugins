export function getGooglePickerHTML({ accessToken, developerAPIKey, pickerCallbackURL }) {
	return `<html>
<head>
	<title>Select a Google Sheet - FramerSync</title>
	<script type="text/javascript" src="https://apis.google.com/js/api.js"></script>
	<script type="text/javascript" src="https://apis.google.com/js/platform.js"></script>
</head>
<body>
	<div id="picker"></div>
	<script>
		function loadPicker() {
			gapi.load('picker', { callback: createPicker });
		}

		function createPicker() {
			const picker = new google.picker.PickerBuilder()
				.addView(google.picker.ViewId.SPREADSHEETS)
				.setOAuthToken('${accessToken}')
				.setDeveloperKey('${developerAPIKey}')
				.setCallback(pickerCallback)
				.build();
			picker.setVisible(true);
		}

		function pickerCallback(data) {
			if (data.action == google.picker.Action.PICKED) {
				fetch('${pickerCallbackURL}', {
					method: 'POST',
					body: JSON.stringify({
						file: data.docs[0],
					}),
				}).then((response) => {
					console.log(response);
					// window.close();
				});
			}
		}

		loadPicker();
	</script>
</body>
</html>`;
}
