require('vent-dom/lib/vent.min.es5.js');
const DEBUG_SRC = 'granola-debug-script';
const LOCAL_CONFIG_FLAG = 'granola-use-local-config';
const VERBOSE = 'granola-verbose-logs';

const Logger = () => {
  const isVerbose = !!localStorage.getItem(VERBOSE);
  function log(message, arguments = {}) {
    isVerbose && console.log(`Granola: ${message}`, arguments);
  }

  function error(message, arguments = {}) {
    isVerbose && console.error(`Granola: ${message}`, arguments);
  }

  return { log, error };
}

const logger = Logger();

function Granola() {
  function init(customer, triggers = []) {
    if (triggers && triggers.length) {
      trackEvents(triggers)
    }

    loadConfig(customer, (response) => {
      let triggers;
      try {
        triggers = JSON.parse(response);
      } catch (e) {
        return console.error('JSON file is not valid')
      }

      trackEvents(triggers);
    });
  }

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

  function verbose() {
    localStorage.setItem(VERBOSE, 'on');
  }

  function useLocalConfig() {
    localStorage.setItem(LOCAL_CONFIG_FLAG, 'yes');
    window.location.reload();
  }

  function useProductionConfig() {
    localStorage.removeItem(LOCAL_CONFIG_FLAG);
    window.location.reload();
  }
  
  function trackEvents(targets) {
    const wrappers = {};
    Object.keys(targets).forEach(selector => {
      const params = targets[selector];
      const {
        wrapper,
        eventName = 'click',
        trackOnce = false,
      } = params;
      const on = trackOnce ? 'once' : 'on';

      if (wrapper) {
        wrappers[wrapper] = wrappers[wrapper] || vent(wrapper);
        wrappers[wrapper][on](eventName, selector,
          (e) => handlerFactory(e, selector, params));
        logger.log(`set listener for (${wrapper}).on(${eventName})`, params)
      } else {
        vent(selector)[on](eventName, (e) => handlerFactory(e, selector, params));
        logger.log(`set listener for (${wrapper}).on(${eventName})`, params)
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

  function xhrSuccess() {
    this.callback.call(this, this.response);
  }

  function xhrError() {
    console.error(this.statusText);
  }

  function loadConfig(customer, callback) {
    const isLocalConfig = !!localStorage.getItem('granola-use-local-config');
    const baseURL = isLocalConfig ? `http://localhost:5813` : `https://analytics.exacti.us`;
    const url = baseURL + `/configs/${customer}.json`;

    var xhr = new XMLHttpRequest();
    xhr.callback = callback;
    xhr.onload = xhrSuccess;
    xhr.onerror = xhrError;
    xhr.open("GET", url, true);
    xhr.send(null);
  }

  return {
    init,
    trackEvents,
    debugOn,
    debugOff,
    useLocalConfig,
    useProductionConfig,
    verbose
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
