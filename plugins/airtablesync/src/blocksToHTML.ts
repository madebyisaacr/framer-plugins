const PrefixTags = {
	"###": "h1",
	"##": "h2",
	"#": "h3",
	"[ ]": "ul",
	"[x]": "ul",
	"-": "ul",
	">": "blockquote",
};

export function richTextToHTML(richText: string) {
	let lines: string[] = [];

	for (const line of richText.split("\n")) {
		const [tag, text] = getTextAndTag(line, false);
		if (tag) {
			lines.push(`<${tag}>${text}</${tag}>`);
		} else {
			lines.push(text);
		}
	}

	return lines.join("\n");
}

export function richTextToPlainText(richText: string) {
	let lines: string[] = [];

	for (const line of richText.split("\n")) {
		if (line == "```") {
			continue;
		}

		const [tag, text] = getTextAndTag(line, true);
		lines.push(text);
	}

	return lines.join("\n");
}

function getTextAndTag(text: string, removeMarkdown: boolean) {
	for (const prefix in PrefixTags) {
		if (text.startsWith(prefix + " ")) {
			const newText = text.slice(prefix.length + 1);
			return [PrefixTags[prefix], markdownToText(newText, removeMarkdown)];
		}
	}

	return [null, markdownToText(text, removeMarkdown)];
}

function markdownToText(line: string, removeMarkdown: boolean) {
	console.log("to html", line);
	// Convert bold
	line = line.replace(/(\*\*|__)((?:\\[\s\S]|[^\\])+?)\1/g, removeMarkdown ? "$2" : "<strong>$2</strong>");

	// Convert italics
	line = line.replace(/(\*|_)((?:\\[\s\S]|[^\\])+?)\1/g, removeMarkdown ? "$2" : "<em>$2</em>");

	// Convert strikethrough
	line = line.replace(/~~((?:\\[\s\S]|[^\\])+?)~~/g, removeMarkdown ? "$1" : "<del>$1</del>");

	// Convert links
	line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, removeMarkdown ? "$1" : '<a href="$2">$1</a>');

	// Convert inline code
	line = line.replace(/`((?:\\[\s\S]|[^\\])+?)`/g, removeMarkdown ? "$1" : "<code>$1</code>");

	return line;
}
