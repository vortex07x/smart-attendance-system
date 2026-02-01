import React, { useState, useEffect, useRef } from 'react';

function Home({ isAdminLoggedIn, adminData, onNavigate }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleElements, setVisibleElements] = useState(new Set());
  const [activeFaq, setActiveFaq] = useState(null);
  
  const observerRef = useRef(null);

  // Carousel images - FULLY FIXED
  const carouselImages = [
    {
      url: 'https://images.unsplash.com/photo-1769650796145-30df10357926?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'Students in classroom'
    },
    {
      url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=500&fit=crop',
      alt: 'University campus'
    },
    {
      url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=500&fit=crop',
      alt: 'Modern education technology'
    }
  ];

  // Feature cards
  const features = [
    {
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop',
      title: 'Face Recognition Technology',
      description: 'Advanced AI-powered facial recognition ensures accurate student identification and prevents proxy attendance.'
    },
    {
      image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=300&fit=crop',
      title: 'Dress Code Verification',
      description: 'Automated dress code compliance checking ensures students meet institutional standards during attendance.'
    },
    {
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
      title: 'Real-time Analytics',
      description: 'Comprehensive attendance reports and analytics help administrators make data-driven decisions.'
    }
  ];

  // FAQs
  const faqs = [
    {
      question: 'How accurate is the face recognition system?',
      answer: 'Our system uses DeepFace with the Facenet model, achieving over 95% accuracy in facial recognition. The system compares 128-dimensional facial embeddings using cosine similarity for precise matching.'
    },
    {
      question: 'What happens if dress code verification fails?',
      answer: 'Attendance is still marked, but it will be flagged as "Present - Dress Code Violation" for administrative review. This ensures students are not penalized while maintaining compliance standards.'
    },
    {
      question: 'Can multiple institutes use this system?',
      answer: 'Yes! The system supports multiple institutes with complete data isolation. Each institute has its own admin accounts, students, and attendance records that are completely separate from other institutes.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Absolutely. All facial data is encrypted and stored securely in our database. We use industry-standard security practices including password hashing (SHA-256) and secure database connections.'
    },
    {
      question: 'How do I register as a new student?',
      answer: 'Simply click on "Register Student" from the home page, fill in your details (name, roll number, department, institute), capture your photo using the webcam, and submit. The system will extract and store your facial features securely.'
    }
  ];

  // Carousel auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements((prev) => new Set(prev).add(entry.target.dataset.id));
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    // Observe all elements with data-id
    document.querySelectorAll('[data-id]').forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="hero">
      {/* Hero Content */}
      <div className="hero-content">
        <h1>
          Smart Attendance System
          <span className="highlight">Built for Modern Education</span>
        </h1>
        <p>
          Automated attendance marking with face recognition and dress code verification.
          Secure, fast, and reliable attendance management for educational institutes.
        </p>

        {isAdminLoggedIn && adminData && (
          <div className="welcome-card">
            <h3>Welcome back, {adminData.name}</h3>
            <p>{adminData.institute_name}</p>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div className="carousel-container">
        <div className="carousel">
          {carouselImages.map((slide, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <img src={slide.url} alt={slide.alt} />
            </div>
          ))}

          <button className="carousel-arrow prev" onClick={prevSlide} aria-label="Previous slide">
            ‹
          </button>
          <button className="carousel-arrow next" onClick={nextSlide} aria-label="Next slide">
            ›
          </button>

          <div className="carousel-controls">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2>Why Choose Our System?</h2>
        <div className="feature-cards-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${visibleElements.has(`feature-${index}`) ? 'visible' : ''}`}
              data-id={`feature-${index}`}
            >
              <div className="feature-card-image">
                <img src={feature.image} alt={feature.title} />
              </div>
              <div className="feature-card-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Cards Section */}
      <div className="action-section">
        <h2>Get Started Today</h2>
        <div className="action-cards-grid">
          <div
            className={`action-card ${visibleElements.has('action-0') ? 'visible' : ''}`}
            data-id="action-0"
          >
            <div className="action-card-header">
              <div className="action-card-title">For Students</div>
              <div className="action-card-subtitle">Register Now</div>
              <p className="action-card-description">
                Join the system and start using automated attendance with face recognition.
              </p>
            </div>
            <ul className="action-card-features">
              <li>Quick and easy registration</li>
              <li>Secure facial data storage</li>
              <li>Instant attendance marking</li>
              <li>No login required for attendance</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onNavigate('register')}>
              Register as Student
            </button>
          </div>

          <div
            className={`action-card ${visibleElements.has('action-1') ? 'visible' : ''}`}
            data-id="action-1"
          >
            <div className="action-card-header">
              <div className="action-card-title">Already Registered?</div>
              <div className="action-card-subtitle">Mark Attendance</div>
              <p className="action-card-description">
                Verify your identity and mark your attendance with face recognition.
              </p>
            </div>
            <ul className="action-card-features">
              <li>Real-time face verification</li>
              <li>Dress code compliance check</li>
              <li>Instant confirmation</li>
              <li>Attendance history tracking</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onNavigate('attendance')}>
              Mark Attendance Now
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <h2>Your Questions, Answered.</h2>
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`faq-item ${activeFaq === index ? 'active' : ''} ${visibleElements.has(`faq-${index}`) ? 'visible' : ''}`}
            onClick={() => toggleFaq(index)}
            data-id={`faq-${index}`}
          >
            <div className="faq-question">
              <span>{faq.question}</span>
              <span className="faq-icon">+</span>
            </div>
            <div className="faq-answer">
              {faq.answer}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;