import { debounce } from 'underscore';
import { View, $ } from '../../common';
import { ComponentsEvents } from '../../dom_components/types';
import ModalEvents from '../../modal_dialog/types';
import { getHostName } from '../../utils/host-name';
import { appendStyles } from '../../utils/mixins';
import { getAccessibilityReportAnnouncement } from '../model/AccessibilityValidator';
import EditorModel from '../model/Editor';
import { EditorEvents } from '../types';

export default class EditorView extends View<EditorModel> {
  accessibilityStatusEl?: HTMLElement;
  accessibilityLiveEl?: HTMLElement;
  private lastA11ySummary = '';

  refreshAccessibilityStatus = debounce(() => {
    if (!this.accessibilityStatusEl || !this.accessibilityLiveEl) return;

    const report = this.model.validateAccessibility();
    const previewIssues = report.issues.slice(0, 3);
    const items = previewIssues
      .map((issue) => `<li><strong>${issue.rule}</strong>: ${issue.message}</li>`)
      .join('');

    this.accessibilityStatusEl.innerHTML = report.issueCount
      ? `<div class="gjs-a11y-status__title">Accessibility warnings (${report.issueCount})</div>
         <ul>${items}</ul>
         ${report.issueCount > previewIssues.length ? `<div class="gjs-a11y-status__more">+${report.issueCount - previewIssues.length} more warning(s)</div>` : ''}`
      : '<div class="gjs-a11y-status__title gjs-a11y-status__title--ok">Accessibility checks passed</div>';

    const summary = getAccessibilityReportAnnouncement(report);
    if (summary !== this.lastA11ySummary) {
      this.lastA11ySummary = summary;
      this.announce(summary);
    }
  }, 50);

  constructor(model: EditorModel) {
    super({ model });
    const { Panels, UndoManager } = model;
    model.view = this;
    this.listenTo(model, `${EditorEvents.load} ${EditorEvents.update} ${EditorEvents.projectLoad}`, this.refreshAccessibilityStatus);
    this.listenTo(model, ComponentsEvents.selected, this.announceSelectedComponent);
    this.listenTo(model, ComponentsEvents.deselected, this.announceDeselectedComponent);
    this.listenTo(model, ComponentsEvents.add, this.announceAddedComponent);
    this.listenTo(model, ComponentsEvents.remove, this.announceRemovedComponent);
    this.listenTo(model, ModalEvents.open, this.announceModalOpened);
    this.listenTo(model, ModalEvents.close, this.announceModalClosed);
    model.once('change:ready', () => {
      Panels.active();
      Panels.disableButtons();

      if (model.getConfig().telemetry) {
        this.sendTelemetryData().catch(() => {
          // Telemetry data silent fail
        });
      }

      setTimeout(() => {
        model.trigger(EditorEvents.load, model.Editor);
        model.loadTriggered = true;
        UndoManager.clear();
        model.clearDirtyCount();
      });
    });
  }

  private announce(message: string) {
    if (!this.accessibilityLiveEl) return;
    this.accessibilityLiveEl.textContent = '';
    setTimeout(() => {
      this.accessibilityLiveEl && (this.accessibilityLiveEl.textContent = message);
    });
  }

  private getComponentName(component?: any) {
    return component?.getName?.({ noCustom: true }) || component?.getName?.() || 'component';
  }

  private announceSelectedComponent(component?: any) {
    if (!component) return;
    this.announce(`Selected ${this.getComponentName(component)}.`);
  }

  private announceDeselectedComponent(component?: any) {
    if (!component) return;
    this.announce(`Deselected ${this.getComponentName(component)}.`);
  }

  private announceAddedComponent(component?: any) {
    if (!this.model.loadTriggered || !component) return;
    this.announce(`Added ${this.getComponentName(component)}.`);
  }

  private announceRemovedComponent(component?: any) {
    if (!this.model.loadTriggered || !component) return;
    this.announce(`Removed ${this.getComponentName(component)}.`);
  }

  private announceModalOpened() {
    const title = this.model.Modal.getTitle();
    const titleText = typeof title === 'string' ? title : (title as any)?.textContent || 'dialog';
    this.announce(`Opened ${titleText}.`);
  }

  private announceModalClosed() {
    this.announce('Dialog closed.');
  }

  private renderAccessibilityUi() {
    if (this.accessibilityStatusEl && this.accessibilityLiveEl) return;

    // Skip navigation: keyboard users can jump straight to the canvas
    const skipLink = document.createElement('a');
    skipLink.href = '#gjs-canvas';
    skipLink.className = 'gjs-skip-link';
    skipLink.textContent = 'Skip to canvas';
    this.el.insertBefore(skipLink, this.el.firstChild);

    this.accessibilityStatusEl = document.createElement('div');
    this.accessibilityStatusEl.className = 'gjs-a11y-status';
    this.accessibilityStatusEl.setAttribute('role', 'status');
    this.accessibilityStatusEl.setAttribute('aria-live', 'polite');

    this.accessibilityLiveEl = document.createElement('div');
    this.accessibilityLiveEl.className = 'gjs-sr-only';
    this.accessibilityLiveEl.setAttribute('aria-live', 'polite');
    this.accessibilityLiveEl.setAttribute('aria-atomic', 'true');

    this.el.appendChild(this.accessibilityStatusEl);
    this.el.appendChild(this.accessibilityLiveEl);
  }

  render() {
    const { $el, model } = this;
    const { Panels, Canvas, config, modules } = model;
    const pfx = config.stylePrefix;
    const classNames = [`${pfx}editor`];
    !config.customUI && classNames.push(`${pfx}one-bg ${pfx}two-color`);

    const contEl = $(config.el || `body ${config.container}`);
    config.cssIcons && appendStyles(config.cssIcons, { unique: true, prepand: true });
    $el.empty();

    config.width && contEl.css('width', config.width);
    config.height && contEl.css('height', config.height);

    $el.append(Canvas.render());
    $el.append(Panels.render());

    // Load shallow editor
    const { shallow } = model;
    const shallowCanvasEl = shallow.Canvas.render();
    shallowCanvasEl.style.display = 'none';
    $el.append(shallowCanvasEl);

    $el.attr('class', classNames.join(' '));
    contEl.addClass(`${pfx}editor-cont`).empty().append($el);
    modules.forEach((md) => md.postRender?.(this));
    this.renderAccessibilityUi();
    this.refreshAccessibilityStatus();

    return this;
  }

  private async sendTelemetryData() {
    const domain = getHostName();

    if (domain === 'localhost' || domain.includes('localhost')) {
      // Don't send telemetry data for localhost
      return;
    }

    const sessionKeyPrefix = 'gjs_telemetry_sent_';
    const { version } = this.model;
    const sessionKey = `${sessionKeyPrefix}${version}`;

    if (sessionStorage.getItem(sessionKey)) {
      // Telemetry already sent for version this session
      return;
    }

    const url = 'https://app.grapesjs.com';
    const response = await fetch(`${url}/api/gjs/telemetry/collect`, {
      method: 'POST',
      body: JSON.stringify({ domain, version }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send telemetry data ${await response.text()}`);
    }

    sessionStorage.setItem(sessionKey, 'true');

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(sessionKeyPrefix) && key !== sessionKey) {
        sessionStorage.removeItem(key);
      }
    });

    this.trigger(EditorEvents.telemetryInit);
  }
}
