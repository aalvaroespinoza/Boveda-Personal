/**
 * BÓVEDA PERSONAL · MÓDULO DE ANIMACIONES Y MICROINTERACCIONES
 * Control de Anime.js para interfaces sobrias, profesionales y formales.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PanelFX = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var hasAnime = function () {
    return typeof window !== 'undefined' && typeof window.anime === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  var syncAnimation = null;

  var PanelFX = {
    /**
     * Transición suave de entrada al cambiar de pestaña
     */
    viewEnter: function (viewElement) {
      if (!viewElement) return;
      if (!hasAnime()) {
        viewElement.style.opacity = '1';
        return;
      }
      window.anime.remove(viewElement);
      window.anime({
        targets: viewElement,
        opacity: [0, 1],
        translateY: [6, 0],
        duration: 180,
        easing: 'easeOutQuad'
      });
    },

    /**
     * Entrada escalonada para listas (directorio de investigación, tareas, proyectos)
     */
    staggerItems: function (selectorOrElements, delayMs) {
      if (!hasAnime()) return;
      var delay = typeof delayMs === 'number' ? delayMs : 18;
      var targets = typeof selectorOrElements === 'string'
        ? document.querySelectorAll(selectorOrElements)
        : selectorOrElements;
      if (!targets || targets.length === 0) return;

      window.anime.remove(targets);
      window.anime({
        targets: targets,
        opacity: [0, 1],
        translateY: [4, 0],
        delay: window.anime.stagger(delay),
        duration: 160,
        easing: 'easeOutQuad'
      });
    },

    /**
     * Microinteracción de completado de tarea
     * Anima el check, atenúa la fila y colapsa la altura suavemente.
     */
    taskComplete: function (rowElement, callback) {
      if (!rowElement) {
        if (callback) callback();
        return;
      }
      if (!hasAnime()) {
        if (callback) callback();
        return;
      }

      window.anime({
        targets: rowElement,
        opacity: [1, 0],
        translateX: [0, 6],
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        duration: 220,
        easing: 'easeInOutQuad',
        complete: function () {
          if (typeof callback === 'function') {
            callback();
          }
        }
      });
    },

    /**
     * Despliegue de Bottom Sheet ("Más" en iPhone)
     */
    openBottomSheet: function (sheetElement) {
      if (!sheetElement) return;
      sheetElement.hidden = false;
      var content = sheetElement.querySelector('.sheet-content');
      var backdrop = sheetElement.querySelector('.sheet-backdrop');

      if (!hasAnime()) {
        if (content) content.style.transform = 'translateY(0%)';
        if (backdrop) backdrop.style.opacity = '0.6';
        return;
      }

      if (content) {
        window.anime.remove(content);
        window.anime({
          targets: content,
          translateY: ['100%', '0%'],
          duration: 250,
          easing: 'easeOutQuad'
        });
      }

      if (backdrop) {
        window.anime.remove(backdrop);
        window.anime({
          targets: backdrop,
          opacity: [0, 0.6],
          duration: 200,
          easing: 'linear'
        });
      }
    },

    /**
     * Apertura del Drawer Universal de Notas
     */
    openDrawer: function (drawerElement) {
      if (!drawerElement) return;
      drawerElement.hidden = false;
      var panel = drawerElement.querySelector('.drawer-panel');
      var backdrop = drawerElement.querySelector('.drawer-backdrop');

      var isMobile = window.innerWidth <= 680;

      if (!hasAnime()) {
        if (panel) panel.style.transform = isMobile ? 'translateY(0%)' : 'translateX(0%)';
        if (backdrop) backdrop.style.opacity = '0.75';
        return;
      }

      if (backdrop) {
        window.anime.remove(backdrop);
        window.anime({
          targets: backdrop,
          opacity: [0, 0.75],
          duration: 200,
          easing: 'linear'
        });
      }

      if (panel) {
        window.anime.remove(panel);
        var animProps = isMobile
          ? { targets: panel, translateY: ['100%', '0%'], duration: 250, easing: 'easeOutQuad' }
          : { targets: panel, translateX: ['100%', '0%'], duration: 250, easing: 'easeOutQuad' };
        window.anime(animProps);
      }
    },

    /**
     * Cierre del Drawer Universal de Notas
     */
    closeDrawer: function (drawerElement, callback) {
      if (!drawerElement) return;
      var panel = drawerElement.querySelector('.drawer-panel');
      var backdrop = drawerElement.querySelector('.drawer-backdrop');
      var isMobile = window.innerWidth <= 680;

      if (!hasAnime()) {
        drawerElement.hidden = true;
        if (callback) callback();
        return;
      }

      if (backdrop) {
        window.anime({
          targets: backdrop,
          opacity: [0.75, 0],
          duration: 180,
          easing: 'linear'
        });
      }

      if (panel) {
        var animProps = isMobile
          ? { targets: panel, translateY: ['0%', '100%'], duration: 200, easing: 'easeInQuad' }
          : { targets: panel, translateX: ['0%', '100%'], duration: 200, easing: 'easeInQuad' };
        animProps.complete = function () {
          drawerElement.hidden = true;
          if (typeof callback === 'function') callback();
        };
        window.anime(animProps);
      } else {
        drawerElement.hidden = true;
        if (typeof callback === 'function') callback();
      }
    },

    /**
     * Cierre de Bottom Sheet ("Más" en iPhone)
     */
    closeBottomSheet: function (sheetElement, callback) {
      if (!sheetElement) return;
      var content = sheetElement.querySelector('.sheet-content');
      var backdrop = sheetElement.querySelector('.sheet-backdrop');

      if (!hasAnime()) {
        sheetElement.hidden = true;
        if (callback) callback();
        return;
      }

      if (backdrop) {
        window.anime({
          targets: backdrop,
          opacity: [0.6, 0],
          duration: 180,
          easing: 'linear'
        });
      }

      if (content) {
        window.anime({
          targets: content,
          translateY: ['0%', '100%'],
          duration: 200,
          easing: 'easeInQuad',
          complete: function () {
            sheetElement.hidden = true;
            if (typeof callback === 'function') {
              callback();
            }
          }
        });
      } else {
        sheetElement.hidden = true;
        if (typeof callback === 'function') callback();
      }
    },

    /**
     * Pulso sutil y respiratorio en el micro-punto de sincronización
     */
    startSyncPulse: function (dotElement) {
      if (!dotElement) return;
      dotElement.classList.add('syncing');
      if (!hasAnime()) return;

      if (syncAnimation) syncAnimation.pause();
      syncAnimation = window.anime({
        targets: dotElement,
        opacity: [0.4, 1],
        scale: [1, 1.25, 1],
        duration: 1100,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
      });
    },

    /**
     * Detiene el pulso de sincronización y lo devuelve a reposo
     */
    stopSyncPulse: function (dotElement) {
      if (!dotElement) return;
      dotElement.classList.remove('syncing');
      if (syncAnimation) {
        syncAnimation.pause();
        syncAnimation = null;
      }
      if (hasAnime()) {
        window.anime.remove(dotElement);
        window.anime({
          targets: dotElement,
          opacity: 1,
          scale: 1,
          duration: 200,
          easing: 'easeOutQuad'
        });
      }
    },

    /**
     * Feedback microinteractivo en botones (ej: "Guardar en Entrada")
     */
    buttonFeedback: function (buttonElement, temporaryText) {
      if (!buttonElement) return;
      var originalText = buttonElement.textContent;
      if (temporaryText) {
        buttonElement.textContent = temporaryText;
      }

      if (hasAnime()) {
        window.anime({
          targets: buttonElement,
          scale: [0.96, 1],
          duration: 150,
          easing: 'easeOutQuad'
        });
      }

      setTimeout(function () {
        buttonElement.textContent = originalText;
      }, 1600);
    }
  };

  return PanelFX;
});
