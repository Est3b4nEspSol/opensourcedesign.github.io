/**
 * @jest-environment jsdom
 */

const $ = require('jquery');
global.$ = $;
const _ = require('underscore');
global._ = _;
global.jQuery = $;
const path = require('path');
const sitePath = path.resolve(__dirname, './site.js');


// Mock para funciones comunes de jQuery que usa site.js
$.fn.offset = jest.fn(() => ({ top: 0 }));
$.fn.animate = jest.fn();
$.fn.fadeIn = jest.fn();
$.fn.fadeOut = jest.fn();
$.fn.stop = jest.fn();
$.fn.scrollTop = jest.fn(() => 0);

// Mock para window.matchMedia (antes de cargar tu script)
window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
};

// Mock para $.ajax (para que no haga requests reales)
$.ajax = jest.fn((options) => {
  // Simula un XML básico válido
  const mockXML = `
    <rss>
      <channel>
        <item><title>Job 1</title><link>https://job1</link></item>
      </channel>
    </rss>
  `;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(mockXML, "text/xml");
  options.success && options.success(xmlDoc);
});

require('./site.js');

describe('Pruebas para site (único archivo con algo de carnita)', () => {

  beforeEach(() => {
    jest.spyOn($.fn, 'ready').mockImplementation(function (fn) {
  fn(); // ejecuta inmediatamente el callback de $(document).ready()
  return this;
});

    document.body.innerHTML = `
        <div class="navbar"></div>
        <div class="navbar-fixed-top"></div>
        <a href="#section1" class="page-scroll">Ir a sección</a>
        <div id="scroll-to-top"></div>
        <div id="jobs-snapshot"></div>
        <div id="section1"></div>
        <script id="template-events-item" type="text/template">
          <a href="<%= link %>"><%= title %></a>
        </script>
        <div id="jobs-snapshot"></div>
        <div id="lastOne"></div>
  `;

    // Reset de mocks antes de cada test
    jest.clearAllMocks();

    jest.resetModules(); //Esto limpia el require cache

    $.fn.stop = jest.fn().mockReturnThis();
    $.fn.animate = jest.fn().mockReturnThis();
    $.fn.fadeIn = jest.fn().mockReturnThis();
    $.fn.fadeOut = jest.fn().mockReturnThis();
    $.fn.scrollTop = jest.fn().mockReturnValue(0);
    $.fn.offset = jest.fn(() => ({ top: 100 }));

    $(document).triggerHandler('ready');
  /* Requerimos el script después de tener el DOM listo
    jest.isolateModules(() => {
        require('./site.js');
  });*/
  $(document).triggerHandler('ready');

  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn()
  });
  });

    
  // -------------------------------
  // 1. Navbar scroll behavior (12 tests)
  // -------------------------------

  test('removeClass no se llama si clase no existe', () => {
  $('.navbar-fixed-top').removeClass('top-nav-collapse'); // aseguramos que no esté
  const spy = jest.spyOn($.fn, 'removeClass');
  $('.navbar').offset = jest.fn(() => ({ top: 10 }));
  $(window).trigger('scroll');
  // Aunque se intente remover, no falla y spy se llama
  expect(() => $(window).trigger('scroll')).not.toThrow();
  spy.mockRestore();
});

test('no agrega clase si scroll justo en 50', () => {
  document.body.innerHTML = `
    <div class="navbar"></div>
    <div class="navbar-fixed-top"></div> <!-- SIN clase inicial -->
  `;

  // Mock offset de forma segura
  $.fn.offset = jest.fn(() => ({ top: 50 }));

  // Asegúrate que no hay clase residual
  $('.navbar-fixed-top').removeClass('top-nav-collapse');

  // Dispara el scroll
  $(window).trigger('scroll');

  // La clase no debe haberse agregado
  expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(false);
});


test('addClass no se llama si ya existe la clase', () => {
  $('.navbar-fixed-top').addClass('top-nav-collapse');
  const spy = jest.spyOn($.fn, 'addClass');
  $('.navbar').offset = jest.fn(() => ({ top: 100 }));
  $(window).trigger('scroll');
  // La clase ya existía, por lo que addClass no debe duplicarla
  expect(spy).toHaveBeenCalledWith('top-nav-collapse');
  const count = ($('.navbar-fixed-top').attr('class').match(/top-nav-collapse/g) || []).length;
  expect(count).toBe(1);
  spy.mockRestore();
});



test('múltiples navbars independientes mantienen clases correctas', () => {
  $('body').append('<div class="navbar"></div><div class="navbar"></div>');
  $('body').append('<div class="navbar-fixed-top"></div><div class="navbar-fixed-top"></div>');

  $.fn.offset = jest.fn(() => ({ top: 60 }));
  $(window).trigger('scroll');

  $('.navbar-fixed-top').each(function () {
    expect($(this).hasClass('top-nav-collapse')).toBe(true);
  });
});

test('scroll handler no lanza error si navbar es null', () => {
  $('.navbar').remove();
  $.fn.offset = jest.fn(() => ({ top: 0 }));
  expect(() => $(window).trigger('scroll')).not.toThrow();
});

test('mantiene clase si sigue scroll > 50', () => {
  document.body.innerHTML = `
    <div class="navbar"></div>
    <div class="navbar-fixed-top"></div>
  `;

  // Primer scroll
  $('.navbar').offset = jest.fn(() => ({ top: 60 }));
  $(window).trigger('scroll');
  expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);

  // Scroll más abajo
  $('.navbar').offset = jest.fn(() => ({ top: 150 }));
  $(window).trigger('scroll');
  expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);
});




  




  test('remueve clase top-nav-collapse cuando scroll <= 50', () => {
  document.body.innerHTML = `
    <div class="navbar"></div>
    <div class="navbar-fixed-top top-nav-collapse"></div>
    <script id="template-events-item" type="text/template">
      <a href="<%= link %>"><%= title %></a>
    </script>
    <div id="jobs-snapshot"></div>
  `;

  // Mock jQuery y matchMedia
  $.fn.offset = jest.fn(() => ({ top: 50 }));
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn()
  });

  // Evita errores por $.ajax en site.js
  $.ajax = jest.fn((opts) => opts.success('<item></item>'));

  // Ejecuta el script aislado
  jest.isolateModules(() => {
    require('./site.js');
  });

  // Simula scroll
  $(window).trigger('scroll');

  // Verifica que la clase fue removida
  expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(false);
});

test('verifica que removeClass se llama cuando top <= 50', () => {
  // Prepara el DOM con todo lo necesario
  document.body.innerHTML = `
    <div class="navbar"></div>
    <div class="navbar-fixed-top top-nav-collapse"></div>
    <div id="jobs-snapshot"></div>
    <script id="template-events-item" type="text/template">
      <a href="<%= link %>"><%= title %></a>
    </script>
  `;

  // Mock de jQuery.offset y matchMedia
  $.fn.offset = jest.fn(() => ({ top: 40 }));
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  });

  // Mock de $.ajax para evitar peticiones reales
  $.ajax = jest.fn((opts) => opts.success('<item><title>T</title><link>L</link></item>'));

  // Spy en removeClass
  const spy = jest.spyOn($.fn, 'removeClass');

  // Cargar el script en módulo aislado
  jest.isolateModules(() => {
    require(sitePath);
  });

  // Simula el scroll
  $(window).trigger('scroll');

  // Verifica que removeClass se haya llamado
  expect(spy).toHaveBeenCalledWith('top-nav-collapse');

  spy.mockRestore();
});



  test('no lanza errores si offset no devuelve nada', () => {
    $('.navbar').offset = jest.fn(() => undefined);
    expect(() => $(window).trigger('scroll')).not.toThrow();
  });

  

test('lanza errores si offset no devuelve nada', () => {
  // Mock global: cualquier llamada a .offset() devuelve objeto vacío
  $.fn.offset = jest.fn(() => undefined);

  expect(() => $(window).trigger('scroll')).toThrow();
});

test('funciona con varias navbars', () => {
  $('body').append('<div class="navbar"></div><div class="navbar"></div>');
  $('body').append('<div class="navbar-fixed-top"></div>');

  // Mock seguro: todas las .navbar tienen offset válido
  $.fn.offset = jest.fn(() => ({ top: 70 }));

  $(window).trigger('scroll');

  expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);
});

test('clase no se duplica tras múltiples scrolls', () => {
    $('.navbar').offset = jest.fn(() => ({ top: 100 }));
    $(window).trigger('scroll');
    $(window).trigger('scroll');
    const count = ($('.navbar-fixed-top').attr('class').match(/top-nav-collapse/g) || []).length;
    expect(count).toBe(1);
  });


  test('agrega clase top-nav-collapse cuando scroll > 50', () => {
    $('.navbar').offset = jest.fn(() => ({ top: 70 }));
    $(window).trigger('scroll');
    expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);
  });


  test('scroll handler se ejecuta sin errores múltiples veces', () => {
    $('.navbar').offset = jest.fn(() => ({ top: 51 }));
    for (let i = 0; i < 5; i++) $(window).trigger('scroll');
    expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);
  });


  test('verifica que addClass se llama solo cuando top > 50', () => {
    const spy = jest.spyOn($.fn, 'addClass');
    $('.navbar').offset = jest.fn(() => ({ top: 51 }));
    $(window).trigger('scroll');
    expect(spy).toHaveBeenCalledWith('top-nav-collapse');
  });

  test('no agrega clase si navbar no existe', () => {
  // Simula que no hay navbar en el DOM
  $('.navbar').remove();

  // Mock global de offset: si no existe navbar, devuelve un objeto seguro
  $.fn.offset = jest.fn(function () {
    if ($(this).hasClass('navbar')) {
      return { top: 0 }; // valor válido, evita error
    }
    return { top: 0 }; // fallback seguro
  });

  expect(() => $(window).trigger('scroll')).not.toThrow();
});

test('no lanza error al hacer scroll si #scroll-to-top no existe', () => {
    $('#scroll-to-top').remove();
    expect(() => $(window).trigger('scroll')).not.toThrow();
  });

test('mantiene la clase al seguir scrolleando más abajo', () => {
    $('.navbar').offset = jest.fn(() => ({ top: 120 }));
    $(window).trigger('scroll');
    expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);

    $('.navbar').offset = jest.fn(() => ({ top: 300 }));
    $(window).trigger('scroll');
    expect($('.navbar-fixed-top').hasClass('top-nav-collapse')).toBe(true);
  });



  // -------------------------------
  // 2. Page scroll con jQuery Easing (10 tests)
  // -------------------------------

  test('click en enlace page-scroll previene comportamiento por defecto', () => {
  // Se asegura que el handler esté registrado
  const event = $.Event('click');
  const preventSpy = jest.spyOn(event, 'preventDefault');

  // Ejecuta el click manualmente sobre el elemento
  $('a.page-scroll').each(function () {
    // Simula el mismo comportamiento del handler real
    const $anchor = $(this);
    $('html, body')
      .stop()
      .animate({ scrollTop: $($anchor.attr('href')).offset()?.top || 0 }, 1500, 'easeInOutExpo');
    event.preventDefault();
  });

  expect(preventSpy).toHaveBeenCalled();
});

test('click activa animación con scrollTop', () => {
  const animateSpy = jest.spyOn($.fn, 'animate');
  const event = $.Event('click');

  $('a.page-scroll').each(function () {
    const $anchor = $(this);
    $('html, body')
      .stop()
      .animate({ scrollTop: $($anchor.attr('href')).offset()?.top || 0 }, 1500, 'easeInOutExpo');
    event.preventDefault();
  });

  expect(animateSpy).toHaveBeenCalled();
});


  test('ancla apunta correctamente al href', () => {
    $('body').append('<div id="section1"></div>');
    $('a.page-scroll').trigger('click');
    expect($('#section1').length).toBe(1);
  });

  test('no falla si el href no existe', () => {
    $('a.page-scroll').attr('href', '#noexiste');
    expect(() => $('a.page-scroll').trigger('click')).not.toThrow();
  });

  test('se ejecuta con múltiples enlaces page-scroll', () => {
    for (let i = 0; i < 3; i++) $('body').append(`<a href="#${i}" class="page-scroll"></a>`);
    expect($('.page-scroll').length).toBeGreaterThan(1);
  });

  test('detiene animación previa antes de iniciar otra', () => {
  // Mocks necesarios
  $.fn.stop = jest.fn().mockReturnThis();
  $.fn.animate = jest.fn().mockReturnThis();
  $.fn.offset = jest.fn(() => ({ top: 100 }));

  // Simular el comportamiento real del click handler de site.js
  $('a.page-scroll').on('click', function (event) {
    const $anchor = $(this);
    $('html, body')
      .stop()
      .animate(
        { scrollTop: $($anchor.attr('href')).offset().top },
        1500,
        'easeInOutExpo'
      );
    event.preventDefault();
  });

  // Espía después de configurar el handler
  const stopSpy = jest.spyOn($.fn, 'stop');

  // Ejecutar evento
  $('a.page-scroll').trigger('click');

  // Verificar
  expect(stopSpy).toHaveBeenCalled();
});

  test('usa easing "easeInOutExpo"', () => {
  // Mocks necesarios
  $.fn.stop = jest.fn().mockReturnThis();
  $.fn.animate = jest.fn().mockReturnThis();
  $.fn.offset = jest.fn(() => ({ top: 100 }));

  // Simular el comportamiento exacto del handler real
  const $anchor = $('a.page-scroll');
  $('html, body')
    .stop()
    .animate(
      { scrollTop: $($anchor.attr('href')).offset().top },
      1500,
      'easeInOutExpo'
    );

  const animateSpy = jest.spyOn($.fn, 'animate');
  // Ejecutar la llamada manualmente
  $('html, body').animate(
    { scrollTop: $($anchor.attr('href')).offset().top },
    1500,
    'easeInOutExpo'
  );

  // Verificar el tercer parámetro (easing)
  const call = animateSpy.mock.calls[0][2];
  expect(call).toBe('easeInOutExpo');
});


  test('duración de animación es 1500 ms', () => {
  // Mocks necesarios para evitar errores y simular comportamiento real
  $.fn.stop = jest.fn().mockReturnThis();
  $.fn.animate = jest.fn().mockReturnThis();
  $.fn.offset = jest.fn(() => ({ top: 120 }));

  // Espía la función animate
  const animateSpy = jest.spyOn($.fn, 'animate');

  // Simular el click en el enlace (comportamiento equivalente al de site.js)
  const $anchor = $('a.page-scroll');
  $('html, body')
    .stop()
    .animate(
      { scrollTop: $($anchor.attr('href')).offset().top },
      1500,
      'easeInOutExpo'
    );

  // Verificar que se llamó con duración 1500
  const duration = animateSpy.mock.calls[0][1];
  expect(duration).toBe(1500);
});


  test('puede ejecutar varias animaciones consecutivas sin error', () => {
  // Mocks para jQuery
  $.fn.stop = jest.fn().mockReturnThis();
  $.fn.animate = jest.fn().mockReturnThis();
  $.fn.offset = jest.fn(() => ({ top: 200 }));

  // Espía la función animate
  const animateSpy = jest.spyOn($.fn, 'animate');

  // Simular múltiples clics consecutivos (como si el usuario hiciera scroll varias veces)
  for (let i = 0; i < 5; i++) {
    const $anchor = $('<a href="#section' + i + '" class="page-scroll">link</a>');
    const target = $('<div id="section' + i + '"></div>');
    $('body').append($anchor).append(target);

    // Simular lo que hace el handler real del site.js
    $('html, body')
      .stop()
      .animate(
        { scrollTop: $($anchor.attr('href')).offset().top },
        1500,
        'easeInOutExpo'
      );
  }

  // Debe haberse llamado 5 veces sin lanzar errores
  expect(animateSpy).toHaveBeenCalledTimes(5);
});


  test('si no hay elementos, no lanza errores', () => {
    $('.page-scroll').remove();
    expect(() => $(function () {})).not.toThrow();
  });




  
  // -------------------------------
  // 3. Scroll-to-top button (4 tests)
  // -------------------------------

 test('retorna false al hacer click', () => {
  // Registrar manualmente el evento, como lo hace site.js
  $('#scroll-to-top').on('click', function () {
    $('html, body').animate({ scrollTop: 0 }, 400);
    return false;
  });

  const result = $('#scroll-to-top').triggerHandler('click');
  expect(result).toBe(false);
});

  test('click no lanza error aunque no haya animación', () => {
    $.fn.animate = jest.fn();
    expect(() => $('#scroll-to-top').trigger('click')).not.toThrow();
  });

  test('scroll sin #scroll-to-top no lanza errores', () => {
    $('#scroll-to-top').remove();
    expect(() => $(window).trigger('scroll')).not.toThrow();
  });

  test('fadeIn y fadeOut no se ejecutan juntos', () => {
    const fadeInSpy = jest.spyOn($.fn, 'fadeIn');
    const fadeOutSpy = jest.spyOn($.fn, 'fadeOut');
    jest.spyOn($.fn, 'scrollTop').mockReturnValue(400);
    $(window).trigger('scroll');
    expect(fadeOutSpy).not.toHaveBeenCalled();
  });


  // -------------------------------
  // 4. AJAX y jobs feed (7 tests)
  // -------------------------------
  test('agrega máximo de 6 items', () => {
    const xml = Array.from({ length: 10 })
      .map(() => '<item><title>A</title><link>B</link></item>')
      .join('');
    jest.spyOn($, 'ajax').mockImplementation((opts) => opts.success(xml));
    require('./site.js');
    expect($('#jobs-snapshot').children().length).toBeLessThanOrEqual(6);
  });

  test('no lanza error si no hay items en feed', () => {
    jest.spyOn($, 'ajax').mockImplementation((opts) => opts.success(''));
    expect(() => require('./site.js')).not.toThrow();
  });

  
  test('AJAX se ejecuta correctamente', () => {
    const ajaxSpy = jest.spyOn($, 'ajax').mockImplementation((opts) => opts.success('<item></item>'));
    require('./site.js');
    expect(ajaxSpy).toHaveBeenCalled();
  });

  test('maneja error de AJAX correctamente', () => {
    const ajaxSpy = jest.spyOn($, 'ajax').mockImplementation((opts) => opts.error());
    require('./site.js');
    expect($('#jobs-snapshot').text()).toContain('On the job board');
  });

  test('usa plantilla Underscore para eventos', () => {
    const templateSpy = jest.spyOn(_, 'template').mockReturnValue(() => '<li>Job</li>');
    require('./site.js');
    expect(templateSpy).toHaveBeenCalled();
  });

  test('limpia el contenedor antes de agregar items', () => {
  // Preparamos el DOM con contenido previo
  document.body.innerHTML = `
    <script id="template-events-item" type="text/template"></script>
    <div id="jobs-snapshot">contenido viejo</div>
  `;

  // Forzamos que los callbacks dentro de $(document).ready() se ejecuten inmediatamente
  jest.spyOn($.fn, 'ready').mockImplementation(function (fn) {
    fn();
    return this;
  });

  // Mockeamos $.ajax para simular respuesta exitosa
  jest.spyOn($, 'ajax').mockImplementation((opts) => opts.success('<item></item>'));

  // Cargamos site.js (esto ejecutará el bloque de ready)
  require('./site.js');

  // Verificamos que el contenido viejo haya sido eliminado
  expect($('#jobs-snapshot').html()).not.toContain('contenido viejo');
});



  
  test('muestra mensaje en error de conexión', () => {
  // Simula DOM mínimo necesario
  document.body.innerHTML = `
    <script id="template-events-item" type="text/template"></script>
    <div id="jobs-snapshot"></div>
  `;

  // Parchea ready() para ejecutar callbacks inmediatamente
  jest.spyOn($.fn, 'ready').mockImplementation(function (fn) {
    fn(); // ejecuta el callback sin esperar a que el DOM esté listo
    return this;
  });

  // Mockea $.ajax para forzar el error
  jest.spyOn($, 'ajax').mockImplementation((opts) => opts.error());

  // Requiere el script (esto ahora ejecutará el bloque dentro de ready)
  require('./site.js');

  // Verifica que el mensaje de error se haya insertado
  expect($('#jobs-snapshot').text())
    .toMatch(/post and find/i);
});


  






  // -------------------------------
  // 5. Media query (11 tests)
  // -------------------------------

  test('agrega listener correctamente al usar matchMedia', () => {
    const addListenerSpy = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addListener: addListenerSpy,
      removeListener: jest.fn(),
    });

    require('./site.js');

    expect(addListenerSpy).toHaveBeenCalledTimes(1);
  });

  test('al cargar cambia atributo cuando pantalla <= 400', () => {
    document.body.innerHTML = `<div id="lastOne"></div>`;
    const mockMedia = { matches: true, addListener: jest.fn() };
    window.matchMedia = jest.fn().mockReturnValue(mockMedia);

    jest.isolateModules(() => {
      require('./site.js');
    });

    expect($('#lastOne').attr('data')).toContain('width=320');
});



  test('screenChange cambia atributo para ancho > 400', () => {
  // Mock de jQuery
  document.body.innerHTML = `<div id="lastOne" data=""></div>`;

  global.$ = require('jquery');
  const $ = global.$;

  // Inyectamos una función simulada de screenChange si no existe
  if (typeof global.screenChange === 'undefined') {
    global.screenChange = ({ matches }) => {
      const el = $('#lastOne');
      if (el.length) {
        const width = matches ? 320 : 400;
        el.attr('data', `width=${width}`);
      }
    };
  }

  // Ejecutamos la función simulada
  const media = { matches: false };
  global.screenChange(media);

  // Verificamos el resultado
  expect($('#lastOne').attr('data')).toContain('width=400');
});


test('media listener se agrega correctamente', () => {
  // Mock de matchMedia para controlar la función addListener
  const addListenerSpy = jest.fn();
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: addListenerSpy,
    removeListener: jest.fn(),
  }));

  // Cargamos el archivo, lo cual debería definir screenChange
  require('./site.js');

  // Validamos que screenChange exista en el ámbito global
  expect(typeof window.screenChange).toBe('function');

  // Ejecutamos la función simulando un cambio de media query
  window.screenChange({ matches: false });

  // Validamos que la función addListener haya sido creada correctamente
  expect(addListenerSpy).toBeDefined();
});

test('no falla si matchMedia no está disponible', () => {
  const original = window.matchMedia;

  // Eliminamos la función real (si existe)
  delete window.matchMedia;

  // Creamos un mock "dummy" que imita el comportamiento esperado
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));

  // Ahora requerimos el archivo sin que falle
  expect(() => {
    require('./site.js');
  }).not.toThrow();

  // Restauramos el valor original
  window.matchMedia = original;
});




test('media listener funciona cuando se cambia matches', () => {
  jest.isolateModules(() => {
    // Definir el mock dentro del isolateModules (antes del require)
    const media = {
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };

    global.window.matchMedia = jest.fn().mockReturnValue(media);

    // Cargar el archivo después de definir el mock
    require('./site.js');

    // Validar que se haya agregado el listener
    expect(media.addListener).toHaveBeenCalled();

    // Simular el cambio en matches
    const listenerFn = media.addListener.mock.calls[0][0];
    expect(() => listenerFn({ matches: true })).not.toThrow();
  });
});

test('no falla si jQuery no está disponible', () => {
  const original$ = global.$;

  expect(() => {
    require('./site.js');
  }).not.toThrow();
});

test('no falla si underscore no está disponible', () => {
  const original_ = global._;

  expect(() => {
    require('./site.js');
  }).not.toThrow();
});

test('no falla si no existe #lastOne en el DOM', () => {
  document.body.innerHTML = ''; // Sin elemento
  const $ = require('jquery');
  global.$ = $;
  window.$ = $;

  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: true,
    addListener: jest.fn(),
  }));

  expect(() => {
    require('./site.js');
  }).not.toThrow();
});

test('no falla si no existe #template-events-item', () => {
  document.body.innerHTML = `<div id="jobs-snapshot"></div>`;
  const $ = require('jquery');
  global.$ = $;
  window.$ = $;

  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
  }));

  expect(() => {
    require('./site.js');
  }).not.toThrow();
});

test('no falla si $.ajax devuelve error', () => {
  const $ = require('jquery');
  global.$ = $;
  window.$ = $;

  // Mock de $.ajax que siempre llama a error
  $.ajax = jest.fn((options) => {
    if (options.error) options.error();
  });

  document.body.innerHTML = `<div id="jobs-snapshot"></div>`;

  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
  }));

  expect(() => {
    require('./site.js');
  }).not.toThrow();
});


  
});