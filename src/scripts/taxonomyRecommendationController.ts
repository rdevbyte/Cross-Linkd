import { INDUSTRIES, categoryBySlug, industryBySlug, professionBySlug, type Industry } from '@/data/industries';
import { isTaxonomyRecommendationField } from '@/lib/taxonomyRecommendationFields.mjs';
import { recommendTaxonomy, selectOtherFallback, type TaxonomyRecommendation } from '@/lib/taxonomyRecommendations';

const splitValues = (raw: string) => raw.split(/[\n,;|]+/).map((value) => value.trim()).filter(Boolean);
const keyOf = (item: TaxonomyRecommendation) => `${item.industrySlug}/${item.categorySlug}/${item.professionSlug}`;

function textNode(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function install(form: HTMLFormElement) {
  const panel = form.querySelector<HTMLDetailsElement>('[data-taxonomy-recommendation-panel]');
  const resultsElement = panel?.querySelector<HTMLElement>('[data-taxonomy-recommendation-results]');
  const statusElement = panel?.querySelector<HTMLElement>('[data-taxonomy-recommendation-status]');
  const noneButton = panel?.querySelector<HTMLButtonElement>('[data-taxonomy-none]');
  const showButton = panel?.querySelector<HTMLButtonElement>('[data-taxonomy-show-matches]');
  const manualCategoryPicker = form.querySelector<HTMLElement>('[data-manual-category-picker]');
  const manualCategoryStatus = form.querySelector<HTMLElement>('#category-manual-status');
  const categorySearch = form.querySelector<HTMLInputElement>('#category-search-input');
  if (!panel || !resultsElement || !statusElement) return;
  const results: HTMLElement = resultsElement;
  const status: HTMLElement = statusElement;

  const isAddListingForm = form.id === 'add-listing-form';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recommendations: TaxonomyRecommendation[] = [];
  let dismissed = new Set<string>();
  let fallbackMode = false;
  let appliedSuggestionKey = '';

  function taxonomyForForm(): Industry[] {
    const raw = form.dataset.taxonomyCategoryAllowlist;
    if (!raw) return INDUSTRIES;
    try {
      const allowed = new Set<string>(JSON.parse(raw));
      return INDUSTRIES.map((industry) => ({
        ...industry,
        categories: industry.categories.filter((category) => allowed.has(`${industry.slug}/${category.slug}`)),
      })).filter((industry) => industry.categories.length > 0);
    } catch { return INDUSTRIES; }
  }

  const value = (name: string) => {
    const field = form.elements.namedItem(name);
    return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement ? field.value : '';
  };
  const checked = (name: string) => Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map((field) => field.value);
  const readInput = () => ({
    listingName: value('name'),
    title: value('tagline'),
    description: value('description'),
    profession: [...checked('professions'), ...splitValues(value('customProfessions'))],
    services: [...checked('services'), ...splitValues(value('customServices'))],
    keywords: [...splitValues(value('keywords')), ...splitValues(value('hashtags'))],
    // No website text is fetched: the app has no approved website-text extractor.
  });

  function renderCard(item: TaxonomyRecommendation) {
    const article = document.createElement('article');
    article.className = 'mt-2 rounded-xl border p-3';
    article.style.borderColor = 'var(--border)';
    const industry = industryBySlug(item.industrySlug)?.name ?? item.industrySlug;
    const category = categoryBySlug(item.categorySlug)?.category.name ?? item.categorySlug;
    const profession = professionBySlug(item.professionSlug)?.name ?? item.professionSlug;
    const header = document.createElement('div');
    header.className = 'flex flex-wrap items-start justify-between gap-2';
    header.append(
      textNode('p', 'text-sm font-bold', `${industry} › ${category} › ${profession}`),
      textNode('span', 'chip !text-[10px] font-semibold', item.confidenceLabel),
    );
    header.lastElementChild?.setAttribute('title', 'Heuristic confidence estimate, not a calibrated probability.');
    article.append(header, textNode('p', 'mt-1 text-xs leading-relaxed', item.reason));

    if (item.serviceNames.length) {
      article.append(textNode('p', 'mt-2 text-[10px] font-bold uppercase tracking-wide', 'Relevant service examples'));
      const services = document.createElement('div');
      services.className = 'mt-1 flex flex-wrap gap-1';
      item.serviceNames.forEach((name) => services.append(textNode('span', 'chip !py-0.5 !text-[10px]', name)));
      article.append(services);
    } else if (item.isFallback) {
      article.append(textNode('p', 'mt-2 text-xs', 'You can add a custom profession and services after selecting this path.'));
    }

    const actions = document.createElement('div');
    actions.className = 'mt-3 flex flex-wrap gap-2';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'btn btn-primary taxonomy-suggestion-action !min-h-9 !px-3 !py-1.5 !text-xs';
    apply.textContent = appliedSuggestionKey
      ? (appliedSuggestionKey === keyOf(item) ? 'Suggested selection applied' : 'Another suggestion selected')
      : item.isFallback ? 'Use this Other option' : 'Use suggestion';
    apply.disabled = isAddListingForm && Boolean(appliedSuggestionKey);
    if (apply.disabled) apply.classList.add('taxonomy-suggestion-locked');
    apply.addEventListener('click', () => {
      if (isAddListingForm && appliedSuggestionKey) return;
      const detail: { recommendation: TaxonomyRecommendation; result?: { applied: boolean; message?: string } } = { recommendation: item };
      form.dispatchEvent(new CustomEvent('taxonomy-recommendation-apply', { detail }));
      status.textContent = detail.result?.message ?? (detail.result?.applied ? 'Suggestion added.' : 'Your current selections were not changed.');
      if (detail.result?.applied) {
        apply.textContent = 'Suggested selection applied';
        if (isAddListingForm) {
          appliedSuggestionKey = keyOf(item);
          results.querySelectorAll<HTMLButtonElement>('button').forEach((choice) => {
            choice.disabled = true;
            choice.classList.add('taxonomy-suggestion-locked');
          });
          status.textContent = 'One suggestion selected. Other suggestion choices are disabled. Clear the selected category to choose another path.';
        } else {
          apply.disabled = true;
        }
      }
    });
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'btn btn-secondary taxonomy-suggestion-action !min-h-9 !px-3 !py-1.5 !text-xs';
    reject.textContent = 'Not relevant';
    reject.disabled = isAddListingForm && Boolean(appliedSuggestionKey);
    if (reject.disabled) reject.classList.add('taxonomy-suggestion-locked');
    reject.setAttribute('aria-label', `Reject suggestion for ${profession}`);
    reject.addEventListener('click', () => {
      dismissed.add(keyOf(item));
      schedule();
    });
    actions.append(apply, reject);
    article.append(actions);
    return article;
  }

  function render(inputPresent: boolean) {
    results.replaceChildren();
    if (!inputPresent) {
      results.append(textNode('p', 'text-xs', 'Start typing listing details to see relevant Industry → Category → Profession paths.'));
      return;
    }
    const visible = recommendations.filter((item) => !dismissed.has(keyOf(item))).slice(0, 3);
    if (!visible.length) {
      results.append(textNode('p', 'text-xs', 'No confident match found yet. Add a description or services, or choose “None of these fit.”'));
      return;
    }
    visible.forEach((item) => results.append(renderCard(item)));
  }

  function schedule(clearDismissed = false) {
    if (timer) clearTimeout(timer);
    status.textContent = 'Checking local taxonomy suggestions…';
    results.setAttribute('aria-busy', 'true');
    // Keep the current result block in place during debounce; replacing it with
    // a loading line on every keystroke caused avoidable layout/scroll shifts.
    timer = setTimeout(() => {
      if (clearDismissed) dismissed = new Set();
      const input = readInput();
      const inputPresent = Object.values(input).some((entry) => Array.isArray(entry) ? entry.length > 0 : Boolean(entry.trim()));
      try {
        const taxonomy = taxonomyForForm();
        recommendations = recommendTaxonomy(input, 3, taxonomy);
        if (fallbackMode && !(manualCategoryPicker && categorySearch)) {
          const fallback = selectOtherFallback(value('industrySlug') || recommendations[0]?.industrySlug, taxonomy);
          recommendations = fallback ? [fallback] : [];
        }
        render(inputPresent || fallbackMode);
        status.textContent = fallbackMode && !(manualCategoryPicker && categorySearch)
          ? 'Showing an existing Other path with custom-entry support.'
          : 'Local suggestions are optional and are never applied automatically.';
      } catch {
        recommendations = [];
        results.replaceChildren(textNode('p', 'text-xs', 'Suggestions are temporarily unavailable. You can still complete and save your listing normally.'));
        status.textContent = 'Suggestions are unavailable; your form and selections are unchanged.';
      } finally {
        results.setAttribute('aria-busy', 'false');
      }
    }, 240);
  }

  function handleRecommendationInput(event: Event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-taxonomy-recommendation-panel]')) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    if (!isTaxonomyRecommendationField(target.name)) return;
    fallbackMode = false;
    showButton?.classList.add('hidden');
    schedule(true);
  }
  form.addEventListener('input', handleRecommendationInput);
  form.addEventListener('change', handleRecommendationInput);
  form.addEventListener('taxonomy-recommendations-refresh', () => { fallbackMode = false; schedule(true); });
  form.addEventListener('taxonomy-recommendation-selection-cleared', () => {
    if (!isAddListingForm) return;
    appliedSuggestionKey = '';
    schedule();
  });
  form.addEventListener('reset', () => { fallbackMode = false; dismissed.clear(); appliedSuggestionKey = ''; schedule(); });
  noneButton?.addEventListener('click', () => {
    if (manualCategoryPicker && categorySearch) {
      panel.open = false;
      manualCategoryPicker.classList.remove('hidden');
      if (manualCategoryStatus) manualCategoryStatus.textContent = 'Manual category search is open. Search the catalog or choose an Other result to enter a custom name.';
      status.textContent = 'Manual category entry is open below. Search by industry, category, profession, or service.';
      categorySearch.focus();
      return;
    }
    // Keep the dashboard’s existing Other-suggestion fallback unchanged.
    fallbackMode = true;
    schedule();
    showButton?.classList.remove('hidden');
  });
  showButton?.addEventListener('click', () => {
    fallbackMode = false;
    schedule();
    showButton.classList.add('hidden');
  });
  schedule();
}

document.querySelectorAll<HTMLFormElement>('form[data-taxonomy-recommendation-form]').forEach(install);
