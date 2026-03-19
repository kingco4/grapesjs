import defConfig from '../../../../src/navigator/config/config';
import EditorModel from '../../../../src/editor/model/Editor';
import ItemView from '../../../../src/navigator/view/ItemView';

describe('ItemView', () => {
  let itemView: ItemView;
  let em: EditorModel;

  const isVisible = (itemView: ItemView) => {
    return itemView.module.isVisible(itemView.model);
  };

  beforeEach(() => {
    em = new EditorModel();
    em.config.icons = { move: '', eye: '', eyeOff: '', chevron: '' } as any;
    const defCmp = em.get('DomComponents').getType('default').model;

    itemView = new ItemView({
      model: new defCmp(
        {
          components: [{ tagName: 'span' }],
        },
        { em },
      ),
      module: em.get('LayerManager'),
      ItemView,
      level: 0,
      opened: {},
      parentView: undefined,
      config: { ...defConfig(), em },
    } as any);
    document.body.innerHTML = '<div id="fixtures"></div>';
    document.body.querySelector('#fixtures')!.appendChild(itemView.render().el);
  });

  describe('.isVisible', () => {
    it("should return `false` if the model's `style` object has a `display` property set to `none`, `true` otherwise", () => {
      expect(isVisible(itemView)).toEqual(true);
      itemView.model.addStyle({ display: '' });
      expect(isVisible(itemView)).toEqual(true);
      itemView.model.addStyle({ display: 'none' });
      expect(isVisible(itemView)).toEqual(false);
      itemView.model.addStyle({ display: 'block' });
      expect(isVisible(itemView)).toEqual(true);
    });
  });

  test('renders tree semantics', () => {
    const treeItem = itemView.getTreeItemEl();
    expect(treeItem.getAttribute('role')).toBe('treeitem');
    expect(treeItem.getAttribute('tabindex')).toBe('0');
    expect(treeItem.getAttribute('aria-level')).toBe('1');
    expect(treeItem.getAttribute('aria-expanded')).toBe('false');
    expect(itemView.items?.el.getAttribute('role')).toBe('group');
  });

  test('ArrowRight opens and ArrowLeft closes item with children', () => {
    const eventRight = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    itemView.handleTreeItemKeydown(eventRight);
    expect(itemView.module.isOpen(itemView.model)).toBe(true);

    const eventLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    itemView.handleTreeItemKeydown(eventLeft);
    expect(itemView.module.isOpen(itemView.model)).toBe(false);
  });

  test('Enter selects the layer item', () => {
    const spy = jest.spyOn(itemView.module, 'setLayerData');
    itemView.handleTreeItemKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledWith(itemView.model, { selected: true }, { event: undefined });
  });
});
