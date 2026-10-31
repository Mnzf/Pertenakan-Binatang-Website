// pages/animal-detail.js - one animal, chosen by ?id= in the URL
import { getAnimalById, getPublicAnimals } from '../data.js';
import { animalCard, imageUrl, inquireUrl, saveButton, statusBadge, emptyState } from '../render.js';
import { categoryLabel } from '../config.js';
import { $, $$, getParam, escapeHtml, formatPrice, formatAge, formatDate, capitalize, rootUrl } from '../utils.js';

const root = $('#animal-detail');
const crumb = $('#breadcrumb');

function stat(label, value) {
  return `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function render(a) {
  const sold = a.status === 'sold';
  const dobText = `${formatAge(a.dob)} (${formatDate(a.dob)})`;
  const thumbs = (a.images ?? []).map((_, i) =>
    `<button type="button" class="thumb-btn" data-index="${i}" aria-label="Show photo ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${imageUrl(a, i)}" alt=""></button>`).join('');

  root.innerHTML = `
    <section class="detail-grid">
      <div class="detail-gallery">
        <img id="main-photo" src="${imageUrl(a)}" alt="${escapeHtml(a.name)}, ${escapeHtml(a.breed)}">
        <div class="thumbs">${thumbs}</div>
      </div>
      <div class="detail-info">
        ${statusBadge(a.status)}
        ${saveButton(a)}
        <p class="eyebrow">${escapeHtml(categoryLabel(a.species))} | ID ${escapeHtml(a.tag)}</p>
        <h1>${escapeHtml(a.name)}</h1>
        <p class="price">${escapeHtml(formatPrice(a.price))}${a.price == null ? '' : ' <small>or Inquire</small>'}</p>
        <dl class="stats-grid">
          ${stat('Breed', a.breed)}${stat('Age / DOB', dobText)}${stat('Sex', capitalize(a.sex))}
          ${stat('Weight', `${a.weightKg} kg`)}${stat('Location', a.location)}${stat('Registration', a.registration)}
        </dl>
        ${sold
          ? '<span class="btn full" aria-disabled="true">No longer available</span>'
          : `<a class="btn full" id="inquire-btn" href="${inquireUrl(a.id)}">Send an Inquiry to Buy</a>`}
        <p class="fine">No payment is taken online. Send an inquiry and the owner will contact you.</p>
      </div>
    </section>

    <section class="detail-body">
      <div>
        <h2>About this animal</h2>
        <p>${escapeHtml(a.description)}</p>
        <h3>Lineage</h3>
        <p>Sire: ${escapeHtml(a.sire)} | Dam: ${escapeHtml(a.dam)}</p>
      </div>
      <aside class="record-summary">
        <h3>Health records summary</h3>
        <ul>
          <li>${a.health?.vaccinated ? 'Vaccinations up to date' : 'Vaccination status: ask the farm'}</li>
          <li>Last health check: ${escapeHtml(formatDate(a.health?.lastCheck))}</li>
          <li>Testing / certification: ${escapeHtml(a.health?.certification ?? '-')}</li>
        </ul>
        <a href="${rootUrl('pages/contact.html')}?type=animal">Request complete records</a>
      </aside>
    </section>`;

  // clicking a thumbnail changes the big photo
  $$('.thumb-btn', root).forEach((btn) => btn.addEventListener('click', () => {
    $('#main-photo').src = imageUrl(a, Number(btn.dataset.index));
    $$('.thumb-btn', root).forEach((b) => b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current', 'true');
  }));
}

async function renderRelated(a) {
  const related = (await getPublicAnimals()).filter((x) => x.species === a.species && x.id !== a.id).slice(0, 3);
  if (!related.length) return;
  $('#related-link').href = `${rootUrl('pages/animals.html')}?category=${a.species}`;
  $('#related-list').innerHTML = related.map((x) => animalCard(x)).join('');
  $('#related-animals').hidden = false;
}

try {
  const animal = await getAnimalById(getParam('id'));
  if (!animal || !animal.forSale) {
    root.innerHTML = emptyState('Sorry, we could not find that animal.', `<a href="${rootUrl('pages/animals.html')}">Browse all animals</a>`);
    crumb.innerHTML = `<a href="${rootUrl('index.html')}">Home</a> / <a href="${rootUrl('pages/animals.html')}">Our Animals</a>`;
  } else {
    document.title = `${animal.name} | Kaznisah Farming Sdn Bhd`;
    crumb.innerHTML = `<a href="${rootUrl('index.html')}">Home</a> / <a href="${rootUrl('pages/animals.html')}">Our Animals</a> / <a href="${rootUrl('pages/animals.html')}?category=${animal.species}">${escapeHtml(categoryLabel(animal.species))}</a> / <strong>${escapeHtml(animal.tag)}</strong>`;
    render(animal);
    await renderRelated(animal);
  }
} catch (error) {
  console.error(error);
  root.innerHTML = '<p class="error-state" role="alert">Sorry, something went wrong loading this animal. Please refresh the page.</p>';
}
