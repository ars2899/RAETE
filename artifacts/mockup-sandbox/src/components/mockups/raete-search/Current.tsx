import './_group.css';

const referenceProducts = [
  { brand: 'MIRROR PALACE', title: 'Ribbed Mini Skirt in Black', price: '$48', style: 'rib' },
  { brand: 'EDITED', title: 'Cotton Twill Micro Skirt', price: '$62', style: 'twill' },
  { brand: 'STUDIO 189', title: 'Structured Wool Blend Skirt', price: '$95', style: 'wool' },
  { brand: 'COS', title: 'Tailored A-Line Mini Skirt', price: '$89', style: 'tailored' },
];

export function Current() {
  return (
    <main className="raete-current">
      <header className="rc-topbar"><span className="rc-brand">raete</span><span className="rc-note">PRODUCT SEARCH　/　CHANNEL3</span></header>
      <section className="rc-hero">
        <span className="rc-kicker">01　 THE OPEN WEB, IN VIEW</span>
        <h1>Find the<br /><em>piece.</em></h1>
        <p>Search across retailers.<br />See what’s out there, as it is.</p>
        <div className="rc-search"><span>⌕</span><span style={{ color: '#777' }}>black mini skirt</span><button>Search　↗</button></div>
        <div className="rc-meta" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}><span>SEARCH THE CATALOG</span><span>UP TO 8 RESULTS</span></div>
      </section>
      <section className="rc-results">
        <span className="rc-kicker">YOUR SEARCH · PREVIEW DATA</span>
        <h2>black mini skirt</h2>
        <div className="rc-grid">
          {referenceProducts.map((product) => (
            <article className="rc-card" key={product.title}>
              <div className="rc-image" aria-label="Illustrative skirt image">
                <svg viewBox="0 0 300 375" aria-hidden="true">
                  <path className={`rc-skirt rc-skirt-${product.style}`} d={product.style === 'tailored' ? 'M105 85 Q150 97 195 85 L224 277 Q151 294 76 277 Z' : 'M108 84 Q150 96 192 84 L218 275 Q151 291 82 275 Z'} />
                  <path className="rc-waist" d="M108 92 Q150 103 192 92" />
                  {product.style === 'rib' && <path className="rc-rib" d="M120 104 L109 269 M132 106 L123 272 M144 108 L137 273 M156 108 L157 274 M168 106 L176 272 M180 104 L194 269" />}
                </svg>
              </div>
              <span className="rc-kicker">{product.brand}</span>
              <h3>{product.title}</h3>
              <div className="rc-price"><strong>{product.price}</strong><span>merchant ↗</span></div>
            </article>
          ))}
        </div>
      </section>
      <footer className="rc-foot">RAETE　/　A WINDOW INTO WHAT’S AVAILABLE</footer>
    </main>
  );
}
