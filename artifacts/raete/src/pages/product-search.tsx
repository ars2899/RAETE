import { useState, type FormEvent } from 'react';
import { Search, ArrowUpRight, RotateCw, Image as ImageIcon } from 'lucide-react';
import { getSearchChannel3ProductsQueryKey, useSearchChannel3Products } from '@workspace/api-client-react';
import type { Channel3Offer, Channel3Product } from '@workspace/api-client-react';

type PreferenceKey = 'materials' | 'quality' | 'value' | 'longevity';
type PreferenceImportance = '' | 'high' | 'medium' | 'low';
type SelectedImportance = Exclude<PreferenceImportance, ''>;
type Preferences = Record<PreferenceKey, PreferenceImportance>;
type SelectedPreferences = Record<PreferenceKey, SelectedImportance>;
type PrototypeSignalKey = Exclude<PreferenceKey, 'value'>;

const preferenceOptions: { key: PreferenceKey; label: string }[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'quality', label: 'Quality' },
  { key: 'value', label: 'Value' },
  { key: 'longevity', label: 'Longevity' },
];

const importanceWeights: Record<SelectedImportance, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

type RankedDimension = {
  key: PreferenceKey;
  label: string;
  score: number | null;
  importance: SelectedImportance;
  weight: number;
  source: 'channel3' | 'prototype';
};

type RankedProduct = {
  product: Channel3Product;
  score: number;
  dimensions: RankedDimension[];
  originalIndex: number;
};

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

function hasAllPreferences(preferences: Preferences): preferences is SelectedPreferences {
  return preferenceOptions.every(({ key }) => preferences[key] !== '');
}

function getPrototypeSignal(productId: string, dimension: PrototypeSignalKey): number {
  let hash = 2166136261;
  for (const character of `${productId}:${dimension}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 101;
}

function getComparableOfferPrice(product: Channel3Product) {
  const offer = getOffer(product);
  const amount = offer?.price?.price ?? offer?.price?.amount;
  const currency = offer?.price?.currency;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return null;
  return { amount, currency };
}

function getValueScores(products: Channel3Product[]) {
  const prices = products.map(getComparableOfferPrice);
  if (prices.length === 0 || prices.some((price) => price === null)) {
    return new Map<string, number>();
  }

  const comparablePrices = prices.filter((price): price is NonNullable<typeof price> => price !== null);
  if (new Set(comparablePrices.map((price) => price.currency)).size !== 1) {
    return new Map<string, number>();
  }

  const amounts = comparablePrices.map((price) => price.amount);
  const minPrice = Math.min(...amounts);
  const maxPrice = Math.max(...amounts);

  return new Map(
    products.map((product, index) => [
      product.id,
      maxPrice === minPrice
        ? 100
        : Math.round(((maxPrice - comparablePrices[index].amount) / (maxPrice - minPrice)) * 100),
    ]),
  );
}

function rankProducts(products: Channel3Product[], preferences: SelectedPreferences): RankedProduct[] {
  const valueScores = getValueScores(products);

  return products
    .map((product, originalIndex) => {
      const dimensions: RankedDimension[] = [
        {
          key: 'materials',
          label: 'Materials',
          score: getPrototypeSignal(product.id, 'materials'),
          importance: preferences.materials,
          weight: importanceWeights[preferences.materials],
          source: 'prototype',
        },
        {
          key: 'quality',
          label: 'Quality',
          score: getPrototypeSignal(product.id, 'quality'),
          importance: preferences.quality,
          weight: importanceWeights[preferences.quality],
          source: 'prototype',
        },
        {
          key: 'value',
          label: 'Value',
          score: valueScores.get(product.id) ?? null,
          importance: preferences.value,
          weight: importanceWeights[preferences.value],
          source: 'channel3',
        },
        {
          key: 'longevity',
          label: 'Longevity',
          score: getPrototypeSignal(product.id, 'longevity'),
          importance: preferences.longevity,
          weight: importanceWeights[preferences.longevity],
          source: 'prototype',
        },
      ];

      const scoredDimensions = dimensions.filter(
        (dimension): dimension is RankedDimension & { score: number } => dimension.score !== null,
      );
      const totalWeight = scoredDimensions.reduce((total, dimension) => total + dimension.weight, 0);
      const weightedTotal = scoredDimensions.reduce(
        (total, dimension) => total + dimension.score * dimension.weight,
        0,
      );

      return {
        product,
        dimensions,
        originalIndex,
        score: Math.round(weightedTotal / totalWeight),
      };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
}

function formatImportance(importance: SelectedImportance) {
  return importance.charAt(0).toUpperCase() + importance.slice(1);
}

function ProductCard({
  product,
  index,
  ranked,
  rank,
}: {
  product: Channel3Product;
  index: number;
  ranked?: RankedProduct;
  rank?: number;
}) {
  const image = getImage(product);
  const brand = product.brands?.find((item) => item.name)?.name;
  const offer = getOffer(product);
  const price = offer ? formatPrice(offer) : undefined;
  const imageUrl = image?.cleaned_url || image?.url;
  const alt = image?.alt_text || product.title;
  const valueDimension = ranked?.dimensions.find((dimension) => dimension.key === 'value');

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
      {ranked && rank !== undefined && (
        <div className="ranking-panel" data-testid={`panel-ranking-${product.id}`}>
          <div className="ranking-topline">
            <span className="ranking-rank" data-testid={`text-rank-${product.id}`}>#{rank} for you</span>
            <span className="ranking-total" data-testid={`text-score-${product.id}`}>{ranked.score}<small> / 100</small></span>
          </div>
          <p className="ranking-breakdown-title">Score breakdown</p>
          <div className="ranking-line">
            <span>Value<small>Channel3 offer price</small></span>
            <strong>
              {valueDimension && valueDimension.score !== null
                ? `${valueDimension.score}/100 × ${valueDimension.weight} (${formatImportance(valueDimension.importance)})`
                : 'Not scored'}
            </strong>
          </div>
          <div className="prototype-signals">
            <p className="prototype-signals-title">Prototype owner signals</p>
            <p className="prototype-signals-note">Demo values, separate from Channel3 product facts.</p>
            {ranked.dimensions.filter((dimension) => dimension.source === 'prototype').map((dimension) => (
              <div className="ranking-line" key={dimension.key}>
                <span>{dimension.label}</span>
                <strong>{dimension.score}/100 × {dimension.weight} ({formatImportance(dimension.importance)})</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function PreferenceControls({
  preferences,
  onChange,
  valueAvailable,
  rankingActive,
}: {
  preferences: Preferences;
  onChange: (key: PreferenceKey, value: PreferenceImportance) => void;
  valueAvailable: boolean;
  rankingActive: boolean;
}) {
  return (
    <section className="preference-panel" aria-label="Ranking preferences" data-testid="panel-preferences">
      <div className="preference-heading">
        <div>
          <span className="section-kicker">PERSONALIZE THIS SEARCH</span>
          <h3>What matters most?</h3>
        </div>
        <span className="preference-status" data-testid="status-ranking">
          {rankingActive ? 'RANKING UPDATED' : 'CHOOSE ALL FOUR'}
        </span>
      </div>
      <div className="preference-controls">
        {preferenceOptions.map(({ key, label }) => (
          <label className="preference-field" htmlFor={`preference-${key}`} key={key}>
            <span>{label}</span>
            <select
              id={`preference-${key}`}
              value={preferences[key]}
              onChange={(event) => onChange(key, event.currentTarget.value as PreferenceImportance)}
              data-testid={`select-preference-${key}`}
            >
              <option value="" disabled>Choose</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        ))}
      </div>
      <p className="preference-method">
        Score = weighted average of 0–100 dimensions, with High / Medium / Low weighted 3 / 2 / 1.
        {valueAvailable
          ? ' Value uses same-currency Channel3 offer prices; lower prices score higher, normalized within these results.'
          : ' Value is omitted when prices are missing or use different currencies.'}
        {' '}Ties keep Channel3’s original order.
      </p>
      <p className="preference-prototype-note">
        <strong>Prototype owner signals</strong> are deterministic demo values based on product IDs, not Channel3 facts.
      </p>
    </section>
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
  const [preferences, setPreferences] = useState<Preferences>({
    materials: '',
    quality: '',
    value: '',
    longevity: '',
  });
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
  const rankingActive = hasAllPreferences(preferences);
  const rankedProducts = rankingActive ? rankProducts(products, preferences) : [];
  const valueAvailable = getValueScores(products).size > 0;

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
          {query.isSuccess && !query.isFetching && products.length > 0 && (
            <PreferenceControls
              preferences={preferences}
              onChange={(key, value) => setPreferences((current) => ({ ...current, [key]: value }))}
              valueAvailable={valueAvailable}
              rankingActive={rankingActive}
            />
          )}
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
              {(rankingActive ? rankedProducts : products.map((product, index) => ({ product, originalIndex: index }))).map((row, index) => (
                <ProductCard
                  key={row.product.id}
                  product={row.product}
                  index={index}
                  ranked={rankingActive ? row as RankedProduct : undefined}
                  rank={rankingActive ? index + 1 : undefined}
                />
              ))}
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
