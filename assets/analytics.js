/* WISDOM GA4 revenue-oriented event tracking
   Measurement ID is loaded in each HTML <head>.
   Privacy rule: never send form text, names, phone numbers, email addresses,
   uploaded file names, or other visitor-entered values to Analytics. */
(() => {
  'use strict';

  const categoryNames = Object.freeze({
    chemical: '화학물질·화학제품',
    mfds: '식약처 인허가',
    land: '농지·토지',
    procurement: '공공조달',
    administration: '행정기관 대응',
    general: '기업·개인 행정지원'
  });

  const categoryCodes = Object.freeze(
    Object.fromEntries(Object.entries(categoryNames).map(([code, name]) => [name, code]))
  );

  function gaReady() {
    return typeof window.gtag === 'function';
  }

  function clean(value, max = 120) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function currentRoute() {
    return clean(document.body?.dataset?.currentRoute || location.pathname, 160);
  }

  function currentContentTitle() {
    const page = document.querySelector('.page');
    const article = document.querySelector('.article-page');
    const value =
      article?.dataset?.title ||
      page?.dataset?.title ||
      document.querySelector('h1')?.textContent ||
      document.title;
    return clean(value, 150);
  }

  function currentContentType() {
    const path = location.pathname;
    if (/\/insights\/[^/]+\/?$/.test(path) && path !== '/insights/') return 'insight';
    if (/\/specialties\/[^/]+\/?$/.test(path) && path !== '/specialties/') return 'specialty';
    if (path.startsWith('/contact')) return 'contact';
    if (path.startsWith('/documents')) return 'documents';
    if (path.startsWith('/guide')) return 'guide';
    if (path.startsWith('/cases')) return 'case';
    if (path === '/' || path.endsWith('/index.html')) return 'home';
    return 'page';
  }

  function categoryFromPath(path = location.pathname) {
    const match = path.match(/\/specialties\/(chemical|mfds|land|procurement|administration|general)(?:\/|$)/);
    if (match) return match[1];

    const params = new URLSearchParams(location.search);
    const field = params.get('field');
    if (field && Object.hasOwn(categoryNames, field)) return field;

    const pill = document.querySelector('.article-hero .category-pill, .category-pill');
    if (pill) {
      const label = clean(pill.textContent, 60);
      if (categoryCodes[label]) return categoryCodes[label];
    }
    return 'general';
  }

  function commonParams(extra = {}) {
    return {
      source_page: clean(location.pathname, 160),
      current_route: currentRoute(),
      content_title: currentContentTitle(),
      content_type: currentContentType(),
      service_category: categoryFromPath(),
      ...extra
    };
  }

  function send(name, params = {}) {
    if (!gaReady()) return;
    window.gtag('event', name, commonParams(params));
  }

  // Public helper for future true lead submissions.
  // Do NOT call this until a real consultation request is successfully submitted.
  window.WisdomAnalytics = Object.freeze({
    event: send,
    generateLead: (method = 'online_form') => {
      send('generate_lead', { method: clean(method, 40), lead_stage: 'submitted' });
    }
  });

  function closestLink(target) {
    return target instanceof Element ? target.closest('a[href]') : null;
  }

  function hrefPath(link) {
    try {
      const url = new URL(link.href, location.href);
      return url.pathname;
    } catch (_) {
      return '';
    }
  }

  // Click tracking uses delegation so links created dynamically by site.js are also captured.
  document.addEventListener('click', event => {
    const link = closestLink(event.target);
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const text = clean(link.textContent, 80);
    const path = hrefPath(link);

    if (/^tel:/i.test(href)) {
      send('click_phone', {
        contact_method: 'phone',
        lead_stage: 'high_intent',
        entry_point: text.includes('전화') ? 'phone_link' : 'phone'
      });
      return;
    }

    if (/^mailto:/i.test(href)) {
      send('click_email', {
        contact_method: 'email',
        lead_stage: 'high_intent',
        entry_point: 'email_link'
      });
      return;
    }

    if (text.toUpperCase().includes('HELP DESK')) {
      send('click_helpdesk', {
        lead_stage: 'consideration',
        entry_point: 'helpdesk'
      });
      // Also count this inside the total consultation-entry funnel.
      send('click_consultation', {
        lead_stage: 'consideration',
        entry_point: 'helpdesk'
      });
      return;
    }

    if (path === '/contact/' || path.endsWith('/contact/index.html')) {
      send('click_consultation', {
        lead_stage: 'consideration',
        entry_point: clean(text || 'contact_link', 60)
      });
      return;
    }

    if (path === '/documents/' || path.endsWith('/documents/index.html')) {
      send('click_documents', {
        lead_stage: 'research',
        entry_point: clean(text || 'documents_link', 60)
      });
      return;
    }

    if (link.classList.contains('insight-card') || /\/insights\/[^/]+\/?$/.test(path)) {
      const slug = path.split('/').filter(Boolean).pop() || '';
      send('select_content', {
        content_type: 'insight',
        item_id: clean(slug, 80),
        selected_title: clean(link.querySelector('h3')?.textContent || text, 150)
      });
      return;
    }

    if (link.classList.contains('service-card') || /\/specialties\/[^/]+\/?$/.test(path)) {
      const code = path.split('/').filter(Boolean).pop() || 'general';
      send('select_content', {
        content_type: 'specialty',
        item_id: clean(code, 80),
        selected_title: clean(link.querySelector('h3')?.textContent || text, 150),
        service_category: Object.hasOwn(categoryNames, code) ? code : categoryFromPath()
      });
    }
  }, { passive: true });

  // Contact-draft completion: high-value intent, but NOT a submitted lead.
  let draftTracked = false;
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('#make-draft') : null;
    if (!button || draftTracked) return;

    window.setTimeout(() => {
      const output = document.querySelector('#draft-output');
      const draft = document.querySelector('#draft-text');
      if (output && !output.hidden && draft && String(draft.value || '').trim().length > 0) {
        draftTracked = true;
        const field = document.querySelector('#field')?.value;
        send('consultation_draft_created', {
          lead_stage: 'high_intent',
          service_category: field && Object.hasOwn(categoryNames, field) ? field : categoryFromPath()
        });
      }
    }, 80);
  });

  // Optional intent actions after a draft is generated.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('#copy-draft, #save-draft') : null;
    if (!target) return;
    send('consultation_draft_action', {
      lead_stage: 'high_intent',
      draft_action: target.id === 'copy-draft' ? 'copy' : 'save'
    });
  });

  // Useful diagnostic event once per full page load.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      send('wisdom_page_context', { page_context_ready: 'yes' });
    }, { once: true });
  } else {
    send('wisdom_page_context', { page_context_ready: 'yes' });
  }
})();
