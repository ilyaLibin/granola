require('vent-dom/lib/vent.min.es5.js');
const debounce = require('./src/debounce');
const ScriptLoader = require('./src/ScriptLoader');
const { FB_DEFAULT_EVENTS } = require('./src/constants');
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

    loadSettings(customer, () => {
      if (!window.granolaSettings) return logger.error(`failed to load granolaSettings`);

      const {
        targets,
        settings
      } = granolaSettings;

      trackEvents(targets, settings)
    })
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

  function trackEvents(targets, settings) {
    const wrappers = {};
    Object.keys(targets).forEach(selector => {
      const params = targets[selector];
      const {
        wrapper,
        listenTo = 'click',
        trackOnce = false,
      } = params;
      const on = trackOnce ? 'once' : 'on';

      // track element impression events
      if (listenTo === 'impression') {
        vent(wrapper || document)
          .on('scroll', debounce((e) => checkElementVisibility(e, selector, params), 250))
      }

      // track regular events
      if (wrapper) {
        wrappers[wrapper] = wrappers[wrapper] || vent(wrapper);
        wrappers[wrapper][on](listenTo, selector,
          (e) => handlerFactory(e, selector, params, settings));
        logger.log(`set listener for (${wrapper}).on(${listenTo}, ${selector})`, params)
      } else {
        vent(selector)[on](listenTo, (e) => handlerFactory(e, selector, params, settings));
        logger.log(`set listener for (${selector}).on(${listenTo})`, params)
      }
    })
  }

  function handlerFactory(
    event,
    selector,
    { params, formSelector = null, method = 'track', eventName, integrations },
    settings
  ) {
    
    const { eventsDefaults, integrations: defaultIntegrations } = settings;
    const defaults = eventsDefaults[selector] || {};

    const $target = document.querySelector(selector);
    const isForm = formSelector && document.querySelector(formSelector);
    let allParams = params;
    if (isForm) {
      allParams = {
        ...defaults,
        ...params,
        ...formToJSON(document.querySelector(formSelector))
      }
    } else if ($target) {
      allParams = {
        ...defaults,
        ...params,
        ...$target.dataset,
        title: $target.innerText
      }
    }

    switch(method) {
      case 'identify':
        window.analytics && analytics.identify(allParams);
        break;
      case 'track':
      default:
        window.analytics && analytics.track(eventName, allParams);

        if (shouldPropagateTo('fb', integrations, defaultIntegrations)) {
          const fbOverrides = integrations['fb'] || {};
          const fbParams = { ...allParams, ...fbOverrides };
          fbReportEvent(fbParams);
        }

        if (shouldPropagateTo('hj', integrations, defaultIntegrations)) {
          const hjOverrides = integrations['fb'] || {};
          const hjParams = { ...allParams, ...hjOverrides };
        }
        break;
    }
  }

  function shouldPropagateTo(vendor, specific, global) {
    if (typeof specific[vendor] === 'boolean' || typeof specific[vendor] === 'object') {
      return !!specific[vendor];
    }

    return !!global[vendor];
  }

  function fbReportEvent(params = {}) {
    if (!window.fbq) return logger.error('fbq not defined');
    const { eventName } = params;
    const trackVerb = FB_DEFAULT_EVENTS.includes(eventName) ? 'track' : 'trackCustom';
    const {
      category: content_category,
      label: content_name,
      ...others
    } = params;

    const fbParams = { ...others, content_category, content_name };
    logger.log('fb pixel', { trackVerb, ...fbParams });
    fbq(trackVerb, eventName, fbParams);
  }

  //impressions
  function isElementInView(element) {
    const elementBoundingBox = element.getBoundingClientRect();
    const elementTopY = elementBoundingBox.top;
    const elementBottomY = elementBoundingBox.top + elementBoundingBox.height;
    return elementTopY >= 0 && elementBottomY <= Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
  }

  function checkElementVisibility(e, selector, params) {
    const elements = document.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      if (isElementInView(elements[i])) {
        vent(elements[i]).trigger('impression');
      }
    }
  }

  function loadSettings(customer, callback) {
    const isLocalConfig = !!localStorage.getItem('granola-use-local-config');
    const baseURL = isLocalConfig ? `http://localhost:5813` : `https://analytics.exacti.us`;
    const url = baseURL + `/configs/${customer}.js`;
    const loader = new ScriptLoader();
    loader.require([url], callback)
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
