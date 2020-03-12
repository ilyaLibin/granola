import utm from '@segment/utm-params';
const queryString = document.location.search;
class Granola {
  static campaign() {
    const search = utm.strict(queryString);
    console.log(queryString);
    console.log(search)
    if (Object.keys(search).length) {
      analytics.identify({
        utm: utm(queryString)
      })
    }
    return search;
  }
}


window.Granola = Granola;
