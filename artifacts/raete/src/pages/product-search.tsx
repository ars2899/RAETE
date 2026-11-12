import { useState, type FormEvent } from 'react';
import { Search, ArrowUpRight, RotateCw, Image as ImageIcon } from 'lucide-react';
import { getSearchChannel3ProductsQueryKey, useSearchChannel3Products } from '@workspace/api-client-react';
import type { Channel3Offer, Channel3Product } from '@workspace/api-client-react';

function getImage(product: Channel3Product) {
  return product.images?.find((image) => image.is_main_image) ?? product.images?.[0];
}

function getOffer(product: Channel3Product): Channel3Offer | undefined {
  return product.offers?.[0];
}

function formatPrice(offer: Channel3Offer) {
  const price = offer.price?.price ?? offer.price?.amount;
  if (price === undefined || !offer.price?.currency) return undefined;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: offer.price.currency,
    }).format(price);
  } catch {
    return `${offer.price.currency} ${price}`;
  }
}

function ProductCard({ product, index }: { product: Channel3Product; index: number }) {
  const image = getImage(product);
  const brand = product.brands?.find((item) => item.name)?.name;
  const offer = getOffer(product);
  const price = offer ? formatPrice(offer) : undefined;
  const imageUrl = image?.cleaned_url || image?.url;
  const alt = image?.alt_text || product.title;

  return (
    <article className="product-card" data-testid={`card-product-${product.id}`} style={{ animationDelay: `${index * 55}ms` }}>
      <a className="product-image" href={offer?.url} target="_blank" rel="noreferrer" aria-label={`Open ${product.title} at merchant`} data-testid={`link-product-${product.id}`}>
        {imageUrl ? <img src={imageUrl} alt={alt} loading="lazy" data-testid={`img-product-${product.id}`} /> : (
          <div className="image-fallback" aria-label="No product image available"><ImageIcon size={22} strokeWidth={1.4} /></div>
        )}
        <span className="external-mark"><ArrowUpRight size={16} /></span>
      </a>
      <div className="product-copy">
        {brand && <p className="product-brand" data-testid={`text-brand-${product.id}`}>{brand}</p>}
        <h2 data-testid={`text-title-${product.id}`}>{product.title}</h2>
        <div className="product-meta">
          {price && <span className="product-price" data-testid={`text-price-${product.id}`}>{price}</span>}
          {offer?.domain && <a className="merchant" href={offer.url} target="_blank" rel="noreferrer" data-testid={`link-merchant-${product.id}`}>{offer.domain}<ArrowUpRight size={12} /></a>}
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton({ index }: { index: number }) {
  return <div className="skeleton-card" style={{ animationDelay: `${index * 70}ms` }} aria-hidden="true">
    <div className="skeleton-image" />
    <div className="skeleton-line short" />
    <div className="skeleton-line long" />
    <div className="skeleton-line medium" />
  </div>;
}

export default function ProductSearch() {
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const query = useSearchChannel3Products(
    { query: submittedQuery || ' ' },
    {
      query: {
        queryKey: getSearchChannel3ProductsQueryKey({ query: submittedQuery || ' ' }),
        enabled: submittedQuery.length > 0,
        retry: false,
      },
    },
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = input.trim().slice(0, 200);
    if (next) setSubmittedQuery(next);
  }

  const products = query.data?.products?.slice(0, 8) ?? [];

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Raete home" data-testid="link-home">
          <span className="brand-symbol"><span /></span>
          <span>raete</span>
        </a>
        <div className="topbar-note"><span className="live-dot" /> PRODUCT SEARCH <span className="topbar-divider">/</span> CHANNEL3</div>
      </header>

      <section className="search-intro">
        <div className="eyebrow"><span>01</span> THE OPEN WEB, IN VIEW</div>
        <h1>Find the<br /><em>piece.</em></h1>
        <p className="intro-copy">Search across retailers.<br className="desktop-break" /> See what’s out there, as it is.</p>
        <form className="search-form" onSubmit={onSubmit}>
          <Search className="search-icon" size={20} strokeWidth={1.7} aria-hidden="true" />
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Try “black mini skirt”"
            aria-label="Search products"
            maxLength={200}
            data-testid="input-search"
          />
          <button type="submit" disabled={!input.trim() || query.isFetching} data-testid="button-submit">
            {query.isFetching ? <span className="button-loading" /> : <>Search <span className="button-arrow">↗</span></>}
          </button>
        </form>
        <div className="search-foot"><span>SEARCH THE CATALOG</span><span>UP TO 8 RESULTS</span></div>
      </section>

      {submittedQuery ? (
        <section className="results-section" aria-live="polite">
          <div className="results-heading">
            <div>
              <span className="section-kicker">YOUR SEARCH</span>
              <h2>{submittedQuery}</h2>
            </div>
            {query.isSuccess && <div className="result-count" data-testid="text-result-count">{products.length} {products.length === 1 ? 'RESULT' : 'RESULTS'}</div>}
          </div>
          {query.isFetching && (
            <div className="product-grid" data-testid="status-loading">
              {Array.from({ length: 4 }, (_, index) => <ProductSkeleton key={index} index={index} />)}
            </div>
          )}
          {query.isError && !query.isFetching && (
            <div className="state-panel error-panel" data-testid="status-error">
              <div className="state-mark">!</div>
              <div><h3>That search didn’t come through.</h3><p>Give it another try in a moment.</p></div>
              <button className="retry-button" type="button" onClick={() => void query.refetch()} data-testid="button-retry"><RotateCw size={15} /> Try again</button>
            </div>
          )}
          {query.isSuccess && !query.isFetching && products.length === 0 && (
            <div className="state-panel empty-panel" data-testid="status-empty">
              <div className="state-mark empty-mark">—</div>
              <div><h3>No pieces found.</h3><p>Try a different description.</p></div>
            </div>
          )}
          {query.isSuccess && !query.isFetching && products.length > 0 && (
            <div className="product-grid" data-testid="list-products">
              {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
            </div>
          )}
        </section>
      ) : (
        <section className="idle-section" data-testid="status-idle">
          <div className="idle-index">A—Z <span>·</span> OPEN RETAIL</div>
          <div className="idle-content">
            <div className="idle-rule" />
            <p>Good things are<br />already out there.</p>
          </div>
          <span className="idle-caption">START WITH WHAT YOU’RE LOOKING FOR</span>
        </section>
      )}

      <footer className="footer">
        <span>RAETE <span className="footer-slash">/</span> A WINDOW INTO WHAT’S AVAILABLE</span>
        <span>PRODUCTS, ONE SEARCH AWAY</span>
      </footer>
    </main>
  );
}
