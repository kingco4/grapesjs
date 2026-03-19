import { ModuleView } from '../../abstract';
import Modal from '../model/Modal';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default class ModalView extends ModuleView<Modal> {
  private titleId = `${this.pfx}title-${this.cid}`;
  private lastFocusedEl?: HTMLElement | null;

  template({ pfx, ppfx, content, title }: any) {
    return `<div class="${pfx}dialog ${ppfx}one-bg ${ppfx}two-color" role="dialog" aria-modal="true" aria-labelledby="${this.titleId}">
      <div class="${pfx}header">
        <div id="${this.titleId}" class="${pfx}title">${title}</div>
        <div class="${pfx}btn-close" data-close-modal role="button" tabindex="0" aria-label="Close dialog">&Cross;</div>
      </div>
      <div class="${pfx}content">
        <div id="${pfx}c">${content}</div>
        <div style="clear:both"></div>
      </div>
    </div>
    <div class="${pfx}collector" style="display: none"></div>`;
  }

  events() {
    return {
      click: 'onClick',
      keydown: 'onKeydown',
      'click [data-close-modal]': 'hide',
    };
  }

  $title?: JQuery<HTMLElement>;
  $content?: JQuery<HTMLElement>;
  $collector?: JQuery<HTMLElement>;

  constructor(o: any) {
    super(o);
    const model = this.model;
    this.listenTo(model, 'change:open', this.updateOpen);
    this.listenTo(model, 'change:title', this.updateTitle);
    this.listenTo(model, 'change:content', this.updateContent);
  }

  onClick(e: Event) {
    const bkd = this.config.backdrop;
    bkd && e.target === this.el && this.hide();
  }

  onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;

    if ((e.key === 'Enter' || e.key === ' ') && target?.matches('[data-close-modal]')) {
      e.preventDefault();
      this.hide();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
      return;
    }

    if (e.key !== 'Tab' || !this.model.get('open')) return;
    this.trapFocus(e);
  }

  private getFocusableElements() {
    return Array.from(this.el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter((el) => {
      return !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden');
    });
  }

  private focusFirstElement() {
    const focusable = this.getFocusableElements();
    const firstEl = focusable[0] || (this.el.querySelector(`.${this.pfx}dialog`) as HTMLElement | null);
    firstEl?.focus();
  }

  private trapFocus(event: KeyboardEvent) {
    const focusable = this.getFocusableElements();
    if (!focusable.length) return;

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    const activeEl = document.activeElement as HTMLElement | null;

    if (event.shiftKey && activeEl === firstEl) {
      event.preventDefault();
      lastEl.focus();
    } else if (!event.shiftKey && activeEl === lastEl) {
      event.preventDefault();
      firstEl.focus();
    }
  }

  private restoreFocus() {
    this.lastFocusedEl?.focus?.();
  }

  /**
   * Returns collector element
   * @return {HTMLElement}
   * @private
   */
  getCollector() {
    if (!this.$collector) this.$collector = this.$el.find('.' + this.pfx + 'collector');
    return this.$collector;
  }

  /**
   * Returns content element
   * @return {HTMLElement}
   */
  getContent() {
    const pfx = this.pfx;

    if (!this.$content) {
      this.$content = this.$el.find(`.${pfx}content #${pfx}c`);
    }

    return this.$content;
  }

  /**
   * Returns title element
   * @return {HTMLElement}
   * @private
   */
  getTitle(opts: any = {}) {
    if (!this.$title) this.$title = this.$el.find('.' + this.pfx + 'title');
    return opts.$ ? this.$title : this.$title.get(0);
  }

  /**
   * Update content
   * @private
   * */
  updateContent() {
    var content = this.getContent();
    const children = content.children();
    const coll = this.getCollector();
    const body = this.model.get('content');
    children.length && coll.append(children);
    content.empty().append(body);
  }

  /**
   * Update title
   * @private
   * */
  updateTitle() {
    const title = this.getTitle({ $: true });
    //@ts-ignore
    title && title.empty().append(this.model.get('title'));
  }

  /**
   * Update open
   * @private
   * */
  updateOpen() {
    const isOpen = this.model.get('open');
    this.el.style.display = isOpen ? '' : 'none';
    this.$el.attr('aria-hidden', String(!isOpen));

    if (isOpen) {
      this.lastFocusedEl = document.activeElement as HTMLElement | null;
      this.focusFirstElement();
    } else {
      this.restoreFocus();
    }
  }

  /**
   * Hide modal
   * @private
   * */
  hide() {
    this.model.close();
  }

  /**
   * Show modal
   * @private
   * */
  show() {
    this.model.open();
  }

  updateAttr(attr?: any) {
    const { pfx, $el, el } = this;
    //@ts-ignore
    const currAttr = [].slice.call(el.attributes).map((i) => i.name);
    $el.removeAttr(currAttr.join(' '));
    $el.attr({
      ...(attr || {}),
      class: `${pfx}container ${(attr && attr.class) || ''}`.trim(),
      'aria-hidden': String(!this.model.get('open')),
    });
  }

  render() {
    const el = this.$el;
    const obj = this.model.toJSON();
    obj.pfx = this.pfx;
    obj.ppfx = this.ppfx;
    el.html(this.template(obj));
    this.updateAttr();
    this.updateOpen();
    return this;
  }
}
