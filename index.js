import utm from '@segment/utm-params';
import storage from './src/Storage';
import { uuid } from 'uuidv4';
storage();

const SESSION_KEY = 'granola_session';
const DEBUG_SRC = 'granola-debug-script';
class Granola {
  constructor() {
    this.queryString = document.location.search;
    this.sessionId = sessionStorage.getItem(SESSION_KEY) || uuid();
    this.search = utm.strict(this.queryString);
    this.queryParams = utm(this.queryString);

    sessionStorage.setItem(SESSION_KEY, this.sessionId);
  }

  initCampaign() {
    if (Object.keys(this.search).length) {
      analytics.identify({
        utm: this.queryParams
      })
    }

    return this.search;
  }

  trackForm($form, event, extraParams) {
    if (!$form) return;
    const params = {
      ...Granola.formToJSON($form),
      ...this.attributes(),
      ...extraParams,
    }
    analytics.trackForm($form, event, params);
  }

  trackLinkBySelector(selector, eventTitle, params = {}) {
    const $elements = document.querySelectorAll(selector);
    $elements.forEach(a => granola.trackLink(a, eventTitle, {
      text: a.innerText,
      class: a.classList,
      ...this.attributes(),
      ...params
    }))
  }

  trackLink($element, eventName, params = {}) {
    analytics.trackLink($element, eventName, {
      ...this.attributes(),
      ...params
    });
  }

  attributes() {
    return {
      utm: this.queryParams,
      sessionId: this.sessionId
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
    if (!scr) throw new Error('full url for local script is missing');
    localStorage.setItem(DEBUG_SRC, src);
    window.location.reload();
  }

  static debugOff() {
    localStorage.removeItem(DEBUG_SRC);
  }
}

window.Granola = Granola;
