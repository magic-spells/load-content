'use strict';

/* ------------------------------------------------------------------
 * <load-content> web component
 * ---------------------------------------------------------------- */
class LoadContent extends HTMLElement {
	/** sets up internal state and binds methods */
	constructor() {
		super();

		/** @private {number} current page index (1-based) */
		this.currentPage = 1;

		/** @private {boolean} whether another page exists */
		this.hasNextPage = false;

		/** @private {string} base url to request more html from */
		this.baseUrl = "";

		/** @private {string} default mode for content loading (append|swap) */
		this.mode = "append";

		/** @private {string[]} css selectors whose children we’ll append */
		this.contentSelectors = [];

		/** @private {string} css selector to filter which children to append */
		this.appendFilter = "";

		/** @private {number} total items that have been appended so far */
		this.itemsShown = 0;

		/** @private {boolean} guard to prevent duplicate clicks while loading */
		this.isLoading = false;

		/* bind so we can remove listener if element detaches */
		this.handleClick = this.handleClick.bind(this);
	}

	/* --------------------------------------------------------------
	 * lifecycle
	 * ---------------------------------------------------------- */
	connectedCallback() {
		this.readAttributes();
		this.addEventListener("click", this.handleClick);
		this.updateButtonState();
	}

	disconnectedCallback() {
		this.removeEventListener("click", this.handleClick);
	}

	/* --------------------------------------------------------------
	 * attribute helpers
	 * ---------------------------------------------------------- */
	/** parses data- attributes into internal state */
	readAttributes() {
		this.currentPage = Number(this.dataset.currentPage) || 1;
		this.hasNextPage = this.dataset.hasNextPage === "true";
		this.baseUrl = this.dataset.url || window.location.pathname;
		this.mode = this.dataset.mode || "append";
		this.contentSelectors = (this.dataset.targets || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		this.appendFilter = this.dataset.appendFilter || "";

		/* recount items currently in the dom */
		this.itemsShown = this.contentSelectors.reduce((sum, selector) => {
			const el = document.querySelector(selector);
			return el ? sum + el.children.length : sum;
		}, 0);
	}

	/* --------------------------------------------------------------
	 * public api
	 * ---------------------------------------------------------- */
	/**
	 * resets internal + reflected state
	 * @param {Object} opts
	 */
	reset(opts = {}) {
		if (opts.currentPage !== undefined)
			this.dataset.currentPage = String(opts.currentPage);
		if (opts.hasNextPage !== undefined)
			this.dataset.hasNextPage = String(opts.hasNextPage);
		if (opts.url !== undefined) this.dataset.url = opts.url;
		if (opts.targets !== undefined) {
			this.dataset.targets = Array.isArray(opts.targets)
				? opts.targets.join(", ")
				: String(opts.targets);
		}
		if (opts.mode !== undefined) this.dataset.mode = opts.mode;
		if (opts.appendFilter !== undefined)
			this.dataset.appendFilter = opts.appendFilter;

		this.readAttributes();
		this.updateButtonState();

		this.dispatchEvent(
			new CustomEvent("onReset", {
				bubbles: true,
				detail: {
					currentPage: this.currentPage,
					hasNextPage: this.hasNextPage,
					itemsShown: this.itemsShown,
				},
			}),
		);
	}

	/* --------------------------------------------------------------
	 * button state helpers
	 * ---------------------------------------------------------- */
	disable() {
		this.setAttribute("disabled", "");
		this.setAttribute("data-state", "loading");
	}

	enable() {
		this.removeAttribute("disabled");
		this.setAttribute("data-state", "ready");
	}

	setComplete() {
		this.setAttribute("disabled", "");
		this.setAttribute("data-state", "complete");
	}

	updateButtonState() {
		if (this.isLoading) this.disable();
		else if (!this.hasNextPage) this.setComplete();
		else this.enable();
	}

	/* --------------------------------------------------------------
	 * click + fetch
	 * ---------------------------------------------------------- */
	async handleClick(evt) {
		evt.preventDefault();
		if (!this.hasNextPage || this.isLoading) return;

		this.isLoading = true;
		this.updateButtonState();

		try {
			await this.fetchAndAppendNextPage();
		} catch (err) {
			console.error("load-content: failed to load next page", err);
		} finally {
			this.isLoading = false;
			this.updateButtonState();
		}
	}

	/** builds ?page= param for the next request */
	buildNextPageUrl() {
		const url = new URL(this.baseUrl, window.location.origin);
		if (this.mode === "append" && this.dataset.currentPage !== undefined) {
			url.searchParams.set("page", String(this.currentPage + 1));
		}
		return url.href;
	}

	/** fetches next page, injects html, updates state */
	async fetchAndAppendNextPage() {
		const response = await fetch(this.buildNextPageUrl(), {
			credentials: "same-origin",
		});
		if (!response.ok) throw new Error(`http error ${response.status}`);

		const html = await response.text();
		const parsedDoc = new DOMParser().parseFromString(html, "text/html");

		this.contentSelectors.forEach((selector) => {
			const sourceEl = parsedDoc.querySelector(selector);
			const destinationEl = document.querySelector(selector);

			if (!sourceEl || !destinationEl) {
				console.warn(
					`load-content: selector "${selector}" not found in one of the documents`,
				);
				return;
			}

			const elementMode = destinationEl.getAttribute("data-load-content");
			const shouldSwap =
				elementMode === "swap" ||
				(elementMode === null && this.mode === "swap");

			if (shouldSwap) {
				// swap entire content
				destinationEl.innerHTML = sourceEl.innerHTML;
				this.itemsShown = destinationEl.children.length; // keep count accurate
			} else {
				// gather children and optionally filter
				let childrenToAppend = Array.from(sourceEl.children);
				if (this.appendFilter) {
					childrenToAppend = childrenToAppend.filter((child) =>
						child.matches(this.appendFilter),
					);
				}
				childrenToAppend.forEach((child) => {
					destinationEl.appendChild(child);
					this.itemsShown += 1;
				});
			}
		});

		/* update page counter */
		this.currentPage += 1;

		/* read has-next-page flag from fetched markup */
		const newLoadContentEl = parsedDoc.querySelector("load-content");
		if (
			newLoadContentEl &&
			newLoadContentEl.dataset.hasNextPage !== undefined
		) {
			this.hasNextPage = newLoadContentEl.dataset.hasNextPage === "true";
		}

		/* reflect new values outward */
		this.dataset.currentPage = String(this.currentPage);
		this.dataset.hasNextPage = String(this.hasNextPage);

		/* refresh button */
		this.updateButtonState();

		/* fire event for observers */
		this.dispatchEvent(
			new CustomEvent("onContentLoaded", {
				bubbles: true,
				detail: {
					document: parsedDoc,
					itemsShown: this.itemsShown,
					currentPage: this.currentPage,
				},
			}),
		);
	}
}

/* register once */
if (!customElements.get("load-content")) {
	customElements.define("load-content", LoadContent);
}
