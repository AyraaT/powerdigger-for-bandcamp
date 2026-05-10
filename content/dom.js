// Lightweight DOM helpers for content scripts.
window.PD = window.PD || {};

PD.dom = {
        qs(sel, root = document) {
                return root.querySelector(sel);
        },
        qsa(sel, root = document) {
                return Array.from(root.querySelectorAll(sel));
        },
        on(el, event, handler, opts) {
                if (!el) return;
                el.addEventListener(event, handler, opts);
        },
        applyStyles(el, styles) {
                if (!el || !styles) return;
                Object.assign(el.style, styles);
        },
};
