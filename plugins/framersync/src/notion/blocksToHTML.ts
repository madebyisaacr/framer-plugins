import { BlockObjectResponse, RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import { assert } from "../utils";
import { richTextToPlainText } from "./notion";

export function richTextToHTML(texts: RichTextItemResponse[]) {
	if (!texts.length) {
		return null;
	}

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

		let blockContent = "";

		switch (block.type) {
			case "paragraph":
				const paragraphContent = richTextToHTML(item.rich_text);
				if (paragraphContent !== null) {
					blockContent = `<p>${paragraphContent}${childrenToHtml(block)}</p>`;
				}
				break;
			case "heading_1":
				const h1Content = richTextToHTML(item.rich_text);
				if (h1Content !== null) {
					blockContent = `<h1>${h1Content}</h1>`;
				}
				break;
			case "heading_2":
				const h2Content = richTextToHTML(item.rich_text);
				if (h2Content !== null) {
					blockContent = `<h2>${h2Content}</h2>`;
				}
				break;
			case "heading_3":
				const h3Content = richTextToHTML(item.rich_text);
				if (h3Content !== null) {
					blockContent = `<h3>${h3Content}</h3>`;
				}
				break;
			case "divider":
				blockContent = "<hr >";
				break;
			case "image":
				switch (item.type) {
					case "external":
						blockContent = `<img src="${item.external.url}" alt="${item.caption[0]?.plain_text}" />`;
						break;
					case "file":
						blockContent = `<img src="${item.file.url}" alt="${item.caption[0]?.plain_text}" />`;
						break;
				}
				break;
			case "bulleted_list_item":
			case "numbered_list_item":
			case "to_do":
				const tag = block.type === "numbered_list_item" ? "ol" : "ul";
				const listItemContent = richTextToHTML(item.rich_text);
				if (listItemContent !== null) {
					// Start the list if it's the first item of its type or the previous item isn't a list of the same type
					if (i === 0 || blocks[i - 1].type !== block.type) blockContent += `<${tag}>`;

					blockContent += `<li>${listItemContent}${childrenToHtml(block)}</li>`;

					// If next block is not the same type, close the list
					if (i === blocks.length - 1 || blocks[i + 1].type !== block.type) {
						blockContent += `</${tag}>`;
					}
				}
				break;
			case "code":
				blockContent = componentBlockToHtml("CodeBlock", item);
				break;
			case "quote":
				const quoteContent = richTextToHTML(item.rich_text);
				if (quoteContent !== null) {
					blockContent = `<blockquote>${quoteContent}${childrenToHtml(block)}</blockquote>`;
				}
				break;
			case "callout":
				const calloutContent = richTextToHTML(item.rich_text);
				if (calloutContent !== null) {
					blockContent = `<aside>${calloutContent}${childrenToHtml(block)}</aside>`;
				}
				break;
			case "toggle":
				const toggleContent = richTextToHTML(item.rich_text);
				if (toggleContent !== null) {
					blockContent = `<p>${toggleContent}${childrenToHtml(block)}</p>`;
				}
				break;
			// case "bookmark":
			// 	const captionContent = richTextToHTML(item.caption);
			// 	if (captionContent !== null) {
			// 		blockContent = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${captionContent}</a>`;
			// 	} else {
			// 		blockContent = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a>`;
			// 	}
			// 	break;
			case "equation":
				blockContent = `<p>${item.expression}</p>`;
				break;
			case "video":
				blockContent = componentBlockToHtml("YouTube", item);
				break;
			default:
				// TODO: More block types can be added here!
				break;
		}

		if (blockContent) {
			htmlContent += blockContent;
		}
	}
	console.log("htmlContent", htmlContent);

	return htmlContent;
}

function childrenToHtml(block) {
	if (!block.has_children) {
		return "";
	}

	return "";
}

function componentBlockToHtml(type: string, item: object) {
	let identifier = "";
	let props = {};

	switch (type) {
		case "YouTube":
			const url = item.external?.url || "";
			if (url.includes("youtube.com") || url.includes("youtu.be")) {
				identifier = "module:NEd4VmDdsxM3StIUbddO/9rhBPUZttCbLCWqJEL42/YouTube.js:Youtube";
				props = {
					url: { type: "string", value: url },
					play: { type: "enum", value: "Off" },
					shouldMute: { type: "boolean", value: true },
				};
			}
			break;
		case "CodeBlock":
			identifier = "module:pVk4QsoHxASnVtUBp6jr/TbhpORLndv1iOkZzyo83/CodeBlock.js:default";
			props = {
				code: {
					type: "string",
					value: richTextToPlainText(item.rich_text),
				},
				language: {
					type: "enum",
					value: codeLanguageMapping[item.language] || "JSX",
				},
			};
			break;
	}

	return identifier
		? `<template data-module-identifier="${identifier}" data-module-props='${JSON.stringify(props)}'></template>`
		: "";
}

const codeLanguageMapping = {
	abap: null,
	arduino: null,
	bash: "Shell",
	basic: null,
	c: "C",
	clojure: null,
	coffeescript: null,
	"c++": "C++",
	"c#": "C#",
	css: "CSS",
	dart: null,
	diff: null,
	docker: null,
	elixir: null,
	elm: null,
	erlang: null,
	flow: null,
	fortran: null,
	"f#": null,
	gherkin: null,
	glsl: null,
	go: "Go",
	graphql: null,
	groovy: null,
	haskell: "Haskell",
	html: "HTML",
	java: "Java",
	javascript: "JSX",
	json: null,
	julia: "Julia",
	kotlin: "Kotlin",
	latex: null,
	less: "Less",
	lisp: null,
	livescript: null,
	lua: "Lua",
	makefile: null,
	markdown: "Markdown",
	markup: null,
	matlab: "MATLAB",
	mermaid: null,
	nix: null,
	"objective-c": "Objective-C",
	ocaml: null,
	pascal: null,
	perl: "Perl",
	php: "PHP",
	"plain text": null,
	powershell: null,
	prolog: null,
	protobuf: null,
	python: "Python",
	r: null,
	reason: null,
	ruby: "Ruby",
	rust: "Rust",
	sass: null,
	scala: "Scala",
	scheme: null,
	scss: "SCSS",
	shell: "Shell",
	sql: "SQL",
	swift: "Swift",
	typescript: "TSX",
	"vb.net": null,
	verilog: null,
	vhdl: null,
	"visual basic": null,
	webassembly: null,
	xml: null,
	yaml: "YAML",
	"java/c/c++/c#": null,
};
