import './_group.css';
import { Search } from 'lucide-react';

export function Current() {
  return (
    <main className="current-page">
      <header className="current-topbar">
        <a className="current-wordmark" href="#" aria-label="RAETE">
          <span className="current-symbol"><span /></span>
          <span>raete</span>
        </a>
        <div className="current-note">
          <span className="current-dot" />
          PRODUCT SEARCH <span className="current-divider">/</span> CHANNEL3
        </div>
      </header>

      <section className="current-intro">
        <div className="current-eyebrow"><span>01</span> THE OPEN WEB, IN VIEW</div>
        <h1>Find the<br /><em>piece.</em></h1>
        <p className="current-copy">Search across retailers.<br /> See what’s out there, as it is.</p>
        <form className="current-form" onSubmit={(event) => event.preventDefault()}>
          <Search size={20} strokeWidth={1.7} aria-hidden="true" />
          <input type="search" placeholder="Try “black mini skirt”" aria-label="Search products" />
          <button type="submit">Search <span aria-hidden="true">↗</span></button>
        </form>
        <div className="current-foot"><span>SEARCH THE CATALOG</span><span>UP TO 8 RESULTS</span></div>
      </section>

      <section className="current-idle">
        <div className="current-index">A—Z <span>·</span> OPEN RETAIL</div>
        <div className="current-content">
          <div className="current-rule" />
          <p>Good things are<br />already out there.</p>
        </div>
        <span className="current-caption">START WITH WHAT YOU’RE LOOKING FOR</span>
      </section>

      <footer className="current-footer">
        <span>RAETE <span className="current-slash">/</span> A WINDOW INTO WHAT’S AVAILABLE</span>
        <span>PRODUCTS, ONE SEARCH AWAY</span>
      </footer>
    </main>
  );
}
