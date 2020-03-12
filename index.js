import utm from '@segment/utm-params';
const queryString = document.location.search;
class Granola {
  static init() {
    // TODO add params persistance.
    console.log('version test')
  }

  static initCampaign() {
    const search = utm.strict(queryString);
    if (Object.keys(search).length) {
      analytics.identify({
        utm: utm(queryString)
      })
    }
    return search;
  }

  static trackForm($form, event) {
    const params = {
      ...Granola.formToJSON($form),
      utm: utm(queryString)
    }
    analytics.trackForm($form, event, );
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
