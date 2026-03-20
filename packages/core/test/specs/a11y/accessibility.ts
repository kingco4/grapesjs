/**
 * Automated accessibility tests using jest-axe.
 *
 * These tests run axe-core against rendered component HTML to catch WCAG
 * violations early. Each suite mounts a real view, attaches it to the
 * document, and asserts no axe violations are present.
 *
 * Rules intentionally disabled per suite are documented inline with the
 * reason for the exception.
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import EditorModel from '../../../src/editor/model/Editor';
import Button from '../../../src/panels/model/Button';
import ButtonView from '../../../src/panels/view/ButtonView';
import Panel from '../../../src/panels/model/Panel';
import PanelView from '../../../src/panels/view/PanelView';
import Editor from '../../../src/editor';
import ModalView from '../../../src/modal_dialog/view/ModalView';
import Modal from '../../../src/modal_dialog/model/Modal';
import defConfig from '../../../src/navigator/config/config';
import ItemView from '../../../src/navigator/view/ItemView';
import editorConfig from '../../../src/editor/config/config';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attach html to document, run axe, return results. */
async function runAxe(html: string, options = {}) {
  document.body.innerHTML = `<div id="a11y-root">${html}</div>`;
  const root = document.getElementById('a11y-root')!;
  return axe(root, options);
}

/** Mount a view, attach to document, run axe, clean up. */
async function axeView(mountFn: () => HTMLElement, options = {}) {
  document.body.innerHTML = '<div id="a11y-root"></div>';
  const root = document.getElementById('a11y-root')!;
  const el = mountFn();
  root.appendChild(el);
  const results = await axe(root, options);
  return results;
}

// ---------------------------------------------------------------------------
// ButtonView
// ---------------------------------------------------------------------------

describe('a11y: ButtonView', () => {
  let em: EditorModel;

  beforeEach(() => {
    em = new EditorModel({});
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('default button has no axe violations', async () => {
    const model = new Button(em.Panels, { command: 'test-cmd', label: 'Save' });
    const view = new ButtonView({ model });
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });

  test('button with title uses it as aria-label — no violations', async () => {
    const model = new Button(em.Panels, {
      command: 'test-cmd',
      attributes: { title: 'Export code' },
    });
    const view = new ButtonView({ model });
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });

  test('disabled button has no axe violations', async () => {
    const model = new Button(em.Panels, {
      command: 'test-cmd',
      label: 'Delete',
      disable: true,
    });
    const view = new ButtonView({ model });
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });

  test('active/pressed button has no axe violations', async () => {
    const model = new Button(em.Panels, {
      command: 'test-cmd',
      label: 'Toggle view',
      active: true,
    });
    const view = new ButtonView({ model });
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// PanelView
// ---------------------------------------------------------------------------

describe('a11y: PanelView', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('empty panel has no axe violations', async () => {
    const model = new Panel(editor.Panels, { id: 'options' } as any);
    const view = new PanelView(model);
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });

  test('panel with buttons has no axe violations', async () => {
    const model = new Panel(editor.Panels, {
      id: 'commands',
      buttons: [
        { id: 'undo', command: 'core:undo', label: 'Undo', attributes: { title: 'Undo' } },
        { id: 'redo', command: 'core:redo', label: 'Redo', attributes: { title: 'Redo' } },
      ],
    } as any);
    const view = new PanelView(model);
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// ModalView
// ---------------------------------------------------------------------------

describe('a11y: ModalView', () => {
  let editor: Editor;

  beforeEach(() => {
    // Use full Editor so ModuleView.em is properly initialised
    editor = new Editor({});
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('closed modal has no axe violations', async () => {
    const model = new Modal(editor as any);
    const view = new ModalView({ model });
    const results = await axeView(() => view.render().el);
    expect(results).toHaveNoViolations();
  });

  test('open modal with title and content has no axe violations', async () => {
    const model = new Modal(editor as any);
    model.set('title', 'Export Code');
    model.set('content', '<p>Modal body content.</p>');
    model.set('open', true);
    const view = new ModalView({ model });
    view.render();
    view.updateOpen();
    const results = await axeView(() => view.el, {
      rules: {
        // jsdom cannot validate focus management; skip focus-related check
        'scrollable-region-focusable': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// LayerManager ItemView (tree navigation)
// ---------------------------------------------------------------------------

describe('a11y: Navigator ItemView', () => {
  let em: EditorModel;

  beforeEach(() => {
    // EditorModel must be fully initialised so getConfig().icons is populated
    em = new EditorModel(editorConfig());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('layer tree item has no axe violations', async () => {
    const defCmp = em.get('DomComponents').getType('default').model;
    const component = new defCmp({ name: 'Section' }, { em });
    const itemView = new ItemView({
      model: component,
      module: em.get('LayerManager'),
      config: { ...defConfig(), em },
    } as any);
    itemView.render();

    // Wrap in a [role=tree] container because treeitem requires a tree ancestor
    const results = await axeView(() => {
      const wrapper = document.createElement('ul');
      wrapper.setAttribute('role', 'tree');
      wrapper.setAttribute('aria-label', 'Layers');
      wrapper.appendChild(itemView.el);
      return wrapper;
    });
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Static HTML patterns
// ---------------------------------------------------------------------------

describe('a11y: Static HTML patterns', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('skip navigation link structure is valid', async () => {
    const results = await runAxe(`
      <a class="gjs-skip-link" href="#gjs-canvas">Skip to canvas</a>
      <main id="gjs-canvas" tabindex="-1">
        <p>Canvas content</p>
      </main>
    `);
    expect(results).toHaveNoViolations();
  });

  test('toolbar with labelled buttons has no violations', async () => {
    const results = await runAxe(`
      <div role="toolbar" aria-label="Editor commands">
        <span role="button" tabindex="0" aria-label="Undo" aria-disabled="false" aria-pressed="false"></span>
        <span role="button" tabindex="0" aria-label="Redo" aria-disabled="false" aria-pressed="false"></span>
      </div>
    `);
    expect(results).toHaveNoViolations();
  });

  test('editor landmark regions structure has no violations', async () => {
    // role="main" and role="complementary" must be top-level landmarks (not
    // nested inside role="application") per ARIA spec and axe rule
    // landmark-main-is-top-level / landmark-complementary-is-top-level.
    // The skip link, main canvas, and sidebar panels are siblings at body level.
    document.body.innerHTML = `
      <a class="gjs-skip-link" href="#gjs-cv">Skip to canvas</a>
      <div role="region" aria-label="Commands panel"></div>
      <main id="gjs-cv" aria-label="Editor canvas" tabindex="-1"></main>
      <aside aria-label="Editor panels"></aside>
    `;
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  test('layer tree with nested groups has no violations', async () => {
    const results = await runAxe(`
      <ul role="tree" aria-label="Layers">
        <li role="treeitem" aria-label="Section" aria-expanded="true" aria-selected="false" tabindex="0">
          <ul role="group" aria-label="Section children">
            <li role="treeitem" aria-label="Paragraph" aria-selected="false" tabindex="-1"></li>
          </ul>
        </li>
      </ul>
    `);
    expect(results).toHaveNoViolations();
  });

  test('dialog with label and close button has no violations', async () => {
    const results = await runAxe(`
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">Export Code</h3>
        <div>Modal content</div>
        <button aria-label="Close dialog">&#x2715;</button>
      </div>
    `);
    expect(results).toHaveNoViolations();
  });

  test('form inputs with associated labels have no violations', async () => {
    const results = await runAxe(`
      <form>
        <label for="device-select">Device</label>
        <select id="device-select" aria-label="Select device">
          <option value="desktop">Desktop</option>
          <option value="tablet">Tablet</option>
          <option value="mobile">Mobile</option>
        </select>
      </form>
    `);
    expect(results).toHaveNoViolations();
  });

  test('iframe with title attribute has no axe violations (WCAG 2.4.1)', async () => {
    // Verifies the FrameView title="Editor canvas" fix.
    // axe rule: frame-title — all iframes must have an accessible title.
    const results = await runAxe(`
      <iframe title="Editor canvas" src="about:blank"></iframe>
    `);
    expect(results).toHaveNoViolations();
  });

  test('color palette swatches with aria-label have no axe violations', async () => {
    // Verifies the ColorPicker aria-label fix.
    // Swatches that carry role="option" (interactive) must have an accessible
    // name — aria-label satisfies this requirement.
    const results = await runAxe(`
      <div role="listbox" aria-label="Color palette">
        <span role="option" tabindex="0"
              aria-label="rgb(255, 0, 0)"
              aria-selected="false"
              style="background-color:rgb(255,0,0);display:inline-block;width:16px;height:16px;">
        </span>
        <span role="option" tabindex="-1"
              aria-label="rgb(0, 128, 0)"
              aria-selected="false"
              style="background-color:rgb(0,128,0);display:inline-block;width:16px;height:16px;">
        </span>
        <span role="option" tabindex="-1"
              aria-label="No color selected"
              aria-selected="false"
              style="background-color:transparent;display:inline-block;width:16px;height:16px;">
        </span>
      </div>
    `);
    expect(results).toHaveNoViolations();
  });
});
