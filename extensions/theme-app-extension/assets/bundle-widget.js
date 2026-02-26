(function() {
  class BundleWidget {
    constructor(element) {
      this.element = element;
      this.bundleHandle = element.dataset.bundleHandle;
      this.apiUrl = element.dataset.apiUrl;
      this.bundleData = null;

      this.loadingEl = element.querySelector('.bundle-loading');
      this.contentEl = element.querySelector('.bundle-content');
      this.errorEl = element.querySelector('.bundle-error');

      this.init();
    }

    async init() {
      if (!this.bundleHandle || !this.apiUrl) {
        this.showError();
        return;
      }

      await this.fetchBundle();
    }

    async fetchBundle() {
      try {
        const response = await fetch(
          `${this.apiUrl}/bundles/handle/${this.bundleHandle}`
        );

        if (!response.ok) {
          throw new Error('Bundle not found');
        }

        const data = await response.json();
        this.bundleData = data.bundle;

        await this.calculatePrice();
        this.render();
      } catch (error) {
        console.error('Error fetching bundle:', error);
        this.showError();
      }
    }

    async calculatePrice() {
      try {
        const response = await fetch(`${this.apiUrl}/bundle-price`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            products: this.bundleData.products,
            discount_type: this.bundleData.discount_type,
            discount_value: this.bundleData.discount_value,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to calculate price');
        }

        this.priceData = await response.json();
      } catch (error) {
        console.error('Error calculating price:', error);
        this.showError();
      }
    }

    render() {
      this.loadingEl.style.display = 'none';
      this.contentEl.style.display = 'block';

      const titleEl = this.contentEl.querySelector('.bundle-title');
      titleEl.textContent = this.bundleData.title;

      const productsContainer = this.contentEl.querySelector('.bundle-products');
      productsContainer.innerHTML = '';

      this.bundleData.products.forEach(product => {
        const productEl = document.createElement('div');
        productEl.className = 'bundle-product-item';
        productEl.innerHTML = `
          ${product.image ? `<img src="${product.image}" alt="${product.title}" class="bundle-product-image">` : ''}
          <div class="bundle-product-details">
            <h3 class="bundle-product-title">${product.title}</h3>
            <p class="bundle-product-price">$${parseFloat(product.price).toFixed(2)}</p>
          </div>
        `;
        productsContainer.appendChild(productEl);
      });

      const originalPriceEl = this.contentEl.querySelector('[data-original-price]');
      const discountAmountEl = this.contentEl.querySelector('[data-discount-amount]');
      const finalPriceEl = this.contentEl.querySelector('[data-final-price]');

      originalPriceEl.textContent = `$${this.priceData.original_price}`;
      discountAmountEl.textContent = `$${this.priceData.discount_amount}`;
      finalPriceEl.textContent = `$${this.priceData.final_price}`;

      const addToCartBtn = this.contentEl.querySelector('.bundle-add-to-cart');
      addToCartBtn.addEventListener('click', () => this.addToCart());
    }

    async addToCart() {
      const addToCartBtn = this.contentEl.querySelector('.bundle-add-to-cart');
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Adding...';

      try {
        const items = this.bundleData.products.map(product => ({
          id: product.variant_id || product.product_id,
          quantity: product.quantity || 1,
        }));

        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items }),
        });

        if (!response.ok) {
          throw new Error('Failed to add to cart');
        }

        addToCartBtn.textContent = 'Added to Cart!';

        setTimeout(() => {
          window.location.href = '/cart';
        }, 500);
      } catch (error) {
        console.error('Error adding to cart:', error);
        addToCartBtn.textContent = 'Error - Try Again';
        addToCartBtn.disabled = false;

        setTimeout(() => {
          addToCartBtn.textContent = 'Add Bundle to Cart';
        }, 2000);
      }
    }

    showError() {
      this.loadingEl.style.display = 'none';
      this.contentEl.style.display = 'none';
      this.errorEl.style.display = 'block';
    }
  }

  function initBundleWidgets() {
    const widgets = document.querySelectorAll('.niche-bundle-widget');
    widgets.forEach(widget => {
      new BundleWidget(widget);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBundleWidgets);
  } else {
    initBundleWidgets();
  }
})();
document.addEventListener("DOMContentLoaded", async () => {
  const shop = Shopify.shop;

  const res = await fetch(
    `https://your-domain.com/public/bundles?shop=${shop}`
  );

  const bundles = await res.json();

  console.log("Loaded bundles:", bundles);

  // Render bundles here
});
async function addBundleToCart(products) {
  const items = products.map(p => ({
    id: p.variantId,
    quantity: p.quantity || 1
  }));

  await fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });

  window.location.href = "/cart";
}
function renderVariants(product) {
  return `
    <select data-product="${product.id}">
      ${product.variants.map(v => `
        <option value="${v.id}">
          ${v.title}
        </option>
      `).join("")}
    </select>
  `;
}
async function validateInventory(variantId, quantity) {
  const res = await fetch(`/variants/${variantId}.js`);
  const variant = await res.json();

  return variant.available && variant.inventory_quantity >= quantity;
}
const shopRecord = await prisma.shop.findUnique({
  where: { shopDomain: req.shop.shopDomain }
});

const client = new shopify.clients.Rest({
  session: {
    shop: shopRecord.shopDomain,
    accessToken: shopRecord.accessToken
  }
});

await client.post({
  path: "price_rules",
  data: {
    price_rule: {
      title: `Bundle-${name}`,
      target_type: "line_item",
      target_selection: "all",
      allocation_method: "across",
      value_type: "percentage",
      value: `-${discountValue}`,
      customer_selection: "all"
    }
  }
});
