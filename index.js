import utm from '@segment/utm-params';
import storage from './src/Storage';
import { uuid } from 'uuidv4';
storage();

const SESSION_KEY = 'exactius_session';

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

  trackForm($form, event) {
    const params = {
      ...Granola.formToJSON($form),
      ...this.attributes()
    }
    analytics.trackForm($form, event, params);
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
    const { elements } = $form;
    const json = [].reduce.call(elements, (data, element) => {
      data[element.name] = element.value;
      return data;
    }, {});
    return json;
  }

  static persistCampaignParams() {

  }
}

window.Granola = Granola;
