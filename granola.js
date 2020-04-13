require('vent-dom/lib/vent.min.es5.js');
const DEBUG_SRC = 'granola-debug-script';
function Granola() {
  function formToJSON($form) {
    if (!$form) return {};
    const { elements } = $form;
    const json = [].reduce.call(elements, (data, element) => {
      data[element.name] = element.value;
      return data;
    }, {});
    return json;
  }

  function debugOn(src) {
    if (!src) throw new Error('full url for local script is missing');
    localStorage.setItem(DEBUG_SRC, src);
    window.location.reload();
  }

  function debugOff() {
    localStorage.removeItem(DEBUG_SRC);
  }
  
  function setListeners(targets) {
    const wrappers = {};
    Object.keys(targets).forEach(selector => {
      const params = targets[selector];
      const eventName = params.eventName || 'click';
      if (params.wrapper) {
        wrappers[params.wrapper] = wrappers[params.wrapper] || vent(params.wrapper);
        wrappers[params.wrapper].on(eventName, selector,
          (e) => handlerFactory(e, selector, params));
  
      } else {
        vent(selector).on(eventName, (e) => handlerFactory(e, selector, params));
      }
    })
  }
  
  function handlerFactory(event, selector, {
    params,
    formSelector = null,
    method = 'track',
    title
  }) {
    const $target = document.querySelector(selector);
    const isForm = formSelector && document.querySelector(formSelector);
    let allParams = params;
    if (isForm) {
      allParams = {
        ...params,
        ...formToJSON(document.querySelector(formSelector))
      }
    } else if ($target) {
      allParams = {
        ...params,
        ...$target.dataset,
        title: $target.innerText
      }
    }

    switch(method) {
      case 'identify':
        analytics && analytics.identify(allParams);
        break;
      case 'track':
      default:
        analytics && analytics.track(title, allParams);
        break;
    }
  }

  return {
    setListeners
  }
}

window.Granola = Granola;
window.granola = Granola();

/*
const targets = {
  'li': {
    wrapper: 'ul.list',
    title: 'CTA clicked',
    params: { status: 'not-confirmed'},
    eventName: 'click',
  },
  '.targetTwo': {
    params: { status: 'not-confirmed' },
    method: 'identify'
  }
}
*/
