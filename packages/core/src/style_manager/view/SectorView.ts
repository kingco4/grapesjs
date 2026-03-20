import { View } from '../../common';
import EditorModel from '../../editor/model/Editor';
import html from '../../utils/html';
import { StyleManagerConfig } from '../config/config';
import Sector from '../model/Sector';
import PropertiesView from './PropertiesView';

export default class SectorView extends View<Sector> {
  em: EditorModel;
  config: StyleManagerConfig;
  pfx: string;

  constructor(o: { config: StyleManagerConfig; model?: Sector }) {
    super(o);
    const config = o.config || {};
    const { model } = this;
    // @ts-ignore
    const { em } = config;
    this.config = config;
    this.em = em;
    this.pfx = config.stylePrefix || '';
    this.listenTo(model, 'destroy remove', this.remove);
    this.listenTo(model, 'change:open', this.updateOpen);
    this.listenTo(model, 'change:visible', this.updateVisibility);
  }

  template({ pfx, label, propertiesId }: { pfx?: string; label: string; propertiesId: string }) {
    const icons = this.em?.getConfig().icons;
    const iconCaret = icons?.caret || '';
    const clsPfx = `${pfx}sector-`;

    return html`
      <div class="${clsPfx}title"
        data-sector-title
        role="button"
        tabindex="0"
        aria-expanded="false"
        aria-controls="${propertiesId}">
        <div class="${clsPfx}caret" aria-hidden="true">$${iconCaret}</div>
        <div class="${clsPfx}label">${label}</div>
      </div>
    `;
  }

  events() {
    return {
      'click [data-sector-title]': 'toggle',
      'keydown [data-sector-title]': 'handleTitleKeydown',
    };
  }

  handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggle();
    }
  }

  updateOpen() {
    const { $el, model, pfx } = this;
    const isOpen = model.isOpen();
    $el[isOpen ? 'addClass' : 'removeClass'](`${pfx}open`);
    this.getPropertiesEl().style.display = isOpen ? '' : 'none';

    // Keep aria-expanded in sync
    const titleEl = $el.find('[data-sector-title]');
    titleEl.attr('aria-expanded', String(isOpen));
  }

  updateVisibility() {
    this.el.style.display = this.model.isVisible() ? '' : 'none';
  }

  getPropertiesEl() {
    const { $el, pfx } = this;
    return $el.find(`.${pfx}properties`).get(0)!;
  }

  toggle() {
    const { model } = this;
    model.setOpen(!model.get('open'));
  }

  renderProperties() {
    const { model, config } = this;
    const objs = model.get('properties');

    if (objs) {
      // @ts-ignore
      const view = new PropertiesView({ collection: objs, config });
      this.$el.append(view.render().el);
    }
  }

  render() {
    const { pfx, model, $el } = this;
    const id = model.getId();
    const label = model.getName();
    const propertiesId = `${pfx}sector-props-${id}`;
    $el.html(this.template({ pfx, label, propertiesId }));
    this.renderProperties();
    $el.attr('class', `${pfx}sector ${pfx}sector__${id} no-select`);

    // Set the id on the properties container for aria-controls linkage
    const propsEl = this.getPropertiesEl();
    if (propsEl) propsEl.id = propertiesId;

    this.updateOpen();
    return this;
  }
}
