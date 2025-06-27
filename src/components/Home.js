import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home">
      <header>
        <div className="container">
          <nav>
            <div className="logo">
              <h1>InRent</h1>
            </div>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/listings">Listings</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <h1>Your Student Housing Marketplace</h1>
            <p>Find your perfect student accommodation in Botswana</p>
            <div className="cta-buttons">
              <Link to="/student-signup" className="btn primary">Student Signup</Link>
              <Link to="/landlord-signup" className="btn secondary">Landlord Signup</Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2>Why Choose InRent?</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <i className="fas fa-home"></i>
                <h3>Verified Listings</h3>
                <p>Only verified properties from trusted landlords</p>
              </div>
              <div className="feature-card">
                <i className="fas fa-user-graduate"></i>
                <h3>Student-Friendly</h3>
                <p>Properties designed for student living</p>
              </div>
              <div className="feature-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Secure Payments</h3>
                <p>Safe and secure payment processing</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
