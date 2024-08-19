import { BlockObjectResponse, RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import { assert } from "./utils";

export function richTextToHTML(texts: RichTextItemResponse[]) {
	return texts
		.map(({ plain_text, annotations, href }) => {
			let html = plain_text;

			// Apply formatting based on annotations
			if (annotations.bold) {
				html = `<strong>${html}</strong>`;
			}
			if (annotations.italic) {
				html = `<em>${html}</em>`;
			}
			if (annotations.strikethrough) {
				html = `<s>${html}</s>`;
			}
			if (annotations.underline) {
				html = `<u>${html}</u>`;
			}

			if (annotations.code) {
				html = `<code>${html}</code>`;
			}

			if (annotations.color !== "default") {
				const color = annotations.color.replace("_", "");
				html = `<span style="color:${color}">${html}</span>`;
			}

			if (href) {
				html = `<a href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
			}

			return html;
		})
		.join("");
}

export function blocksToHtml(blocks: BlockObjectResponse[]) {
	if (!blocks) return "";

	let htmlContent = "";

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		assert(block);
		const item = block[block.type];

		switch (block.type) {
			case "paragraph":
				htmlContent += `<p>${richTextToHTML(item.rich_text)}${childrenToHtml(block)}</p>`;
				break;
			case "heading_1":
				htmlContent += `<h1>${richTextToHTML(item.rich_text)}</h1>`;
				break;
			case "heading_2":
				htmlContent += `<h2>${richTextToHTML(item.rich_text)}</h2>`;
				break;
			case "heading_3":
				htmlContent += `<h3>${richTextToHTML(item.rich_text)}</h3>`;
				break;
			case "divider":
				htmlContent += "<hr >";
				break;
			case "image":
				switch (item.type) {
					case "external":
						htmlContent += `<img src="${item.external.url}" alt="${item.caption[0]?.plain_text}" />`;
						break;
					case "file":
						htmlContent += `<img src="${item.file.url}" alt="${item.caption[0]?.plain_text}" />`;
						break;
				}
				break;
			case "bulleted_list_item":
			case "numbered_list_item":
			case "to_do":
				const tag = block.type === "numbered_list_item" ? "ol" : "ul";

				// Start the list if it's the first item of its type or the previous item isn't a list of the same type
				if (i === 0 || blocks[i - 1].type !== block.type) htmlContent += `<${tag}>`;

				htmlContent += `<li>${richTextToHTML(item.rich_text)}${childrenToHtml(block)}</li>`;

				// If next block is not the same type, close the list
				if (i === blocks.length - 1 || blocks[i + 1].type !== block.type) {
					htmlContent += `</${tag}>`;
				}
				break;
			case "code":
				htmlContent += componentBlockToHtml("CodeBlock", item);
				break;
			case "quote":
				htmlContent += `<blockquote>${richTextToHTML(item.rich_text)}${childrenToHtml(block)}</blockquote>`;
				break;
			case "callout":
				htmlContent += `<aside>${richTextToHTML(item.rich_text)}${childrenToHtml(block)}</aside>`;
				break;
			case "toggle":
				htmlContent += `<p>${richTextToHTML(item.rich_text)}${childrenToHtml(block)}</p>`;
				break;
			case "bookmark":
				htmlContent += `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${richTextToHTML(item.caption)}</a>`;
				break;
			case "equation":
				htmlContent += `<p>${item.expression}</p>`;
				break;
			case "video":
				htmlContent += componentBlockToHtml("YouTube", item);
				break;
			default:
				// TODO: More block types can be added here!
				// video
				break;
		}
	}

	return htmlContent;
}

function childrenToHtml(block) {
	if (!block.has_children) {
		return "";
	}

	return "";
}

function componentBlockToHtml(type, block) {
	let identifier = "";
	let props = {};

	switch (type) {
		case "YouTube":
			identifier = "module:NEd4VmDdsxM3StIUbddO/9rhBPUZttCbLCWqJEL42/YouTube.js:Youtube";
			props = {};
		case "CodeBlock":
			identifier = "module:pVk4QsoHxASnVtUBp6jr/TbhpORLndv1iOkZzyo83/CodeBlock.js:default";
			props = {};
	}

	return identifier
		? `<template data-module-identifier="${identifier}" data-module-props='${JSON.stringify(props)}'></template>`
		: "";
}


const notionCodeLanguages = [
	"abap",
	"arduino",
	"bash",
	"basic",
	"c",
	"clojure",
	"coffeescript",
	"c++",
	"c#",
	"css",
	"dart",
	"diff",
	"docker",
	"elixir",
	"elm",
	"erlang",
	"flow",
	"fortran",
	"f#",
	"gherkin",
	"glsl",
	"go",
	"graphql",
	"groovy",
	"haskell",
	"html",
	"java",
	"javascript",
	"json",
	"julia",
	"kotlin",
	"latex",
	"less",
	"lisp",
	"livescript",
	"lua",
	"makefile",
	"markdown",
	"markup",
	"matlab",
	"mermaid",
	"nix",
	"objective-c",
	"ocaml",
	"pascal",
	"perl",
	"php",
	"plain text",
	"powershell",
	"prolog",
	"protobuf",
	"python",
	"r",
	"reason",
	"ruby",
	"rust",
	"sass",
	"scala",
	"scheme",
	"scss",
	"shell",
	"sql",
	"swift",
	"typescript",
	"vb.net",
	"verilog",
	"vhdl",
	"visual basic",
	"webassembly",
	"xml",
	"yaml",
	"java/c/c++/c#",
];

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
