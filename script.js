// Show the name in the navbar only once the hero (which already shows it) has scrolled out of view.
// Without JS the name is always shown.
const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero');
if (header && hero && 'IntersectionObserver' in window) {
  header.classList.add('logo-auto');
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('past-hero', !entry.isIntersecting);
  }).observe(hero);
}

// "Copy email address": a fallback for visitors whose mailto link opens nothing.
// The label never changes text; a class swaps two stacked labels so the button keeps its size.
for (const btn of document.querySelectorAll('[data-copy]')) {
  btn.hidden = false;
  const status = btn.parentElement.querySelector('[role="status"]');
  let timer;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Clipboard API blocked (e.g. non-https page): fall back to the older copy command.
      const area = Object.assign(document.createElement('textarea'), { value: text });
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      copied = document.execCommand('copy');
      area.remove();
    }
    if (!copied) {
      window.prompt(btn.dataset.prompt, text); // last resort: let the visitor copy it by hand
      return;
    }
    btn.classList.add('is-copied');
    if (status) status.textContent = btn.dataset.copiedMsg;
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.classList.remove('is-copied');
      if (status) status.textContent = '';
    }, 2000);
  });
}

// Highlight the nav link of the section being read: the last section whose heading has passed a
// reading line just below the navbar. Above the first section nothing is active; at the very bottom
// of the page the last section is, since it may never reach the line.
const navLinks = [...document.querySelectorAll('.nav ul a[href^="#"]:not(.logo)')];
const spied = navLinks
  .map((a) => ({ a, heading: document.querySelector(`${a.hash} h2`) }))
  .filter((x) => x.heading);
if (spied.length) {
  let queued = false;
  const update = () => {
    queued = false;
    const line = (header ? header.offsetHeight : 0) + window.innerHeight * 0.25;
    let current = null;
    for (const x of spied) if (x.heading.getBoundingClientRect().top <= line) current = x;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = spied[spied.length - 1];
    for (const x of spied) x.a.classList.toggle('is-active', x === current);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}

// Language switcher: keep the current section when switching between index.html and hu.html.
for (const link of document.querySelectorAll('.lang a')) {
  link.addEventListener('click', () => {
    if (location.hash) link.href = link.getAttribute('href').split('#')[0] + location.hash;
  });
}

// FAQ: animate opening and closing by tweening the <details> height. Without JS, or with reduced
// motion, the native instant toggle is used.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const item of document.querySelectorAll('.faq-item')) {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('p');
    let anim = null;
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const from = item.offsetHeight;
      const opening = !item.open || item.classList.contains('is-closing');
      if (anim) anim.cancel();
      let to;
      if (opening) {
        item.classList.remove('is-closing');
        item.open = true;
        to = item.offsetHeight;
        answer.animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 350, easing: 'ease-out' });
      } else {
        item.classList.add('is-closing');
        to = summary.offsetHeight + (item.offsetHeight - item.clientHeight); // keep the top border
      }
      item.style.overflow = 'hidden';
      anim = item.animate({ height: [`${from}px`, `${to}px`] }, { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      anim.onfinish = () => {
        if (!opening) {
          item.open = false;
          item.classList.remove('is-closing');
        }
        item.style.overflow = '';
        anim = null;
      };
    });
  }
}

// Fade elements in as they scroll into view. Skipped for reduced-motion users and old browsers,
// so content stays visible without JS.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    // Stagger only the elements that enter together, in page order, so each row reads left to right
    // whatever the column count.
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.style.transitionDelay = `${order++ * 90}ms`;
      el.classList.add('in');
      observer.unobserve(el);
      // Once revealed, drop the reveal classes and delay so hover transitions run on their own timing.
      el.addEventListener('transitionend', function done(e) {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', done);
        el.classList.remove('reveal', 'in');
        el.style.transitionDelay = '';
      });
    }
  }, { threshold: 0.15 });

  for (const el of document.querySelectorAll('.hero-grid > *, .section h2, .publisher, .game, .case, .pricing-intro > *, .option, .price-table-wrap, .includes li, .bundle, .faq, .contact .wrap > *')) {
    el.classList.add('reveal');
    observer.observe(el);
  }

  // Bar figures start empty and grow to their real widths once mostly in view.
  // 'pending' is added here, not in the HTML, so the bars stay full without JS.
  const grow = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('pending');
      grow.unobserve(entry.target);
    }
  }, { threshold: 0.4 });
  for (const el of document.querySelectorAll('.split, .price-table')) {
    el.classList.add('pending');
    grow.observe(el);
  }

  // Hero numbers count up from zero once visible; the HTML holds the final value.
  const countUp = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / 1000, 1);
        el.textContent = Math.round(target * (1 - (1 - t) ** 3));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countUp.unobserve(el);
    }
  });
  for (const el of document.querySelectorAll('[data-count]')) {
    el.textContent = '0';
    countUp.observe(el);
  }
}
