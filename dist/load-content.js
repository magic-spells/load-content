(function (factory) {
	typeof define === 'function' && define.amd ? define(factory) :
	factory();
})((function () { 'use strict';

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
		/** parses attributes into internal state */
		readAttributes() {
			const _ = this;
			_.currentPage = Number(_.getAttribute("current-page")) || 1;
			_.hasNextPage = _.getAttribute("has-next-page") === "true";
			_.baseUrl = _.getAttribute("url") || window.location.pathname;
			_.mode = _.getAttribute("mode") || "append";
			_.contentSelectors = (_.getAttribute("targets") || "")
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			_.appendFilter = _.getAttribute("append-filter") || "";

			/* recount items currently in the dom */
			_.itemsShown = _.contentSelectors.reduce((sum, selector) => {
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
			const _ = this;
			if (opts.currentPage !== undefined)
				_.setAttribute("current-page", String(opts.currentPage));
			if (opts.hasNextPage !== undefined)
				_.setAttribute("has-next-page", String(opts.hasNextPage));
			if (opts.url !== undefined) _.setAttribute("url", opts.url);
			if (opts.targets !== undefined) {
				_.setAttribute(
					"targets",
					Array.isArray(opts.targets)
						? opts.targets.join(", ")
						: String(opts.targets),
				);
			}
			if (opts.mode !== undefined) _.setAttribute("mode", opts.mode);
			if (opts.appendFilter !== undefined)
				_.setAttribute("append-filter", opts.appendFilter);

			_.readAttributes();
			_.updateButtonState();

			_.dispatchEvent(
				new CustomEvent("onReset", {
					bubbles: true,
					detail: {
						currentPage: _.currentPage,
						hasNextPage: _.hasNextPage,
						itemsShown: _.itemsShown,
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
			const _ = this;
			evt.preventDefault();
			if (!_.hasNextPage || _.isLoading) return;

			_.isLoading = true;
			_.updateButtonState();

			try {
				await _.fetchAndAppendNextPage();
			} catch (err) {
				console.error("load-content: failed to load next page", err);
			} finally {
				_.isLoading = false;
				_.updateButtonState();
			}
		}

		/** builds ?page= param for the next request */
		buildNextPageUrl() {
			const _ = this;
			const url = new URL(_.baseUrl, window.location.origin);
			if (_.mode === "append" && _.getAttribute("current-page") !== null) {
				url.searchParams.set("page", String(_.currentPage + 1));
			}
			return url.href;
		}

		/** fetches next page, injects html, updates state */
		async fetchAndAppendNextPage() {
			const _ = this;
			const response = await fetch(_.buildNextPageUrl(), {
				credentials: "same-origin",
			});
			if (!response.ok) throw new Error(`http error ${response.status}`);

			const html = await response.text();
			const parsedDoc = new DOMParser().parseFromString(html, "text/html");

			_.contentSelectors.forEach((selector) => {
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
					elementMode === "swap" || (elementMode === null && _.mode === "swap");

				if (shouldSwap) {
					// swap entire content
					destinationEl.innerHTML = sourceEl.innerHTML;
					_.itemsShown = destinationEl.children.length; // keep count accurate
				} else {
					// gather children and optionally filter
					let childrenToAppend = Array.from(sourceEl.children);
					if (_.appendFilter) {
						childrenToAppend = childrenToAppend.filter((child) =>
							child.matches(_.appendFilter),
						);
					}
					childrenToAppend.forEach((child) => {
						destinationEl.appendChild(child);
						_.itemsShown += 1;
					});
				}
			});

			/* update page counter */
			_.currentPage += 1;

			/* read has-next-page flag from fetched markup */
			const newLoadContentEl = parsedDoc.querySelector("load-content");
			if (
				newLoadContentEl &&
				newLoadContentEl.getAttribute("has-next-page") !== null
			) {
				_.hasNextPage =
					newLoadContentEl.getAttribute("has-next-page") === "true";
			}

			/* reflect new values outward */
			_.setAttribute("current-page", String(_.currentPage));
			_.setAttribute("has-next-page", String(_.hasNextPage));

			/* refresh button */
			_.updateButtonState();

			/* fire event for observers */
			_.dispatchEvent(
				new CustomEvent("onContentLoaded", {
					bubbles: true,
					detail: {
						document: parsedDoc,
						itemsShown: _.itemsShown,
						currentPage: _.currentPage,
					},
				}),
			);
		}
	}

	/* register once */
	if (!customElements.get("load-content")) {
		customElements.define("load-content", LoadContent);
	}

}));
