import utm from '@segment/utm-params';
import storage from './src/Storage';
import uuid from 'lil-uuid';

storage();
const SESSION_KEY = 'granola_session';
const DEBUG_SRC = 'granola-debug-script';
class Granola {
  constructor() {
    this.queryString = document.location.search;
    this.clientId = (
      window.ga &&
      ga.getAll &&
      ga.getAll()[0] &&
      ga.getAll()[0].get('clientId')) || 'not-set';
    this.sessionId = sessionStorage.getItem(SESSION_KEY) || uuid();
    this.search = utm.strict(document.location.search);
    this.queryParams = utm(document.location.search);
    sessionStorage.setItem(SESSION_KEY, this.sessionId);
  }

  initCampaign() {
    if (Object.keys(this.search).length || this.queryParams.gclid || this.queryParams.fbaid) {
      analytics.identify({
        interaction: 'landing-page-hit',
        utm: this.queryParams,
        gtmClientId: this.clientId
      })
    }

    return this.search;
  }

  // track form submission by selector - it fetch the form data automatically
  trackForm($form, event, extraParams) {
    if (!$form) return;
    const params = {
      ...Granola.formToJSON($form),
      ...this.attributes(),
      ...extraParams,
    }
    analytics.trackForm($form, event, params);
  }

  // track clicks globally same as an old tracking service.
  // const targets = {
  //   '.submit-forms-nopay': {
  //     title: 'Appointment Scheduled',
  //     params: { status: 'not-confirmed' },
  //     isFormSubmit: true,
  //     formSelector: 'form'
  //   }
  // }
  trackClicks(targets = {}, selector = 'body') {
    const that = this;
    document.querySelector(selector).addEventListener('click', (e) => {
      const selectors = Object.keys(targets);
      selectors.forEach(s => {
        if (e.target && e.target.matches(s)) {
          const event = targets[s];
          if (event.isFormSubmit) {
            const params = {
              ...event.params,
              ...Granola.formToJSON(e.target.closest(event.formSelector))
            }
            that.formSubmit(event.title, params)
          } else {
            that.track(event.title, event.params);
          }
        }
      })
    });
  }

  // set link tracking by selector - not sure if needed as it not declarative.
  trackLinkBySelector(selector, eventTitle, params = {}) {
    const $elements = document.querySelectorAll(selector);
    $elements.forEach(a => {
      granola.trackLink(a, eventTitle, {
        text: a.innerText,
        class: a.className,
        ...this.attributes(),
        ...params
      })
    })
  }

  // enrich analytics native method with some attributes
  trackLink($element, eventName, params = {}) {
    analytics.trackLink($element, eventName, {
      ...this.attributes(),
      ...params
    });
  }

  track(eventName, params = {}) {
    analytics.track(eventName, {
      ...this.attributes(),
      ...params
    });
  }

  formSubmit(eventName, params = {}) {
    analytics.track(eventName, {
      ...this.attributes(),
      ...params
    })
    analytics.identify({
      ...this.attributes(),
      ...params
    })
  }

  attributes() {
    return {
      utm: this.queryParams,
      sessionId: this.sessionId,
      gtmClientId: this.clientId
    }
  }

  static formToJSON($form) {
    if (!$form) return {};
    const { elements } = $form;
    const json = [].reduce.call(elements, (data, element) => {
      data[element.name] = element.value;
      return data;
    }, {});
    return json;
  }

  static debugOn(src) {
    if (!src) throw new Error('full url for local script is missing');
    localStorage.setItem(DEBUG_SRC, src);
    window.location.reload();
  }

  static debugOff() {
    localStorage.removeItem(DEBUG_SRC);
  }

  static match(regex) {
    const path = document.location.pathname;
    return (path.match(regex) || {}).input;
  }
}

window.Granola = Granola;
