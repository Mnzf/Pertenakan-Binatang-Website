// pages/animals.js - animal listing: category, filters, sorting, "load more"
import { getPublicAnimals } from '../data.js';
import { filterAnimals, sortAnimals, AGE_BANDS, PRICE_BANDS } from '../filters.js';
import { animalCard, emptyState, errorState } from '../render.js';
import { CATEGORIES, PAGE_SIZE, categoryLabel } from '../config.js';
import { $, $$, getParam, escapeHtml, rootUrl } from '../utils.js';

const form = $('#animal-filters');
const list = $('#animal-list');
const loadMore = $('#load-more');
const featuredSection = $('#featured-in-category');
const featuredList = $('#featured-list');

let animals = [];
let shown = PAGE_SIZE;
let category = CATEGORIES.some((c) => c.slug === getParam('category')) ? getParam('category') : '';

const options = (items) => items.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
const addOptions = (select, items) => select.insertAdjacentHTML('beforeend', options(items));

function readFilters() {
  const data = Object.fromEntries(new FormData(form).entries());
  return { category, breed: data.breed, sex: data.sex, age: data.age, price: data.price, availability: data.availability };
}

function updateHeading() {
  const info = CATEGORIES.find((c) => c.slug === category);
  const label = info ? info.label : 'All animals';
  $('#category-title').textContent = label;
  $('#category-crumb').textContent = `Our Animals / ${label}`;
  $('#category-desc').textContent = info ? info.description : 'Browse the animals currently listed by the farm.';
  $('#list-title-text').textContent = info ? info.label : 'animals';
  document.title = `${label} | Kaznisah Farming Sdn Bhd`;
  $$('.category-nav a').forEach((link) => {
    const slug = new URL(link.href).searchParams.get('category');
    if (slug === category) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
  });
  form.elements.species.value = category;
}

function updateBreedOptions() {
  const current = form.elements.breed.value;
  const breeds = [...new Set(filterAnimals(animals, { category }).map((a) => a.breed))].sort();
  form.elements.breed.innerHTML = '<option value="">All</option>' + options(breeds.map((b) => [b, b]));
  if (breeds.includes(current)) form.elements.breed.value = current;
}

function render() {
  const results = sortAnimals(filterAnimals(animals, readFilters()), form.elements.sort.value);
  $('#result-count').textContent = `(${results.length})`;
  list.innerHTML = results.length
    ? results.slice(0, shown).map((a) => animalCard(a)).join('')
    : emptyState('No animals match your filters.', `Clear the filters or <a href="${rootUrl('pages/contact.html')}">contact the farm</a> to ask about future availability.`);
  loadMore.hidden = shown >= results.length;

  const featured = filterAnimals(animals, { category }).filter((a) => a.featured).slice(0, 2);
  featuredSection.hidden = featured.length === 0;
  featuredList.innerHTML = featured.map((a) => animalCard(a, { featured: true })).join('');
}

function refreshAll() { updateHeading(); updateBreedOptions(); shown = PAGE_SIZE; render(); }

try {
  animals = await getPublicAnimals();

  addOptions(form.elements.species, CATEGORIES.map((c) => [c.slug, c.label]));
  addOptions(form.elements.age, Object.entries(AGE_BANDS).map(([k, v]) => [k, v.label]));
  addOptions(form.elements.price, Object.entries(PRICE_BANDS).map(([k, v]) => [k, v.label]));

  form.addEventListener('change', (event) => {
    if (event.target === form.elements.species) {
      category = form.elements.species.value;
      history.replaceState(null, '', category ? `?category=${category}` : location.pathname);
      refreshAll();
    } else {
      shown = PAGE_SIZE;
      render();
    }
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('reset', () => setTimeout(() => { category = ''; history.replaceState(null, '', location.pathname); refreshAll(); }));
  loadMore.addEventListener('click', () => { shown += PAGE_SIZE; render(); });

  refreshAll();
} catch (error) {
  console.error(error);
  list.innerHTML = errorState();
  featuredSection.hidden = true;
}
