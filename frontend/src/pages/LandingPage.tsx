import { useEffect } from 'react'

const LandingPage = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    const revealNodes = document.querySelectorAll('.reveal')
    revealNodes.forEach((el) => observer.observe(el))

    const nav = document.querySelector('nav')
    const onScroll = () => {
      if (!nav) return
      ;(nav as HTMLElement).style.background =
        window.scrollY > 40 ? 'rgba(12,10,9,0.97)' : 'rgba(12,10,9,0.85)'
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      revealNodes.forEach((el) => observer.unobserve(el))
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      <style>{`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --orange:#EA580C;--orange-light:#FB923C;--orange-pale:#FFF7ED;--orange-mid:#FED7AA;
  --dark:#0C0A09;--dark-2:#1C1917;--dark-3:#292524;
  --mid:#57534E;--muted:#A8A29E;
  --border:rgba(255,255,255,0.08);--border-light:#E7E5E4;--white:#FAFAF9;
}
.landing{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;background:var(--dark);color:var(--white);overflow-x:hidden;-webkit-font-smoothing:antialiased}
.landing nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 2rem;height:60px;display:flex;align-items:center;justify-content:space-between;background:rgba(12,10,9,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);transition:background 0.3s}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}.nav-logo-mark{width:4px;height:22px;background:var(--orange);border-radius:2px}.nav-logo-text{font-size:1rem;font-weight:600;color:var(--white)}
.nav-links{display:flex;align-items:center;gap:2rem;list-style:none}.nav-links a{font-size:.875rem;color:var(--muted);text-decoration:none}.nav-links a:hover{color:var(--white)}
.nav-cta{display:flex;align-items:center;gap:1rem}.btn-ghost{font-size:.875rem;color:var(--muted);background:none;border:none;cursor:pointer;text-decoration:none}.btn-ghost:hover{color:var(--white)}
.btn-primary{font-size:.875rem;font-weight:600;color:white;background:var(--orange);border:none;padding:.5rem 1.25rem;border-radius:8px;cursor:pointer;text-decoration:none;transition:background .2s,transform .15s;display:inline-block}.btn-primary:hover{background:#C2410C;transform:translateY(-1px)}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8rem 2rem 6rem;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(234,88,12,0.18) 0%,transparent 70%);pointer-events:none}
.hero-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(234,88,12,0.4);border-radius:100px;padding:.35rem 1rem;font-size:.8rem;color:var(--orange-light);margin-bottom:2.5rem;background:rgba(234,88,12,.08)}
.hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--orange)}
.hero-headline{font-family:Georgia,serif;font-size:clamp(3rem,7vw,5.5rem);line-height:1.05;color:var(--white);max-width:820px;margin-bottom:1.75rem}
.hero-headline em{font-style:italic;color:var(--orange-light)}.hero-sub{font-size:1.125rem;color:var(--muted);max-width:520px;line-height:1.7;font-weight:300;margin-bottom:3rem}
.hero-actions{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;justify-content:center;margin-bottom:5rem}.btn-large{font-size:1rem;padding:.85rem 2rem;border-radius:10px}
.btn-outline{font-size:1rem;font-weight:400;color:var(--muted);background:none;border:1px solid rgba(255,255,255,.12);padding:.85rem 2rem;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-block}.btn-outline:hover{border-color:rgba(255,255,255,.3);color:var(--white)}
.hero-preview{width:100%;max-width:1000px;margin:0 auto}.preview-frame{background:var(--dark-2);border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.6)}
.preview-bar{background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.06);padding:12px 16px;display:flex;align-items:center;gap:8px}.preview-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.preview-body{display:grid;grid-template-columns:180px 1fr;min-height:360px}.preview-sidebar{background:rgba(255,255,255,.02);border-right:1px solid rgba(255,255,255,.06);padding:1.25rem .75rem}
.preview-nav-label{font-size:.6rem;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.2);padding:0 .75rem;margin-bottom:.5rem;margin-top:.75rem}
.preview-nav-item{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-radius:6px;font-size:.78rem;color:rgba(255,255,255,.35);margin-bottom:2px}
.preview-nav-item.active{background:rgba(234,88,12,.15);color:var(--orange-light);border-left:2px solid var(--orange);padding-left:calc(.75rem - 2px)}
.preview-nav-dot{width:10px;height:10px;border-radius:2px;background:currentColor;opacity:.5;flex-shrink:0}
.preview-main{padding:1.5rem;background:rgba(0,0,0,.1)}.preview-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem}
.preview-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.85rem}
.preview-stat-label{font-size:.6rem;font-weight:600;color:rgba(255,255,255,.3);margin-bottom:.5rem}.preview-stat-value{font-size:1.4rem;font-weight:600;color:var(--white)}
.preview-stat-badge{display:inline-block;font-size:.55rem;font-weight:600;background:rgba(74,222,128,.15);color:#4ADE80;padding:2px 6px;border-radius:100px;margin-left:6px;vertical-align:middle}
.preview-charts{display:grid;grid-template-columns:2fr 1fr;gap:.75rem}.preview-chart-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:.85rem}
.preview-chart-title{font-size:.7rem;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:.75rem}.preview-bars{display:flex;align-items:flex-end;gap:5px;height:60px}.preview-bar-item{flex:1;border-radius:3px 3px 0 0;background:var(--orange);opacity:.7}.preview-bar-item:last-child{opacity:1}
.preview-status-list{display:flex;flex-direction:column;gap:6px}.preview-status-row{display:flex;align-items:center;gap:6px;font-size:.65rem;color:rgba(255,255,255,.4)}.preview-status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}.preview-status-count{margin-left:auto;font-weight:600;color:rgba(255,255,255,.7)}
.section{padding:7rem 2rem;max-width:1100px;margin:0 auto}.section-tag{display:inline-block;font-size:.75rem;font-weight:600;color:var(--orange-light);letter-spacing:.08em;margin-bottom:1rem}
.section-title{font-family:Georgia,serif;font-size:clamp(2rem,4vw,3.25rem);line-height:1.1;margin-bottom:1.25rem;max-width:600px}.section-title em{font-style:italic;color:var(--orange-light)}.section-sub{font-size:1rem;color:var(--muted);line-height:1.7;max-width:480px;font-weight:300;margin-bottom:4rem}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden}
.feature-card{background:var(--dark-2);padding:2rem}.feature-card:hover{background:var(--dark-3)}.feature-icon{width:40px;height:40px;border-radius:10px;background:rgba(234,88,12,.12);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem}
.feature-title{font-size:1rem;font-weight:600;color:var(--white);margin-bottom:.6rem}.feature-desc{font-size:.875rem;color:var(--muted);line-height:1.65}
.kitchen-section{padding:7rem 2rem;background:var(--dark-2);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.kitchen-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center}
.kanban-preview{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kanban-col-header{font-size:.65rem;font-weight:600;padding:5px 8px;border-radius:6px;margin-bottom:8px;text-align:center}
.kanban-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px;margin-bottom:8px;border-left-width:2px;border-left-style:solid}
.kanban-card-id{font-size:.6rem;font-weight:600;color:rgba(255,255,255,.4);margin-bottom:6px}.kanban-card-item{font-size:.65rem;color:rgba(255,255,255,.6);margin-bottom:2px}.kanban-card-amt{font-size:.7rem;font-weight:600;color:var(--white);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.kanban-btn{width:100%;background:var(--orange);border:none;border-radius:5px;padding:5px 0;font-size:.6rem;font-weight:600;color:white;margin-top:6px}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;margin-top:4rem}
.pricing-card{background:var(--dark-2);padding:2.5rem;position:relative}.pricing-card.featured{background:var(--dark-3);border:1px solid rgba(234,88,12,.3)}
.pricing-badge{position:absolute;top:-1px;right:2rem;background:var(--orange);font-size:.7rem;font-weight:600;color:white;padding:3px 12px;border-radius:0 0 8px 8px}
.pricing-plan{font-size:.75rem;font-weight:600;letter-spacing:.08em;color:var(--muted);margin-bottom:1rem}.pricing-price{font-family:Georgia,serif;font-size:3rem;color:var(--white);line-height:1;margin-bottom:.25rem}.pricing-price sup{font-family:inherit;font-size:1.25rem;vertical-align:super}
.pricing-period{font-size:.8rem;color:var(--muted);margin-bottom:1.75rem}.pricing-divider{border:none;border-top:1px solid rgba(255,255,255,.07);margin-bottom:1.75rem}
.pricing-features{list-style:none;margin-bottom:2rem}.pricing-features li{font-size:.875rem;color:var(--muted);padding:.4rem 0;display:flex;align-items:center;gap:.6rem}.pricing-check{color:var(--orange-light);font-size:.75rem}
.btn-pricing{width:100%;padding:.75rem;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;text-align:center;display:block;text-decoration:none}.btn-pricing-primary{background:var(--orange);color:white;border:none}.btn-pricing-primary:hover{background:#C2410C}.btn-pricing-ghost{background:none;color:var(--muted);border:1px solid rgba(255,255,255,.1)}.btn-pricing-ghost:hover{border-color:rgba(255,255,255,.25);color:var(--white)}
.testimonials{padding:7rem 2rem;max-width:1100px;margin:0 auto}.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;margin-top:4rem}
.testimonial-card{background:var(--dark-2);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1.75rem}.testimonial-stars{color:var(--orange);margin-bottom:1rem;font-size:.8rem;letter-spacing:2px}
.testimonial-text{font-size:.9rem;line-height:1.7;color:rgba(255,255,255,.6);margin-bottom:1.5rem;font-style:italic}.testimonial-author{display:flex;align-items:center;gap:.75rem}.testimonial-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:600;flex-shrink:0}.testimonial-name{font-size:.875rem;font-weight:600;color:var(--white)}.testimonial-role{font-size:.75rem;color:var(--muted)}
.cta-section{padding:7rem 2rem;text-align:center;position:relative;overflow:hidden}.cta-section::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(234,88,12,.15) 0%,transparent 70%)}
.cta-inner{max-width:600px;margin:0 auto;position:relative}.cta-title{font-family:Georgia,serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1.1;margin-bottom:1.25rem}.cta-title em{font-style:italic;color:var(--orange-light)}.cta-sub{font-size:1rem;color:var(--muted);margin-bottom:2.5rem;line-height:1.7}
footer{background:var(--dark-2);border-top:1px solid rgba(255,255,255,.06);padding:3rem 2rem}.footer-inner{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1.5rem}.footer-copy{font-size:.8rem;color:var(--muted)}.footer-links{display:flex;gap:1.5rem;list-style:none}.footer-links a{font-size:.8rem;color:var(--muted);text-decoration:none}.footer-links a:hover{color:var(--white)}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease}.reveal.visible{opacity:1;transform:translateY(0)}
@media(max-width:768px){.nav-links{display:none}.preview-body{grid-template-columns:1fr}.preview-sidebar{display:none}.kitchen-inner{grid-template-columns:1fr}.kanban-preview{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <div className="landing">
        <nav>
          <a href="/" className="nav-logo">
            <span className="nav-logo-mark" />
            <span className="nav-logo-text">PlatterOps</span>
          </a>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#kitchen">Kitchen</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#testimonials">Reviews</a></li>
          </ul>
          <div className="nav-cta">
            <a href="/login" className="btn-ghost">Sign in</a>
            <a href="/login" className="btn-primary">Get started free</a>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-badge"><span className="hero-badge-dot" />Multi-tenant SaaS for Indian restaurants</div>
          <h1 className="hero-headline">Run your restaurant.<br /><em>Not spreadsheets.</em></h1>
          <p className="hero-sub">PlatterOps gives every restaurant a live kitchen board, digital QR menu, and real-time analytics. From a single outlet to a chain — one platform.</p>
          <div className="hero-actions">
            <a href="/login" className="btn-primary btn-large">Start for free</a>
            <a href="#features" className="btn-outline">See how it works</a>
          </div>

          <div className="hero-preview">
            <div className="preview-frame">
              <div className="preview-bar">
                <span className="preview-dot" style={{ background: '#FF5F57' }} />
                <span className="preview-dot" style={{ background: '#FFBD2E' }} />
                <span className="preview-dot" style={{ background: '#28C840' }} />
              </div>
              <div className="preview-body">
                <div className="preview-sidebar">
                  <div className="preview-nav-label">MAIN</div>
                  <div className="preview-nav-item active"><span className="preview-nav-dot" />Dashboard</div>
                  <div className="preview-nav-item"><span className="preview-nav-dot" />Menu</div>
                  <div className="preview-nav-item"><span className="preview-nav-dot" />Kitchen</div>
                  <div className="preview-nav-item"><span className="preview-nav-dot" />Inventory</div>
                  <div className="preview-nav-label">SETTINGS</div>
                  <div className="preview-nav-item"><span className="preview-nav-dot" />Tables</div>
                  <div className="preview-nav-item"><span className="preview-nav-dot" />Subscription</div>
                </div>
                <div className="preview-main">
                  <div className="preview-stats">
                    <div className="preview-stat"><div className="preview-stat-label">TODAY'S ORDERS</div><div className="preview-stat-value">48<span className="preview-stat-badge">+12%</span></div></div>
                    <div className="preview-stat"><div className="preview-stat-label">REVENUE</div><div className="preview-stat-value">₹8,240</div></div>
                    <div className="preview-stat"><div className="preview-stat-label">AVG ORDER</div><div className="preview-stat-value">₹172</div></div>
                  </div>
                  <div className="preview-charts">
                    <div className="preview-chart-card">
                      <div className="preview-chart-title">Revenue trend · last 7 days</div>
                      <div className="preview-bars">
                        <div className="preview-bar-item" style={{ height: '45%' }} />
                        <div className="preview-bar-item" style={{ height: '58%' }} />
                        <div className="preview-bar-item" style={{ height: '51%' }} />
                        <div className="preview-bar-item" style={{ height: '72%' }} />
                        <div className="preview-bar-item" style={{ height: '62%' }} />
                        <div className="preview-bar-item" style={{ height: '85%' }} />
                        <div className="preview-bar-item" style={{ height: '100%' }} />
                      </div>
                    </div>
                    <div className="preview-chart-card">
                      <div className="preview-chart-title">By status</div>
                      <div className="preview-status-list">
                        <div className="preview-status-row"><span className="preview-status-dot" style={{ background: '#FBBF24' }} />Pending<span className="preview-status-count">6</span></div>
                        <div className="preview-status-row"><span className="preview-status-dot" style={{ background: '#60A5FA' }} />Confirmed<span className="preview-status-count">11</span></div>
                        <div className="preview-status-row"><span className="preview-status-dot" style={{ background: '#FB923C' }} />Preparing<span className="preview-status-count">9</span></div>
                        <div className="preview-status-row"><span className="preview-status-dot" style={{ background: '#4ADE80' }} />Ready<span className="preview-status-count">4</span></div>
                        <div className="preview-status-row"><span className="preview-status-dot" style={{ background: '#57534E' }} />Delivered<span className="preview-status-count">18</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="reveal">
            <span className="section-tag">PLATFORM</span>
            <h2 className="section-title">Everything your restaurant needs, <em>nothing it doesn't.</em></h2>
            <p className="section-sub">Built for Indian restaurant operators — FSSAI-aware, GST-ready, UPI-native. From a single QSR to a multi-branch chain.</p>
          </div>
          <div className="features-grid reveal">
            <div className="feature-card"><div className="feature-icon">🍽️</div><div className="feature-title">Digital menu with QR ordering</div><div className="feature-desc">Customers scan a table QR, browse your live menu, and place orders directly.</div></div>
            <div className="feature-card"><div className="feature-icon">👨‍🍳</div><div className="feature-title">Real-time kitchen view</div><div className="feature-desc">A live kanban board your kitchen staff can act on instantly.</div></div>
            <div className="feature-card"><div className="feature-icon">📊</div><div className="feature-title">Analytics that matter</div><div className="feature-desc">Revenue, top-selling items, prep time, and order status trends.</div></div>
            <div className="feature-card"><div className="feature-icon">📦</div><div className="feature-title">Inventory tracking</div><div className="feature-desc">Stock levels with low-stock alerts and quick availability updates.</div></div>
            <div className="feature-card"><div className="feature-icon">💳</div><div className="feature-title">UPI, Card & Cash</div><div className="feature-desc">Accept mixed payment methods and track status per order.</div></div>
            <div className="feature-card"><div className="feature-icon">🏢</div><div className="feature-title">Multi-tenant by design</div><div className="feature-desc">Each restaurant stays fully isolated and secure.</div></div>
          </div>
        </section>

        <section className="kitchen-section" id="kitchen">
          <div className="kitchen-inner">
            <div className="reveal">
              <span className="section-tag">KITCHEN VIEW</span>
              <h2 className="section-title">Your kitchen,<br /><em>always in sync.</em></h2>
              <p className="section-sub">Orders flow from customer phone to the kitchen board in real time.</p>
            </div>
            <div className="kanban-preview reveal">
              <div><div className="kanban-col-header" style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>New</div><div className="kanban-card" style={{ borderLeftColor: '#FBBF24' }}><div className="kanban-card-id">#A3F291</div><div className="kanban-card-item">Butter Chicken ×2</div><div className="kanban-card-amt">₹680</div><button className="kanban-btn">Confirm</button></div></div>
              <div><div className="kanban-col-header" style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>Confirmed</div><div className="kanban-card" style={{ borderLeftColor: '#60A5FA' }}><div className="kanban-card-id">#CC9D11</div><div className="kanban-card-item">Biryani ×1</div><div className="kanban-card-amt">₹380</div><button className="kanban-btn">Start prep</button></div></div>
              <div><div className="kanban-col-header" style={{ background: 'rgba(251,146,60,0.12)', color: '#FB923C' }}>Preparing</div><div className="kanban-card" style={{ borderLeftColor: '#FB923C' }}><div className="kanban-card-id">#D3EA55</div><div className="kanban-card-item">Masala Dosa ×2</div><div className="kanban-card-amt">₹340</div><button className="kanban-btn">Mark ready</button></div></div>
              <div><div className="kanban-col-header" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>Ready</div><div className="kanban-card" style={{ borderLeftColor: '#4ADE80' }}><div className="kanban-card-id">#F2910C</div><div className="kanban-card-item">Dal Makhani ×2</div><div className="kanban-card-amt">₹360</div><button className="kanban-btn">Delivered</button></div></div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="reveal">
            <span className="section-tag">PRICING</span>
            <h2 className="section-title">Simple pricing.<br /><em>No surprises.</em></h2>
            <p className="section-sub">Start free, scale when you need to.</p>
          </div>
          <div className="pricing-grid reveal">
            <div className="pricing-card"><div className="pricing-plan">STARTER</div><div className="pricing-price"><sup>₹</sup>0</div><div className="pricing-period">Free forever · 1 outlet</div><hr className="pricing-divider" /><ul className="pricing-features"><li><span className="pricing-check">✓</span>QR menu</li><li><span className="pricing-check">✓</span>Kitchen board</li></ul><a href="/login" className="btn-pricing btn-pricing-ghost">Get started free</a></div>
            <div className="pricing-card featured"><span className="pricing-badge">Most popular</span><div className="pricing-plan">PRO</div><div className="pricing-price"><sup>₹</sup>1,999</div><div className="pricing-period">per month · up to 3 outlets</div><hr className="pricing-divider" /><ul className="pricing-features"><li><span className="pricing-check">✓</span>Everything in Starter</li><li><span className="pricing-check">✓</span>Inventory + analytics</li></ul><a href="/login" className="btn-pricing btn-pricing-primary">Start 14-day trial</a></div>
            <div className="pricing-card"><div className="pricing-plan">ENTERPRISE</div><div className="pricing-price" style={{ fontSize: '2rem', paddingTop: '.5rem' }}>Custom</div><div className="pricing-period">Chains · Cloud kitchens</div><hr className="pricing-divider" /><ul className="pricing-features"><li><span className="pricing-check">✓</span>Unlimited outlets</li><li><span className="pricing-check">✓</span>Priority support</li></ul><a href="mailto:hello@dineops.in" className="btn-pricing btn-pricing-ghost">Contact us</a></div>
          </div>
        </section>

        <section className="testimonials" id="testimonials">
          <div className="reveal"><span className="section-tag">REVIEWS</span><h2 className="section-title">Operators love it.<br /><em>Kitchens run smoother.</em></h2></div>
          <div className="testimonials-grid reveal">
            <div className="testimonial-card"><div className="testimonial-stars">★★★★★</div><p className="testimonial-text">"Prep time dropped by 4 minutes per order."</p><div className="testimonial-author"><div className="testimonial-avatar" style={{ background: 'rgba(234,88,12,0.15)', color: 'var(--orange-light)' }}>RS</div><div><div className="testimonial-name">Rahul Sharma</div><div className="testimonial-role">Owner · Spice Garden</div></div></div></div>
            <div className="testimonial-card"><div className="testimonial-stars">★★★★★</div><p className="testimonial-text">"The QR menu is a game-changer."</p><div className="testimonial-author"><div className="testimonial-avatar" style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>AP</div><div><div className="testimonial-name">Anita Pillai</div><div className="testimonial-role">Manager · Dosa Republic</div></div></div></div>
            <div className="testimonial-card"><div className="testimonial-stars">★★★★★</div><p className="testimonial-text">"Running three outlets from one dashboard is seamless."</p><div className="testimonial-author"><div className="testimonial-avatar" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>MK</div><div><div className="testimonial-name">Mohammed Khan</div><div className="testimonial-role">Founder · Urban Tadka</div></div></div></div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-inner reveal">
            <h2 className="cta-title">Ready to <em>modernise</em><br />your restaurant?</h2>
            <p className="cta-sub">Join restaurants running on PlatterOps. Free to start.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/login" className="btn-primary btn-large">Get started free</a>
              <a href="mailto:hello@dineops.in" className="btn-outline">Talk to us</a>
            </div>
          </div>
        </section>

        <footer>
          <div className="footer-inner">
            <div>
              <a href="/" className="nav-logo" style={{ display: 'inline-flex', marginBottom: '.5rem' }}>
                <span className="nav-logo-mark" />
                <span className="nav-logo-text">PlatterOps</span>
              </a>
              <p className="footer-copy" style={{ marginTop: '.5rem' }}>© 2025 PlatterOps. Built in Pune, India.</p>
            </div>
            <ul className="footer-links">
              <li><a href="/privacy">Privacy</a></li>
              <li><a href="/terms">Terms</a></li>
              <li><a href="mailto:hello@dineops.in">Contact</a></li>
            </ul>
          </div>
        </footer>
      </div>
    </>
  )
}

export default LandingPage

