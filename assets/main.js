// NAVBAR SCROLL STATE
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// MOBILE MENU
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

// FAQ ACCORDION
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-answer.open').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-question.open').forEach(b => b.classList.remove('open'));
  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

// CONTACT FORM (placeholder submit - wire up to a real backend/service later)
function submitForm(e) {
  e.preventDefault();
  const success = document.getElementById('formSuccess');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Wird gesendet…';
  setTimeout(() => {
    success.style.display = 'block';
    e.target.reset();
    btn.disabled = false;
    btn.innerHTML = 'Anfrage absenden <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>';
  }, 1200);
}

// HERO IMAGE CAROUSEL
document.querySelectorAll('.hero-carousel').forEach(carousel => {
  const track = carousel.querySelector('.hero-carousel-track');
  const slides = track.children;
  const prevBtn = carousel.querySelector('.hero-carousel-prev');
  const nextBtn = carousel.querySelector('.hero-carousel-next');
  const dotsWrap = carousel.querySelector('.hero-carousel-dots');
  let index = 0;
  let timer;

  if (slides.length <= 1) {
    prevBtn?.remove();
    nextBtn?.remove();
    dotsWrap?.remove();
    return;
  }

  const dots = [...slides].map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Bild ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle('active', di === index));
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), 5000);
  }

  prevBtn.addEventListener('click', () => { goTo(index - 1); restartAutoplay(); });
  nextBtn.addEventListener('click', () => { goTo(index + 1); restartAutoplay(); });
  carousel.addEventListener('mouseenter', () => clearInterval(timer));
  carousel.addEventListener('mouseleave', restartAutoplay);

  let touchStartX = 0;
  track.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { goTo(index + (dx < 0 ? 1 : -1)); restartAutoplay(); }
  }, { passive: true });

  restartAutoplay();
});

// SCROLL-IN ANIMATIONS
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.feature-item, .process-step, .about-card, .cta-card, .service-card, .local-list-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
