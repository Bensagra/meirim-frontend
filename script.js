// script.js
let current = 0;
const slides = document.querySelector('.slides');
const total = slides.children.length;

function showNext() {
  current = (current + 1) % total;
  slides.style.transform = `translateX(-${current * 100}%)`;
}

// Cambia slide cada 4s
let interval = setInterval(showNext, 4000);

// Pausa al hacer hover
slides.parentElement.addEventListener('mouseenter', () => clearInterval(interval));
slides.parentElement.addEventListener('mouseleave', () => {
  interval = setInterval(showNext, 4000);
});