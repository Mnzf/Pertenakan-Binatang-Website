// pages/animal-form.js - staff add a new animal, or edit one (?id=...)
import { requireRole } from '../auth.js';
import { getAnimalById, saveAnimal, deleteAnimal } from '../data.js';
import { handleForm, showSuccess } from '../forms.js';
import { uploadImage, uploadsEnabled } from '../uploads.js';
import { CATEGORIES, ANIMAL_STATUSES } from '../config.js';
import { $, getParam, rootUrl, capitalize } from '../utils.js';

const form = $('#animal-form');
const id = getParam('id');

// Images: a file inside this website (assets/...) or a full https:// link. One per line.
const IMAGE_OK = /^(assets\/[\w\-./]+|https:\/\/\S+)$/;

if (await requireRole('staff')) {
  const opts = (items) => items.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  form.elements.species.insertAdjacentHTML('beforeend', opts(CATEGORIES.map((c) => [c.slug, c.label])));
  form.elements.status.innerHTML = opts(ANIMAL_STATUSES.map((s) => [s, capitalize(s)]));

  // Photo upload (only shown once the upload service address is set in js/config.js)
  const uploadBox = $('#af-upload');
  const fileInput = $('#af-files');
  if (uploadBox && fileInput && uploadsEnabled()) {
    uploadBox.hidden = false;
    const status = $('#af-upload-status');
    fileInput.addEventListener('change', async () => {
      const files = [...fileInput.files];
      if (!files.length) return;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      const urls = [];
      const failed = [];
      for (const [index, file] of files.entries()) {
        status.textContent = `Uploading ${index + 1} of ${files.length}: ${file.name}...`;
        try { urls.push(await uploadImage(file)); }
        catch (error) { console.error(error); failed.push(`${file.name}: ${error.message}`); }
      }
      if (urls.length) form.elements.images.value = [form.elements.images.value.trim(), ...urls].filter(Boolean).join('\n');
      status.textContent = [urls.length ? `${urls.length} photo(s) uploaded and added below.` : '', ...failed].filter(Boolean).join(' ');
      fileInput.value = '';
      submit.disabled = false;
    });
  }

  let existing = null;
  if (id) {
    try { existing = await getAnimalById(id); } catch (error) { console.error(error); }
    if (!existing) {
      form.replaceWith(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'Animal not found.' }));
    } else {
      $('#form-title').textContent = `Edit ${existing.name}`;
      document.title = `Edit ${existing.name} | Herd management`;
      for (const key of ['tag', 'name', 'species', 'breed', 'sex', 'dob', 'status', 'location', 'weightKg', 'registration', 'sire', 'dam', 'description', 'notes']) {
        if (form.elements[key]) form.elements[key].value = existing[key] ?? '';
      }
      form.elements.price.value = existing.price ?? '';
      form.elements.images.value = (existing.images ?? []).join('\n');
      form.elements.forSale.checked = !!existing.forSale;
      form.elements.featured.checked = !!existing.featured;
      const del = $('#af-delete');
      del.hidden = false;
      del.addEventListener('click', async () => {
        if (!confirm(`Delete ${existing.name} permanently? This cannot be undone.`)) return;
        try { await deleteAnimal(id); location.href = rootUrl('pages/animal-records.html'); }
        catch (error) { console.error(error); alert('Could not delete this animal.'); }
      });
    }
  }

  if (!id || existing) {
    handleForm(
      form,
      async (data) => {
        const images = data.images.split('\n').map((l) => l.trim()).filter(Boolean);
        const animal = {
          tag: data.tag.trim(), name: data.name.trim(), species: data.species, breed: data.breed.trim(), sex: data.sex,
          dob: data.dob, price: data.price === '' ? null : Number(data.price), status: data.status,
          location: data.location.trim(), weightKg: Number(data.weightKg), registration: data.registration.trim(),
          sire: data.sire.trim(), dam: data.dam.trim(), description: data.description.trim(), notes: data.notes.trim(),
          images: images.length ? images : ['assets/images/placeholder.svg'],
          forSale: form.elements.forSale.checked, featured: form.elements.featured.checked,
        };
        let savedId;
        try { savedId = await saveAnimal(id, animal); }
        catch (error) { console.error(error); throw new Error('Could not save. Check you are logged in as staff and try again.'); }
        showSuccess(form, 'Saved. Opening the record...');
        location.href = `${rootUrl('pages/animal-profile.html')}?id=${encodeURIComponent(savedId)}`;
      },
      (data) => {
        if (new Date(data.dob) > new Date()) return { message: 'Date of birth cannot be in the future.', field: 'dob' };
        const bad = data.images.split('\n').map((l) => l.trim()).filter(Boolean).find((l) => !IMAGE_OK.test(l));
        if (bad) return { message: `Image "${bad}" is not valid. Use a path starting with assets/ or a full https:// link, one per line.`, field: 'images' };
      },
    );
  }
}
