/* Het Smaakatelier: navigatie, scroll-animaties en de workshopplanner */
(function () {
  'use strict';

  // ---------- Navigatie ----------
  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  const navToggle = document.getElementById('navToggle');
  const stickyCta = document.getElementById('stickyCta');
  const planner = document.getElementById('planner');

  function onScroll() {
    nav.classList.toggle('is-solid', window.scrollY > 60);
    // Zwevende knop tonen zodra de hero voorbij is, maar niet als de planner in beeld is
    const r = planner.getBoundingClientRect();
    const plannerInView = r.top < window.innerHeight && r.bottom > 0;
    stickyCta.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8 && !plannerInView);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener('click', () => navLinks.classList.toggle('is-open'));
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('is-open')));

  // ---------- Scroll-animaties ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  // Fallback: ook bij snel scrollen alles tonen wat in beeld staat
  function revealCheck() { document.querySelectorAll('.reveal:not(.is-in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight - 40 && r.bottom > 0) el.classList.add('is-in'); }); }
  window.addEventListener('scroll', revealCheck, { passive: true }); window.addEventListener('load', revealCheck); setTimeout(revealCheck, 300);


  // ---------- Planner ----------
  const form = document.getElementById('plannerForm');
  const panes = [...form.querySelectorAll('.pane')];
  const steps = [...document.querySelectorAll('.p-step')];
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const sendGroup = document.getElementById('sendGroup');
  const formError = document.getElementById('formError');
  const waBtn = document.getElementById('waBtn');
  let current = 1;
  const TOTAL = panes.length;

  const WORKSHOPS = {
    ragu: {
      naam: 'Ragu di Bologna vino party',
      menu: ['Antipasti om mee te beginnen', 'Verse tagliatelle, zelf gerold', 'Ragu di Bologna, urenlang gesudderd', 'Wijn uit Emilia-Romagna', 'Tiramisu als afsluiter']
    },
    blackbox: {
      naam: 'Blackbox koken',
      menu: ['Gesloten box met verrassingsingrediënten', 'Teams bedenken ter plekke een driegangenmenu', 'Begeleiding en tips van Victor', 'Gezamenlijk proeven en jureren']
    },
    maat: {
      naam: 'Jouw eigen avond',
      menu: ['Menu in overleg, afgestemd op jullie smaak', 'Drie gangen die jullie zelf maken', 'Victor zorgt voor ingrediënten en materialen', 'Recepten mee naar huis']
    }
  };
  const KEUKEN_MENU = {
    'Italiaans': ['Bruschetta met tomaat en basilicum', 'Verse pasta met saus naar keuze', 'Panna cotta'],
    'Oosters': ['Dumplings, zelf gevouwen', 'Wok met verse groenten en kruiden', 'Mango met kokos'],
    'Frans': ['Soep met kruidenboter en brood', 'Coq au vin of ratatouille', 'Crème brûlée'],
    'Nederlands in een nieuw jasje': ['Bietjes met geitenkaas', 'Stamppot nieuwe stijl', 'Appeltaart met een twist'],
    'Verras me': ['Victor stelt een verrassingsmenu voor', 'Drie gangen, afgestemd op het seizoen', 'Zoete afsluiter']
  };

  function showStep(n, scroll) {
    current = Math.max(1, Math.min(TOTAL, n));
    panes.forEach(p => p.classList.toggle('is-active', +p.dataset.pane === current));
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i + 1 === current);
      s.classList.toggle('is-done', i + 1 < current);
    });
    prevBtn.hidden = current === 1;
    nextBtn.hidden = current === TOTAL;
    sendGroup.hidden = current !== TOTAL;
    formError.hidden = true;
    if (current === TOTAL) updateWhatsApp();
    // Op kleine schermen naar het formulier scrollen
    if (scroll && window.innerWidth < 760) {
      const top = document.querySelector('.planner-form').getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  steps.forEach(s => s.addEventListener('click', () => {
    const target = +s.dataset.goto;
    if (target <= current || s.classList.contains('is-done')) showStep(target, true);
  }));
  prevBtn.addEventListener('click', () => showStep(current - 1, true));
  nextBtn.addEventListener('click', () => {
    if (current === 4 && !form.datum.value) {
      formError.textContent = 'Kies eerst een datum, of kies "In overleg" en zet een datumvoorkeur bij de opmerkingen.';
      formError.hidden = false;
      // Als dagdeel 'In overleg' is mag de datum leeg blijven
      if (form.dagdeel.value === 'In overleg') { formError.hidden = true; showStep(current + 1, true); }
      return;
    }
    showStep(current + 1, true);
  });

  // Knoppen bij de workshopkaarten
  document.querySelectorAll('.js-pick').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.pick;
    form.workshop.value = v;
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('is-chosen', c.dataset.workshop === v));
    update();
    showStep(1);
    document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
  }));

  // ---------- Live samenvatting ----------
  const $ = id => document.getElementById(id);
  const personen = $('personen');
  const personenOut = $('personenOut');

  function fmtDatum(iso) {
    if (!iso) return 'Nog te kiezen';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function update() {
    const w = form.workshop.value;
    const ws = WORKSHOPS[w];
    $('sWorkshop').textContent = ws.naam;
    $('keukenField').style.display = w === 'maat' ? '' : 'none';
    const keuken = form.keuken.value;
    $('sKeukenRow').hidden = !(w === 'maat' && keuken);
    $('sKeuken').textContent = keuken;
    personenOut.textContent = personen.value;
    $('sPersonen').textContent = personen.value + ' personen';
    const gel = form.gelegenheid.value;
    $('sGelegenheidRow').hidden = !gel;
    $('sGelegenheid').textContent = gel;
    const loc = form.locatie.value;
    const adres = form.adres.value.trim();
    $('adresField').hidden = loc === 'Flexiforum Kerkrade';
    $('sLocatie').textContent = loc === 'Bij mij thuis' ? 'Bij jou thuis' + (adres ? ', ' + adres : '') : loc + (adres && loc !== 'Flexiforum Kerkrade' ? ', ' + adres : '');
    $('sDatum').textContent = fmtDatum(form.datum.value);
    $('sDagdeel').textContent = form.dagdeel.value.replace(' (ca. ', ', ').replace(')', '');
    // Menu-voorbeeld
    let menu = ws.menu;
    if (w === 'maat' && KEUKEN_MENU[keuken]) menu = KEUKEN_MENU[keuken];
    $('sMenuList').innerHTML = menu.map(m => '<li>' + m + '</li>').join('');
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('is-chosen', c.dataset.workshop === w));
    saveDraft();
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  // ---------- Kalender ----------
  const calGrid = $('calGrid');
  const calTitle = $('calTitle');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function renderCal() {
    calTitle.textContent = MAANDEN[view.getMonth()].replace(/^./, c => c.toUpperCase()) + ' ' + view.getFullYear();
    calGrid.innerHTML = '';
    const first = new Date(view);
    let offset = (first.getDay() + 6) % 7; // maandag eerst
    for (let i = 0; i < offset; i++) { const s = document.createElement('span'); s.className = 'pad'; calGrid.appendChild(s); }
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const minDate = new Date(today); minDate.setDate(minDate.getDate() + 7); // minimaal een week vooruit
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d;
      const dow = date.getDay();
      if (dow === 0 || dow === 6) b.classList.add('is-weekend');
      if (date.getTime() === today.getTime()) b.classList.add('is-today');
      if (date < minDate) b.disabled = true;
      if (iso(date) === form.datum.value) b.classList.add('is-selected');
      b.addEventListener('click', () => {
        form.datum.value = iso(date);
        $('datumHint').textContent = 'Gekozen: ' + fmtDatum(form.datum.value) + '. Victor bevestigt of deze datum vrij is.';
        renderCal();
        update();
      });
      calGrid.appendChild(b);
    }
    $('calPrev').disabled = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
  }
  $('calPrev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCal(); });
  $('calNext').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCal(); });

  // ---------- Concept bewaren ----------
  function saveDraft() {
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      localStorage.setItem('smaakatelier-planner', JSON.stringify(data));
    } catch (e) { /* opslag niet beschikbaar, geen probleem */ }
  }
  function loadDraft() {
    try {
      const data = JSON.parse(localStorage.getItem('smaakatelier-planner') || 'null');
      if (!data) return;
      Object.keys(data).forEach(k => {
        const el = form.elements[k];
        if (!el) return;
        if (el instanceof RadioNodeList) { el.value = data[k]; }
        else el.value = data[k];
      });
      if (form.datum.value) {
        const d = new Date(form.datum.value + 'T12:00:00');
        if (d >= today) { view = new Date(d.getFullYear(), d.getMonth(), 1); $('datumHint').textContent = 'Gekozen: ' + fmtDatum(form.datum.value) + '.'; }
        else form.datum.value = '';
      }
    } catch (e) { /* negeren */ }
  }

  // ---------- Versturen ----------
  function samenvatting() {
    const w = WORKSHOPS[form.workshop.value].naam;
    const regels = [
      'Hoi Victor,', '',
      'Ik wil graag een workshop plannen bij Het Smaakatelier.', '',
      'Workshop: ' + w + (form.workshop.value === 'maat' && form.keuken.value ? ' (' + form.keuken.value + ')' : ''),
      'Aantal personen: ' + personen.value,
      form.gelegenheid.value ? 'Gelegenheid: ' + form.gelegenheid.value : null,
      'Locatie: ' + $('sLocatie').textContent,
      'Datum: ' + fmtDatum(form.datum.value),
      'Dagdeel: ' + $('sDagdeel').textContent, '',
      'Naam: ' + form.naam.value.trim(),
      form.bedrijf.value.trim() ? 'Bedrijf: ' + form.bedrijf.value.trim() : null,
      'E-mail: ' + form.email.value.trim(),
      form.tel.value.trim() ? 'Telefoon: ' + form.tel.value.trim() : null,
      form.opmerkingen.value.trim() ? '\nOpmerkingen:\n' + form.opmerkingen.value.trim() : null, '',
      'Groet,', form.naam.value.trim()
    ].filter(r => r !== null);
    return regels.join('\n');
  }

  function valideer() {
    if (!form.naam.value.trim()) return 'Vul je naam in.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim())) return 'Vul een geldig e-mailadres in.';
    return '';
  }

  function updateWhatsApp() {
    const tekst = samenvatting();
    waBtn.href = 'https://wa.me/31613919665?text=' + encodeURIComponent(tekst);
  }
  form.addEventListener('input', () => { if (current === TOTAL) updateWhatsApp(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fout = valideer();
    if (fout) { formError.textContent = fout; formError.hidden = false; return; }
    const onderwerp = 'Aanvraag workshop: ' + WORKSHOPS[form.workshop.value].naam + ' (' + personen.value + ' pers.)';
    window.location.href = 'mailto:v.smaakatelier@outlook.com?subject=' + encodeURIComponent(onderwerp) + '&body=' + encodeURIComponent(samenvatting());
  });
  waBtn.addEventListener('click', (e) => {
    const fout = valideer();
    if (fout) { e.preventDefault(); formError.textContent = fout; formError.hidden = false; return; }
    updateWhatsApp();
  });

  // ---------- Start ----------
  loadDraft();
  renderCal();
  update();
  showStep(1);
})();
