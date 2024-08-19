enum PrefixTags {
	"###" = "h1",
	"##" = "h2",
	"#" = "h3",
	"[ ]" = "ul",
	"[x]" = "ul",
	"-" = "ul",
	">" = "blockquote",
}

export function richTextToHTML(richText: string) {
	let html = "";

	for (const line of richText.split("\n")) {
		const [tag, text] = getTextAndTag(line);
		if (tag) {
			html += `<${tag}>${text}</${tag}>`;
		} else {
			html += text;
		}
	}

	return html;
}

export function richTextToPlainText(richText: string) {
	let plainText = "";

	for (const line of richText.split("\n")) {
		const [tag, text] = getTextAndTag(line);
		
		plainText += text;
	}

	return plainText;
}

function getTextAndTag(text: string) {
	for (const prefix in PrefixTags) {
		if (text.startsWith(prefix + " ")) {
			return [PrefixTags[prefix], text.slice(prefix.length + 1)];
		}
	}

	return [null, text];
}
