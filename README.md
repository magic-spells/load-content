# Load Content Web Component

A lightweight, customizable Web Component for implementing "Load More" pagination functionality. Perfect for progressively loading content without full page refreshes while maintaining accessibility and SEO benefits.

[**Live Demo**](https://magic-spells.github.io/load-content/demo/)

## Features

- No dependencies
- Lightweight and performant
- Progressive enhancement approach
- Automatically fetches and appends content
- Configurable content selectors
- Built-in loading state management
- Custom events for integration
- Accessible by default
- Progressive enhancement ready

## Installation

```bash
npm install @magic-spells/load-content
```

```javascript
// Add to your JavaScript file
import "@magic-spells/load-content";
```

Or include directly in your HTML:

```html
<script src="https://unpkg.com/@magic-spells/load-content"></script>
```

## Usage

```html
<!-- Content container that will receive new items -->
<div id="product-grid">
  <div class="product">Product 1</div>
  <div class="product">Product 2</div>
  <div class="product">Product 3</div>
</div>

<!-- Load more button -->
<load-content
  data-current-page="1"
  data-has-next-page="true"
  data-url="/products"
  data-targets="#product-grid"
  data-append-filter=".product"
>
  Load More Products
</load-content>
```

## How It Works

- The component fetches the next page from the specified URL with a `?page=` parameter
- It extracts content from the response using the provided CSS selectors
- New content is appended to the existing containers
- The component automatically updates its state and disables when no more pages are available
- Custom events are fired for integration with other scripts

## Configuration

Configure the component using data attributes:

| Attribute            | Description                                            | Default          |
| -------------------- | ------------------------------------------------------ | ---------------- |
| `data-current-page`  | Current page number (1-based)                          | 1                |
| `data-has-next-page` | Whether more pages are available                       | false            |
| `data-url`           | Base URL for pagination requests                       | Current page URL |
| `data-targets`       | CSS selectors for content containers (comma-separated) | ""               |
| `data-append-filter` | CSS selector to filter which children get appended     | ""               |

### Multiple Content Selectors

You can load content into multiple containers simultaneously:

```html
<load-content
  data-targets="#product-grid, #sidebar-recommendations, .related-items"
>
  Load More
</load-content>
```

### Filtering Appended Content

Use `data-append-filter` to specify which children from the server response should be appended. This is useful for filtering out unwanted elements or focusing on specific content types:

```html
<load-content data-targets="#product-grid" data-append-filter=".product-card">
  Load More
</load-content>
```

The filter works with:

- **CSS classes**: `.product-card`, `.item`, `.content-block`
- **HTML elements**: `article`, `div`, `section`
- **Custom elements**: `product-card`, `data-item`, `custom-component`
- **Complex selectors**: `.product:not(.hidden)`, `[data-type="product"]`

When a filter is specified, only children matching the selector will be appended to the target containers.

#### Filter Examples

**Basic class filtering:**

```html
<!-- Only append elements with .product class -->
<load-content data-append-filter=".product">Load More</load-content>
```

**Custom web component filtering:**

```html
<!-- Only append custom web components -->
<load-content data-append-filter="product-card">Load More</load-content>
```

**Attribute-based filtering:**

```html
<!-- Only append elements with specific data attributes -->
<load-content data-append-filter="[data-type='product']"
  >Load More</load-content
>
```

**Complex selector filtering:**

```html
<!-- Only append visible products that aren't featured -->
<load-content data-append-filter=".product:not(.featured):not(.hidden)"
  >Load More</load-content
>
```

**Multiple element types:**

```html
<!-- Append articles and sections -->
<load-content data-append-filter="article, section">Load More</load-content>
```

This filtering prevents unwanted elements like ads, tracking scripts, headers, content cards, or other items from being appended.

### Content Swapping vs Appending

By default, new content is **appended** to existing containers. However, you can use `data-load-content="swap"` to **replace** content instead:

```html
<!-- Products get appended (default behavior) -->
<div id="product-grid">
  <div class="product">Product 1</div>
  <div class="product">Product 2</div>
</div>

<!-- Status message gets swapped out completely -->
<div id="status-message" data-load-content="swap">
  Showing 12 of 86 products
</div>

<load-content data-targets="#product-grid, #status-message">
  Load More
</load-content>
```

When the next page loads:

- **`#product-grid`** → New products are appended to existing ones
- **`#status-message`** → Content is completely replaced with "Showing 24 of 86 products"

This is perfect for:

- Status messages ("Showing X of Y items")
- Page counters ("Page 2 of 5")
- Filter summaries ("Electronics: 15 results")
- Any content that should be updated rather than duplicated

## JavaScript API

### Methods

#### `reset(options)`

Resets the component state, useful after filtering or searching:

```javascript
const loadMore = document.querySelector("load-content");

// Reset to first page
loadMore.reset({
  currentPage: 1,
  hasNextPage: true,
  url: "/products?category=electronics",
});
```

**Options:**

- `currentPage` (number): Page to reset to
- `hasNextPage` (boolean): Whether more pages exist
- `url` (string): New base URL
- `targets` (string|array): New content selectors

### Custom Events

The component fires custom events that you can listen to:

#### `onContentLoaded`

Fired after new content is successfully loaded and appended:

```javascript
loadMore.addEventListener("onContentLoaded", (e) => {
  console.log("New content loaded!", e.detail);
  // e.detail contains: document, itemsShown, currentPage

  // Re-initialize any JavaScript on new content
  initializeNewElements(e.detail.document);
});
```

#### `onReset`

Fired when the component is reset:

```javascript
loadMore.addEventListener("onReset", (e) => {
  console.log("Component reset", e.detail);
  // e.detail contains: currentPage, hasNextPage, itemsShown
});
```

## Server-Side Requirements

Your server should:

1. **Accept page parameter**: Handle `?page=2`, `?page=3`, etc.
2. **Return full HTML**: The response should be a complete HTML document
3. **Use same selectors**: Content containers should have the same CSS selectors as the original page
4. **Update pagination data**: Update the load-content element's attributes in each response, especially `data-has-next-page="false"` on the final page

### Example Server Response

```html
<!DOCTYPE html>
<html>
  <body>
    <!-- Same content structure as original page -->
    <div id="product-grid">
      <div class="product">Product 4</div>
      <div class="product">Product 5</div>
      <div class="product">Product 6</div>
      <!-- Other elements like ads or metadata will be filtered out -->
      <script>
        /* tracking code */
      </script>
      <div class="advertisement">Ad content</div>
    </div>

    <!-- Updated load-content button -->
    <load-content
      data-current-page="2"
      data-has-next-page="true"
      data-url="/products"
      data-targets="#product-grid"
      data-append-filter=".product"
    >
      Load More Products
    </load-content>
  </body>
</html>
```

## Advanced Usage

### Dynamic Filtering

```javascript
const loadMore = document.querySelector("load-content");
const filterSelect = document.querySelector("#category-filter");

filterSelect.addEventListener("change", () => {
  // Clear existing content
  document.querySelector("#product-grid").innerHTML = "";

  // Reset load-content component
  loadMore.reset({
    currentPage: 1,
    hasNextPage: true,
    url: `/products?category=${filterSelect.value}`,
  });

  // Trigger first load
  loadMore.click();
});
```

### Integration with Search

```javascript
const searchForm = document.querySelector("#search-form");
const loadMore = document.querySelector("load-content");

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(searchForm);
  const searchQuery = formData.get("q");

  // Fetch first page of results
  const response = await fetch(`/search?q=${searchQuery}`);
  const html = await response.text();

  // Update page content
  document.querySelector("#results").innerHTML = new DOMParser()
    .parseFromString(html, "text/html")
    .querySelector("#results").innerHTML;

  // Reset load-content for new search
  loadMore.reset({
    currentPage: 1,
    hasNextPage: true, // Determine from response
    url: `/search?q=${searchQuery}`,
  });
});
```

## Styling

The component doesn't include any default styles. Style it like any button:

```css
load-content {
  display: inline-block;
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

load-content:hover:not([disabled]) {
  background: #0056b3;
}

load-content[disabled] {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Loading state styling */
load-content[disabled]::after {
  content: " Loading...";
}
```

## Browser Support

This component works in all modern browsers that support Web Components (Custom Elements v1).

## Accessibility and Progressive Enhancement

- Screen reader friendly
- Keyboard accessible
- Can enhance existing pagination links
- Graceful degradation when JavaScript fails
- Works well with server-side rendered content

## License

MIT
