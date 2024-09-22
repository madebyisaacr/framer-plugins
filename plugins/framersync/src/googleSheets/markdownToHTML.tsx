const PrefixTags = {
	"#": "h1",
	"##": "h2",
	"###": "h3",
	"####": "h4",
	"#####": "h5",
	"######": "h6",
	"[ ]": "ul",
	"[x]": "ul",
	"-": "ul",
	"*": "ul",
	">": "blockquote",
};

export function markdownToHTML(richText: string) {
	let lines: string[] = [];
	let listStack: { type: string; level: number }[] = [];
	let currentListType: string | null = null;
	let inCodeBlock = false;
	let codeBlockContent: string[] = [];
	let codeBlockLanguage: string | null = null;
	let currentParagraph: string[] = [];

	for (const line of richText.split("\n")) {
		// Dividers
		if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
			lines.push("<hr>");
			continue;
		}

		if (line.trim().startsWith("```")) {
			if (inCodeBlock) {
				const identifier = "module:pVk4QsoHxASnVtUBp6jr/TbhpORLndv1iOkZzyo83/CodeBlock.js:default";
				const props = {
					code: {
						type: "string",
						value: codeBlockContent.join("\n"),
					},
					language: {
						type: "enum",
						value: codeBlockLanguage || "JSX",
					},
				};

				lines.push(
					`<template data-module-identifier="${identifier}" data-module-props='${JSON.stringify(
						props
					)}'></template>`
				);
				codeBlockContent = [];
				codeBlockLanguage = null;
			} else {
				const languageMatch = line.trim().match(/^```(\w+)/);
				codeBlockLanguage = languageMatch ? languageMatch[1] : null;
				if (codeBlockLanguage && !framerCodeLanguages.includes(codeBlockLanguage)) {
					codeBlockLanguage = "JSX";
				}
			}
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			codeBlockContent.push(line);
			continue;
		}

		// Handle empty lines
		if (line.trim() === '') {
			if (currentParagraph.length > 0) {
				lines.push(`<p>${currentParagraph.join(' ')}</p>`);
				currentParagraph = [];
			}
			continue;
		}

		// Add support for markdown images
		const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
		if (imageMatch) {
			const altText = imageMatch[1];
			const imageUrl = imageMatch[2];
			lines.push(`<img src="${imageUrl}" alt="${altText}">`);
			continue;
		}

		const [tag, text, isNumbered, indentLevel] = getTextAndTag(line);

		// Close lists if needed
		while (listStack.length > 0 && listStack[listStack.length - 1].level > indentLevel) {
			lines.push(`</${listStack.pop().type}>`);
		}

		if (tag === "ul" || isNumbered) {
			const newListType = isNumbered ? "ol" : "ul";

			if (listStack.length === 0 || listStack[listStack.length - 1].level < indentLevel) {
				lines.push(`<${newListType}>`);
				listStack.push({ type: newListType, level: indentLevel });
				currentListType = newListType;
			} else if (listStack[listStack.length - 1].type !== newListType) {
				if (currentListType !== newListType) {
					lines.push(`</${currentListType}>`);
					lines.push(`<${newListType}>`);
					currentListType = newListType;
				}
			}

			lines.push(`<li>${text}</li>`);
		} else {
			if (currentListType) {
				lines.push(`</${currentListType}>`);
				currentListType = null;
			}
			if (tag) {
				lines.push(`<${tag}>${text}</${tag}>`);
			} else {
				currentParagraph.push(text);
			}
		}
	}

	// Handle any remaining paragraph content
	if (currentParagraph.length > 0) {
		lines.push(`<p>${currentParagraph.join(' ')}</p>`);
	}

	// Close any remaining open lists
	if (currentListType) {
		lines.push(`</${currentListType}>`);
	}
	while (listStack.length > 0) {
		lines.push(`</${listStack.pop().type}>`);
	}

	return lines.join("\n");
}

function getTextAndTag(text: string) {
	const indentMatch = text.match(/^(\s*)/);
	const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 4) : 0;
	text = text.trim();

	for (const prefix in PrefixTags) {
		if (text.startsWith(prefix + " ")) {
			const newText = text.slice(prefix.length + 1);
			return [PrefixTags[prefix], markdownToText(newText), false, indentLevel];
		}
	}

	// Check for numbered list
	const numberedListMatch = text.match(/^(\d+)\.\s(.+)/);
	if (numberedListMatch) {
		return [null, markdownToText(numberedListMatch[2]), true, indentLevel];
	}

	return [null, markdownToText(text), false, indentLevel];
}

function markdownToText(line: string) {
	const removeMarkdown = false;

	// Convert bold
	line = line.replace(
		/(\*\*|__)((?:\\[\s\S]|[^\\])+?)\1/g,
		removeMarkdown ? "$2" : "<strong>$2</strong>"
	);

	// Convert italics
	line = line.replace(/(\*|_)((?:\\[\s\S]|[^\\])+?)\1/g, removeMarkdown ? "$2" : "<em>$2</em>");

	// Convert strikethrough
	line = line.replace(/~~((?:\\[\s\S]|[^\\])+?)~~/g, removeMarkdown ? "$1" : "<del>$1</del>");

	// Convert links
	line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, removeMarkdown ? "$1" : '<a href="$2">$1</a>');

	// Convert inline code
	line = line.replace(/`((?:\\[\s\S]|[^\\])+?)`/g, removeMarkdown ? "$1" : "<code>$1</code>");

	// Remove image syntax from text
	line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, removeMarkdown ? "$1" : "");

	// Convert URLs and email addresses in angle brackets
	line = line.replace(/<(https?:\/\/[^\s>]+)>/g, removeMarkdown ? "$1" : '<a href="$1">$1</a>');
	line = line.replace(/<([^\s>]+@[^\s>]+)>/g, removeMarkdown ? "$1" : '<a href="mailto:$1">$1</a>');

	return line;
}

const framerCodeLanguages = [
	"Angular",
	"C",
	"C#",
	"C++",
	"CSS",
	"Go",
	"Haskell",
	"HTML",
	"Java",
	"JavaScript",
	"JSX",
	"Julia",
	"Kotlin",
	"Less",
	"Lua",
	"Markdown",
	"MATLAB",
	"Nginx",
	"Objective-C",
	"Perl",
	"PHP",
	"Python",
	"Ruby",
	"Rust",
	"Scala",
	"SCSS",
	"Shell",
	"SQL",
	"Swift",
	"TSX",
	"TypeScript",
	"Vue",
	"YAML",
]
