import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Eye,
  Flame,
  Globe,
  Heart,
  HeartPulse,
  Leaf,
  Lightbulb,
  Mail,
  Menu,
  Quote,
  Target,
  TrendingUp,
  Users,
  Wind,
  X,
} from 'lucide-react';
import './Landing.css';
import './AboutUs.css';
import logo from "../assets/Leaf and Life logo.png";
import dikshyaImg from '../assets/Dikshya Sitaula.jpg';
import rishuImg from '../assets/Rishu Prajapati.jpeg';
import aditaImg from '../assets/Adita Rai.jpeg';
import lizaImg from '../assets/Liza Shrestha.jpeg';
import AuthModal from '../components/AuthModal';

// Custom hook for scroll-reveal animation
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    const node = ref.current;
    if (node) observer.observe(node);
    return () => { if (node) observer.unobserve(node); };
  }, []);

  return [ref, isVisible];
}

function RevealUp({ children, delay = 0 }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`au-reveal au-reveal-up ${isVisible ? 'au-reveal-active' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function RevealLeft({ children, delay = 0 }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`au-reveal au-reveal-left ${isVisible ? 'au-reveal-active' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function RevealRight({ children, delay = 0 }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`au-reveal au-reveal-right ${isVisible ? 'au-reveal-active' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function AboutUs() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leafLifeSubmitted') === 'true';
    }
    return false;
  });

  const openAuthModal = () => { setAuthOpen(true); };

  const handleGetStarted = () => {
    if (isSubmitted) {
      navigate('/dashboard');
    } else {
      openAuthModal();
    }
  };

  const handleModalSubmit = (data) => {
    localStorage.setItem('leafLifeSubmitted', 'true');
    localStorage.setItem('leafLifeAuthenticated', 'true');
    if (data) {
      if (data.userId) localStorage.setItem('leafLifeUserId', data.userId);
      if (data.email) localStorage.setItem('leafLifeUserEmail', data.email);
      const nameToSet = data.fullName || (data.email ? data.email.split('@')[0] : 'User');
      localStorage.setItem('leafLifeUserName', nameToSet);
    }
    setIsSubmitted(true);
    setAuthOpen(false);
    navigate('/dashboard');
  };

  useEffect(() => {
    if (!authOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [authOpen]);

  return (
    <div className="lp-root about-root">
      {/* Navbar */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="Leaf & Life Home">
            <span className="lp-brand-mark" aria-hidden="true">
              <img src={logo} alt="" className="lp-brand-img" />
            </span>
            <span className="lp-brand-text">Leaf &amp; Life</span>
          </Link>

          <div className="lp-nav-center">
            <Link className="lp-nav-link" to="/">Home</Link>
            <Link className="lp-nav-link" to="/about">About Us</Link>
            <Link className="lp-nav-link" to="/contact">Contact</Link>
            <Link className="lp-nav-link" to="/nursery/signin">Nursery</Link>
          </div>

          <div className="lp-nav-actions">
            {isSubmitted && (
              <button
                type="button"
                className="lp-btn lp-btn-ghost lp-btn-sm"
                onClick={() => {
                  localStorage.removeItem('leafLifeSubmitted');
                  localStorage.removeItem('leafLifeAuthenticated');
                  window.location.reload();
                }}
              >
                Switch Account
              </button>
            )}
            <button type="button" className="lp-btn lp-btn-primary" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>

          <button
            type="button"
            className="lp-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lp-mobile-drawer">
            <button type="button" className="lp-mobile-link" onClick={() => { setMobileMenuOpen(false); navigate('/'); }}>Home</button>
            <button type="button" className="lp-mobile-link" onClick={() => { setMobileMenuOpen(false); navigate('/about'); }}>About Us</button>
            <button type="button" className="lp-mobile-link" onClick={() => { setMobileMenuOpen(false); navigate('/contact'); }}>Contact</button>
            <button type="button" className="lp-mobile-link" onClick={() => { setMobileMenuOpen(false); navigate('/nursery/signin'); }}>Nursery</button>
            <div className="lp-mobile-drawer-actions">
              {isSubmitted && (
                <button
                  type="button"
                  className="lp-btn lp-btn-ghost lp-btn-sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    localStorage.removeItem('leafLifeSubmitted');
                    localStorage.removeItem('leafLifeAuthenticated');
                    window.location.reload();
                  }}
                >
                  Switch Account
                </button>
              )}
              <button type="button" className="lp-btn lp-btn-primary" onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }}>
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleModalSubmit}
      />

      {/* Hero Section */}
      <section className="au-hero">
        <div className="au-hero-bg">
          <div className="au-hero-glow au-hero-glow-1" />
          <div className="au-hero-glow au-hero-glow-2" />
        </div>
        <div className="au-hero-inner">
          <RevealUp>
            <div className="au-hero-badge">
              <Users size={16} />
              Get to Know Us
            </div>
            <h1 className="au-hero-title">
              Rooted in Purpose.<br />
              <span className="au-hero-title-muted">Growing Together.</span>
            </h1>
            <p className="au-hero-subtitle">
              We are a passionate team of innovators and creators dedicated to bridging the gap between nature and technology, making sustainable living accessible for everyone.
            </p>
          </RevealUp>

          {/* Stats Counter */}
          <RevealUp delay={200}>
            <div className="au-stats-counter">
              <div className="au-stats-counter-grid">
                <div className="au-stat-item">
                  <span className="au-stat-number">10K+</span>
                  <span className="au-stat-label">Plant Recommendations</span>
                </div>
                <div className="au-stat-item">
                  <span className="au-stat-number">500+</span>
                  <span className="au-stat-label">Plant Listings</span>
                </div>
                <div className="au-stat-item">
                  <span className="au-stat-number">100+</span>
                  <span className="au-stat-label">Local Nurseries</span>
                </div>
                <div className="au-stat-item">
                  <div className="au-stat-growing">
                    <span className="au-stat-number">Growing</span>
                    <TrendingUp size={24} className="au-stat-trending" />
                  </div>
                  <span className="au-stat-label">Eco Community</span>
                </div>
              </div>
            </div>
          </RevealUp>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="au-section au-section-secondary">
        <div className="au-container au-story-grid">
          <RevealLeft>
            <div className="au-story-visual">
              <div className="au-story-img-wrap au-float">
                <img
                  src="https://uxmagic.blob.core.windows.net/public/agent-images/our_story_img-1778315363961-lyypcn5hb2.png"
                  alt="Plant Care Journey"
                  className="au-story-img"
                />
              </div>
              <div className="au-story-quote">
                <Quote size={32} className="au-story-quote-icon" />
                <p className="au-story-quote-text">
                  "Small green actions today can create healthier communities tomorrow."
                </p>
              </div>
            </div>
          </RevealLeft>

          <RevealRight>
            <div className="au-story-copy">
              <div className="au-kicker">Our Journey</div>
              <h2 className="au-h2">Why We Started This Journey</h2>
              <div className="au-story-body">
                <p>Our story began with a very real and relatable problem. Many people genuinely want to bring greenery into their homes but often feel confused about where to start. Plants are purchased with excitement, only to slowly die because people are unsure about watering schedules, sunlight conditions, placement, or even the name of the plant they bought.</p>
                <p>At the same time, local nurseries and plant sellers struggle to expand digitally. Many rely solely on physical stores, limiting their visibility and access to wider communities. We saw an opportunity to create a meaningful bridge between people, plants, and technology.</p>
                <p>This inspired us to build a platform that simplifies plant care while making greenery more accessible, affordable, and community-driven. By combining AI technology with sustainable living practices, we aim to help individuals confidently create greener, healthier spaces — no matter their experience level.</p>
              </div>
            </div>
          </RevealRight>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="au-section">
        <div className="au-container">
          <RevealUp>
            <div className="au-section-head">
              <div className="au-kicker">What Drives Us</div>
              <h2 className="au-h2">Our Purpose &amp; Perspective</h2>
            </div>
          </RevealUp>
          <div className="au-mv-grid">
            <RevealUp delay={100}>
              <div className="au-mv-card au-mv-card-light">
                <div className="au-mv-icon-wrap au-mv-icon-light">
                  <Target size={28} />
                </div>
                <h3 className="au-mv-title">Our Mission</h3>
                <p className="au-mv-text">
                  We aim to make plant care simple, accessible, and enjoyable for everyone. Through AI-powered guidance, personalized recommendations, and local plant exchange, we empower people to confidently build greener homes and healthier living environments.
                </p>
              </div>
            </RevealUp>
            <RevealUp delay={200}>
              <div className="au-mv-card au-mv-card-dark">
                <div className="au-mv-glow" />
                <div className="au-mv-icon-wrap au-mv-icon-dark">
                  <Eye size={28} />
                </div>
                <h3 className="au-mv-title au-mv-title-light">Our Vision</h3>
                <p className="au-mv-text au-mv-text-light">
                  We envision a future where technology and sustainability work together to reconnect people with nature. Our goal is to create greener cities, healthier homes, and stronger communities through smart environmental awareness and digital accessibility.
                </p>
              </div>
            </RevealUp>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="au-section au-section-secondary">
        <div className="au-container">
          <RevealUp>
            <div className="au-section-head">
              <div className="au-kicker">Our People</div>
              <h2 className="au-h2">The Team Behind the Vision</h2>
              <p className="au-section-sub">A passionate team of creators, innovators, and problem-solvers building technology that reconnects people with nature.</p>
            </div>
          </RevealUp>
          <div className="au-team-grid">
            {[
              { name: 'Dikshya Sitaula', role: 'Frontend Dev, AI Integration & Co-Lead', img: dikshyaImg, delay: 100 },
              { name: 'Rishu Prajapati', role: 'Backend Dev, AI Integration & Co-Lead', img: rishuImg, delay: 200 },
              { name: 'Adita Rai', role: 'Database & Model Training ', img: aditaImg, delay: 300 },
              { name: 'Liza Shrestha', role: 'Database & Model Training', img: lizaImg, delay: 400 },
            ].map((member) => (
              <RevealUp key={member.name} delay={member.delay}>
                <div className="au-team-card">
                  <div className="au-team-avatar-wrap">
                    <div className="au-team-avatar-glow" />
                    <img src={member.img} alt={member.name} className="au-team-avatar" />
                  </div>
                  <h4 className="au-team-name">{member.name}</h4>
                  <div className="au-team-role">{member.role}</div>
                </div>
              </RevealUp>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="au-section">
        <div className="au-container">
          <RevealUp>
            <div className="au-section-head">
              <div className="au-kicker">Our Core Values</div>
              <h2 className="au-h2">The Values That Shape Our Vision</h2>
            </div>
          </RevealUp>
          <div className="au-values-grid">
            {[
              { icon: <Flame size={24} />, title: 'Sustainability', desc: 'Promoting environmentally responsible habits and greener lifestyles through accessible solutions.', delay: 100 },
              { icon: <Lightbulb size={24} />, title: 'Innovation', desc: 'Using AI and smart technology to simplify plant care and make sustainable living practical.', delay: 200 },
              { icon: <Heart size={24} />, title: 'Community', desc: 'Positive environmental impact grows stronger through collaboration and meaningful connections.', delay: 300 },
              { icon: <Globe size={24} />, title: 'Accessibility', desc: 'Making plants and plant knowledge accessible to everyone regardless of experience.', delay: 400 },
            ].map((val) => (
              <RevealUp key={val.title} delay={val.delay}>
                <div className="au-value-card">
                  <div className="au-value-icon">{val.icon}</div>
                  <h4 className="au-value-title">{val.title}</h4>
                  <p className="au-value-desc">{val.desc}</p>
                </div>
              </RevealUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────── */}
      <section className="lp-section lp-cta">
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">Ready to Start Your Green Journey?</h2>
          <p className="lp-lead">
            Make your living space greener, healthier, and smarter with AI-powered plant guidance and a connected plant community.
          </p>
          <div className="lp-hero-actions lp-cta-actions">
            <button type="button" className="lp-btn lp-btn-primary lp-btn-xl" onClick={handleGetStarted}>
              Get Started Now
            </button>
            <button type="button" className="lp-btn lp-btn-ghost lp-btn-xl" onClick={() => navigate('/marketplace')}>
              Explore Marketplace
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <img src={logo} alt="Leaf & Life" className="lp-footer-img" />
                <span className="lp-brand-text">Leaf &amp; Life</span>
              </div>
              <p className="lp-p">
                AI-powered plant recommendation and exchange platform designed to promote greener living through technology and community.
              </p>
            </div>
            <div>
              <h5 className="lp-footer-h">Platform</h5>
              <ul className="lp-footer-list">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/scan">Smart Scan</Link></li>
                <li><Link to="/marketplace">Marketplace</Link></li>
                <li><Link to="/rewards">Community</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="lp-footer-h">Company</h5>
              <ul className="lp-footer-list">
                <li><a href="#" onClick={(e) => e.preventDefault()}>About Us</a></li>
                <li><a href="#" onClick={(e) => e.preventDefault()}>Contact</a></li>
                <li><a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a></li>
                <li><a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h5 className="lp-footer-h">Connect</h5>
              <div className="lp-social">
                <a className="lp-social-btn" href="#" onClick={(e) => e.preventDefault()} aria-label="Instagram">
                  <Camera size={18} />
                </a>
                <a className="lp-social-btn" href="#" onClick={(e) => e.preventDefault()} aria-label="LinkedIn">
                  <Globe size={18} />
                </a>
                <a className="lp-social-btn" href="#" onClick={(e) => e.preventDefault()} aria-label="Facebook">
                  <Users size={18} />
                </a>
                <a className="lp-social-btn" href="#" onClick={(e) => e.preventDefault()} aria-label="Twitter">
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <p>© 2026 Leaf &amp; Life. All rights reserved.</p>
            <div className="lp-footer-bottom-links">
              <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
