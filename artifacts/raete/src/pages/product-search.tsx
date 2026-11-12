import { useState, type FormEvent } from 'react';
import { Search, ArrowUpRight, RotateCw, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';
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
  { key: 'value', label: 'Price' },
  { key: 'longevity', label: 'Longevity' },
];

const priorityPresets: {
  name: string;
  values: SelectedPreferences;
}[] = [
  {
    name: 'Materials First',
    values: { materials: 'high', quality: 'medium', value: 'low', longevity: 'medium' },
  },
  {
    name: 'Keep It Forever',
    values: { materials: 'medium', quality: 'high', value: 'low', longevity: 'high' },
  },
  {
    name: 'Price Conscious',
    values: { materials: 'low', quality: 'medium', value: 'high', longevity: 'low' },
  },
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
          label: 'Price',
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
        score: weightedTotal / totalWeight,
      };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
}

function formatImportance(importance: SelectedImportance) {
  return importance.charAt(0).toUpperCase() + importance.slice(1);
}

function whyThisRank(item: RankedProduct) {
  const strongest = item.dimensions
    .filter((dimension): dimension is RankedDimension & { score: number } => dimension.score !== null)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  if (!strongest) return 'Its overall score reflects the priorities you selected.';
  if (strongest.source === 'channel3') {
    return 'Its listed Channel3 price contributes most to this order.';
  }
  return `Its ${strongest.label.toLowerCase()} prototype signal carries the most weight in this order.`;
}

function aheadOfSecond(first: RankedProduct, second: RankedProduct) {
  const firstAdvantages: string[] = [];
  const secondAdvantages: string[] = [];

  for (const dimension of first.dimensions) {
    const other = second.dimensions.find((candidate) => candidate.key === dimension.key);
    if (!other || dimension.score === null || other.score === null) continue;
    const weightedDifference = (dimension.score - other.score) * dimension.weight;
    if (weightedDifference === 0) continue;
    const advantage = dimension.key === 'value'
      ? 'lower listed price'
      : `stronger ${dimension.label.toLowerCase()} prototype signal`;
    (weightedDifference > 0 ? firstAdvantages : secondAdvantages).push(advantage);
  }

  if (firstAdvantages.length && secondAdvantages.length) {
    return `It leads on the weighted mix: ${firstAdvantages.join(' and ')}; #2 is stronger on ${secondAdvantages.join(' and ')}.`;
  }
  if (firstAdvantages.length) {
    return `It leads on the weighted mix, with ${firstAdvantages.join(' and ')}.`;
  }
  return 'Its selected priorities give it a higher weighted score.';
}

function ProductCard({
  product,
  index,
  ranked,
  rank,
  featured = false,
  closeCall = false,
  expanded = false,
  onToggleBreakdown,
  tradeoffCopy,
}: {
  product: Channel3Product;
  index: number;
  ranked?: RankedProduct;
  rank?: number;
  featured?: boolean;
  closeCall?: boolean;
  expanded?: boolean;
  onToggleBreakdown?: () => void;
  tradeoffCopy?: string;
}) {
  const image = getImage(product);
  const brand = product.brands?.find((item) => item.name)?.name;
  const offer = getOffer(product);
  const price = offer ? formatPrice(offer) : undefined;
  const imageUrl = image?.cleaned_url || image?.url;
  const alt = image?.alt_text || product.title;
  const valueDimension = ranked?.dimensions.find((dimension) => dimension.key === 'value');

  return (
    <article className={`product-card${featured ? ' featured-product' : ''}${closeCall ? ' close-call-product' : ''}`} data-testid={`card-product-${product.id}`} style={{ animationDelay: `${index * 55}ms` }}>
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
          </div>
          {featured && !closeCall && rank === 1 && (
            <>
              <div className="ranking-explanation">
                <strong>Why it's #1 for you</strong>
                <p>{whyThisRank(ranked)}</p>
              </div>
              {tradeoffCopy && (
                <div className="ranking-explanation">
                  <strong>Ahead of #2 because…</strong>
                  <p>{tradeoffCopy}</p>
                </div>
              )}
            </>
          )}
          {onToggleBreakdown && (
            <button className="breakdown-toggle" type="button" onClick={onToggleBreakdown} aria-expanded={expanded}>
              {expanded ? 'Hide why' : 'See why'} {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {expanded && <>
            <p className="ranking-breakdown-title">Score breakdown</p>
            <div className="ranking-line">
              <span>Price<small>Channel3 offer price</small></span>
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
                  <span>{dimension.label}<small className="prototype-label">Prototype</small></span>
                  <strong>{dimension.score}/100 × {dimension.weight} ({formatImportance(dimension.importance)})</strong>
                </div>
              ))}
            </div>
          </>}
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
  selectedPreset,
  onChoosePreset,
}: {
  preferences: Preferences;
  onChange: (key: PreferenceKey, value: PreferenceImportance) => void;
  valueAvailable: boolean;
  rankingActive: boolean;
  selectedPreset: string;
  onChoosePreset: (presetName: string) => void;
}) {
  return (
    <section className="preference-panel" aria-label="Priority controls and presets" data-testid="panel-preferences">
      <div className="preference-heading">
        <div>
          <span className="section-kicker">PERSONALIZE THIS SEARCH</span>
          <h3>What matters most?</h3>
        </div>
        <span className="preference-status" data-testid="status-ranking">
          {rankingActive ? 'RANKING UPDATED' : 'CHOOSE ALL FOUR'}
        </span>
      </div>
      <div className="priority-presets">
        <span className="preset-heading">PRESETS</span>
        <div className="preset-list">
          {priorityPresets.map((preset) => (
            <button
              key={preset.name}
              className={`priority-preset${selectedPreset === preset.name ? ' selected' : ''}`}
              type="button"
              aria-pressed={selectedPreset === preset.name}
              onClick={() => onChoosePreset(preset.name)}
            >
              <strong>{preset.name}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="preference-controls">
        {preferenceOptions.map(({ key, label }) => (
          <label className="preference-field" htmlFor={`preference-${key}`} key={key}>
            <span>{label}{key !== 'value' && <small className="prototype-label">Prototype</small>}</span>
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
          ? ' Price uses same-currency Channel3 offer prices; lower prices score higher, normalized within these products.'
          : ' Price is omitted when prices are missing or use different currencies.'}
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
  const [selectedPreset, setSelectedPreset] = useState('');
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<string[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [prototypeDisclosureOpen, setPrototypeDisclosureOpen] = useState(false);
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
    if (next) {
      setSubmittedQuery(next);
      setPreferences({ materials: '', quality: '', value: '', longevity: '' });
      setSelectedPreset('');
      setExpandedBreakdowns([]);
      setShowAllProducts(false);
    }
  }

  function choosePreset(presetName: string) {
    const preset = priorityPresets.find(({ name }) => name === presetName);
    if (!preset) return;
    setPreferences(preset.values);
    setSelectedPreset(preset.name);
    setShowAllProducts(false);
  }

  function changePriority(key: PreferenceKey, value: PreferenceImportance) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSelectedPreset('');
    setShowAllProducts(false);
  }

  function toggleBreakdown(productId: string) {
    setExpandedBreakdowns((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  }

  const products = query.data?.products?.slice(0, 8) ?? [];
  const rankingActive = hasAllPreferences(preferences);
  const rankedProducts = rankingActive ? rankProducts(products, preferences) : [];
  const closeCall = rankedProducts.length > 1 && rankedProducts[0].score - rankedProducts[1].score < 5;
  const valueAvailable = getValueScores(products).size > 0;
  const visibleProducts = showAllProducts ? rankedProducts : rankedProducts.slice(0, 3);

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Raete home" data-testid="link-home">
          <span className="brand-symbol"><span /></span>
          <span>raete</span>
        </a>
        <div className="topbar-tools">
          <div className="topbar-note"><span className="live-dot" /> PRODUCT SEARCH <span className="topbar-divider">/</span> CHANNEL3</div>
          <button
            className="prototype-disclosure-toggle"
            type="button"
            aria-expanded={prototypeDisclosureOpen}
            onClick={() => setPrototypeDisclosureOpen((open) => !open)}
          >
            Prototype data <ChevronDown size={13} />
          </button>
          {prototypeDisclosureOpen && (
            <div className="prototype-disclosure">
              <strong>Prototype data</strong>
              <p>Channel3 supplies product facts, retailer details, and listed prices.</p>
              <p>Materials, Quality, and Longevity use deterministic demo signals, not owner reports.</p>
            </div>
          )}
        </div>
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
              onChange={changePriority}
              valueAvailable={valueAvailable}
              rankingActive={rankingActive}
              selectedPreset={selectedPreset}
              onChoosePreset={choosePreset}
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
            rankingActive ? (
              <section className="ranked-results" aria-label="Ranked products" data-testid="list-products">
                {closeCall && (
                  <div className="close-call-notice">
                    <h3>No clear winner for your priorities</h3>
                    <p>The top two products are nearly even across the priorities you selected.</p>
                  </div>
                )}
                {!closeCall && rankedProducts.length > 0 && (
                  <ProductCard
                    key={rankedProducts[0].product.id}
                    product={rankedProducts[0].product}
                    index={0}
                    ranked={rankedProducts[0]}
                    rank={1}
                    featured
                    expanded={expandedBreakdowns.includes(rankedProducts[0].product.id)}
                    onToggleBreakdown={() => toggleBreakdown(rankedProducts[0].product.id)}
                    tradeoffCopy={rankedProducts[1] ? aheadOfSecond(rankedProducts[0], rankedProducts[1]) : undefined}
                  />
                )}
                {closeCall && (
                  <div className="close-call-pair">
                    {rankedProducts.slice(0, 2).map((row, index) => (
                      <ProductCard
                        key={row.product.id}
                        product={row.product}
                        index={index}
                        ranked={row}
                        rank={index + 1}
                        closeCall
                        expanded={expandedBreakdowns.includes(row.product.id)}
                        onToggleBreakdown={() => toggleBreakdown(row.product.id)}
                      />
                    ))}
                  </div>
                )}
                <div className={`product-grid ranked-products${closeCall ? ' ranked-after-close-call' : ''}`}>
                  {(closeCall ? visibleProducts.slice(2) : visibleProducts.slice(1)).map((row, index) => {
                    const rank = rankedProducts.findIndex(({ product }) => product.id === row.product.id) + 1;
                    return (
                      <ProductCard
                        key={row.product.id}
                        product={row.product}
                        index={index}
                        ranked={row}
                        rank={rank}
                        expanded={expandedBreakdowns.includes(row.product.id)}
                        onToggleBreakdown={() => toggleBreakdown(row.product.id)}
                      />
                    );
                  })}
                </div>
                {rankedProducts.length > 3 && !showAllProducts && (
                  <button className="show-more-products" type="button" onClick={() => setShowAllProducts(true)}>
                    Show more <span>{rankedProducts.length - 3} more products</span> <ChevronDown size={14} />
                  </button>
                )}
              </section>
            ) : (
              <div className="product-grid" data-testid="list-products">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )
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
