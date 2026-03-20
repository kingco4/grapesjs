import defConfig from '../../../../src/navigator/config/config';
import EditorModel from '../../../../src/editor/model/Editor';
import ItemView from '../../../../src/navigator/view/ItemView';
import Component from '../../../../src/dom_components/model/Component';

describe('ItemView', () => {
  let itemView: ItemView;

  const isVisible = (itemView: ItemView) => {
    return itemView.module.isVisible(itemView.model);
  };

  beforeEach(() => {
    const em = new EditorModel();
    const defCmp = em.get('DomComponents').getType('default').model;

    itemView = new ItemView({
      model: new defCmp({}, { em }),
      module: em.get('LayerManager'),
      config: { ...defConfig(), em },
    } as any);
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
});

// ---------------------------------------------------------------------------
// Keyboard layer reordering — moveLayerUp / moveLayerDown
// ---------------------------------------------------------------------------

describe('ItemView — keyboard layer reordering', () => {
  let em: EditorModel;
  let defCmp: any;
  let parent: Component;
  let cmpA: Component;
  let cmpB: Component;
  let cmpC: Component;
  let itemViewB: ItemView; // view for the middle child (index 1)

  beforeEach(() => {
    em = new EditorModel();
    defCmp = em.get('DomComponents').getType('default').model;

    // Create a parent component and append three children: [A, B, C].
    parent = new defCmp({}, { em });
    cmpA = parent.components().add({}) as unknown as Component;
    cmpB = parent.components().add({}) as unknown as Component;
    cmpC = parent.components().add({}) as unknown as Component;

    itemViewB = new ItemView({
      model: cmpB,
      module: em.get('LayerManager'),
      config: { ...defConfig(), em },
    } as any);
  });

  // -------------------------------------------------------------------------
  // Initial index sanity
  // -------------------------------------------------------------------------

  test('three siblings have correct initial indices', () => {
    expect(cmpA.index()).toBe(0);
    expect(cmpB.index()).toBe(1);
    expect(cmpC.index()).toBe(2);
  });

  // -------------------------------------------------------------------------
  // moveLayerUp
  // -------------------------------------------------------------------------

  describe('.moveLayerUp()', () => {
    test('moves the component one position earlier among siblings', () => {
      // Before: [A(0), B(1), C(2)]
      itemViewB.moveLayerUp();
      // After:  [B(0), A(1), C(2)]
      expect(cmpB.index()).toBe(0);
      expect(cmpA.index()).toBe(1);
      expect(cmpC.index()).toBe(2);
    });

    test('does nothing when the component is already the first sibling', () => {
      // Create a view for cmpA (index 0)
      const itemViewA = new ItemView({
        model: cmpA,
        module: em.get('LayerManager'),
        config: { ...defConfig(), em },
      } as any);

      itemViewA.moveLayerUp();

      // Order must be unchanged
      expect(cmpA.index()).toBe(0);
      expect(cmpB.index()).toBe(1);
      expect(cmpC.index()).toBe(2);
    });

    test('a second consecutive call moves the component to the beginning', () => {
      // Before: [A(0), B(1), C(2)]
      itemViewB.moveLayerUp(); // → [B(0), A(1), C(2)]
      // B is now at index 0, so a second call is a no-op
      itemViewB.moveLayerUp();
      expect(cmpB.index()).toBe(0);
    });

    test('does nothing when the component has no parent', () => {
      const orphan = new defCmp({}, { em });
      const orphanView = new ItemView({
        model: orphan,
        module: em.get('LayerManager'),
        config: { ...defConfig(), em },
      } as any);

      // Should not throw
      expect(() => orphanView.moveLayerUp()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // moveLayerDown
  // -------------------------------------------------------------------------

  describe('.moveLayerDown()', () => {
    test('moves the component one position later among siblings', () => {
      // Before: [A(0), B(1), C(2)]
      itemViewB.moveLayerDown();
      // After:  [A(0), C(1), B(2)]
      expect(cmpA.index()).toBe(0);
      expect(cmpC.index()).toBe(1);
      expect(cmpB.index()).toBe(2);
    });

    test('does nothing when the component is already the last sibling', () => {
      // Create a view for cmpC (index 2)
      const itemViewC = new ItemView({
        model: cmpC,
        module: em.get('LayerManager'),
        config: { ...defConfig(), em },
      } as any);

      itemViewC.moveLayerDown();

      // Order must be unchanged
      expect(cmpA.index()).toBe(0);
      expect(cmpB.index()).toBe(1);
      expect(cmpC.index()).toBe(2);
    });

    test('a second consecutive call moves the component to the end', () => {
      // Before: [A(0), B(1), C(2)]
      itemViewB.moveLayerDown(); // → [A(0), C(1), B(2)]
      // B is now at index 2 (last), so a second call is a no-op
      itemViewB.moveLayerDown();
      expect(cmpB.index()).toBe(2);
    });

    test('does nothing when the component has no parent', () => {
      const orphan = new defCmp({}, { em });
      const orphanView = new ItemView({
        model: orphan,
        module: em.get('LayerManager'),
        config: { ...defConfig(), em },
      } as any);

      expect(() => orphanView.moveLayerDown()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Round-trip: up then down restores original order
  // -------------------------------------------------------------------------

  test('moveLayerDown followed by moveLayerUp restores original order', () => {
    // Before: [A(0), B(1), C(2)]
    itemViewB.moveLayerDown(); // → [A(0), C(1), B(2)]
    itemViewB.moveLayerUp();   // → [A(0), B(1), C(2)]

    expect(cmpA.index()).toBe(0);
    expect(cmpB.index()).toBe(1);
    expect(cmpC.index()).toBe(2);
  });

  test('moveLayerUp followed by moveLayerDown restores original order', () => {
    // Before: [A(0), B(1), C(2)]
    itemViewB.moveLayerUp();   // → [B(0), A(1), C(2)]
    itemViewB.moveLayerDown(); // → [A(0), B(1), C(2)]

    expect(cmpA.index()).toBe(0);
    expect(cmpB.index()).toBe(1);
    expect(cmpC.index()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// handleTreeItemKeydown — Alt+Arrow dispatches to move methods
// ---------------------------------------------------------------------------

describe('ItemView — handleTreeItemKeydown Alt+Arrow routing', () => {
  let em: EditorModel;
  let parent: Component;
  let cmpB: Component;
  let itemViewB: ItemView;

  const makeEvent = (key: string, altKey: boolean): KeyboardEvent =>
    ({
      key,
      altKey,
      preventDefault: jest.fn(),
      currentTarget: document.createElement('div'),
    }) as unknown as KeyboardEvent;

  beforeEach(() => {
    em = new EditorModel();
    const defCmp = em.get('DomComponents').getType('default').model;
    parent = new defCmp({}, { em });
    parent.components().add({});          // cmpA at index 0
    cmpB = parent.components().add({}) as unknown as Component; // index 1
    parent.components().add({});          // cmpC at index 2

    itemViewB = new ItemView({
      model: cmpB,
      module: em.get('LayerManager'),
      config: { ...defConfig(), em },
    } as any);
  });

  test('Alt+ArrowUp calls moveLayerUp', () => {
    const spy = jest.spyOn(itemViewB, 'moveLayerUp');
    itemViewB.handleTreeItemKeydown(makeEvent('ArrowUp', true));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('Alt+ArrowDown calls moveLayerDown', () => {
    const spy = jest.spyOn(itemViewB, 'moveLayerDown');
    itemViewB.handleTreeItemKeydown(makeEvent('ArrowDown', true));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('plain ArrowUp does NOT call moveLayerUp (navigation only)', () => {
    const spy = jest.spyOn(itemViewB, 'moveLayerUp');
    itemViewB.handleTreeItemKeydown(makeEvent('ArrowUp', false));
    expect(spy).not.toHaveBeenCalled();
  });

  test('plain ArrowDown does NOT call moveLayerDown (navigation only)', () => {
    const spy = jest.spyOn(itemViewB, 'moveLayerDown');
    itemViewB.handleTreeItemKeydown(makeEvent('ArrowDown', false));
    expect(spy).not.toHaveBeenCalled();
  });

  test('Alt+ArrowUp calls preventDefault to block browser scroll', () => {
    const ev = makeEvent('ArrowUp', true);
    itemViewB.handleTreeItemKeydown(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  test('Alt+ArrowDown calls preventDefault to block browser scroll', () => {
    const ev = makeEvent('ArrowDown', true);
    itemViewB.handleTreeItemKeydown(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleTreeItemKeydown — 'v' key visibility shortcut
// ---------------------------------------------------------------------------

describe("ItemView — handleTreeItemKeydown 'v' key visibility shortcut", () => {
  let em: EditorModel;
  let itemView: ItemView;

  const makeVEvent = (): KeyboardEvent =>
    ({
      key: 'v',
      altKey: false,
      preventDefault: jest.fn(),
      currentTarget: document.createElement('div'),
    }) as unknown as KeyboardEvent;

  beforeEach(() => {
    em = new EditorModel();
    const defCmp = em.get('DomComponents').getType('default').model;
    const component = new defCmp({}, { em });
    itemView = new ItemView({
      model: component,
      module: em.get('LayerManager'),
      config: { ...require('../../../../src/navigator/config/config').default(), em },
    } as any);
  });

  test("pressing 'v' calls toggleVisibility", () => {
    const spy = jest.spyOn(itemView, 'toggleVisibility');
    itemView.handleTreeItemKeydown(makeVEvent());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("pressing 'v' calls preventDefault", () => {
    const ev = makeVEvent();
    itemView.handleTreeItemKeydown(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  test("pressing 'v' actually toggles the model's display style", () => {
    const { model, module } = itemView;
    const visibleBefore = module.isVisible(model);
    itemView.handleTreeItemKeydown(makeVEvent());
    expect(module.isVisible(model)).toBe(!visibleBefore);
    // Second press restores original state
    itemView.handleTreeItemKeydown(makeVEvent());
    expect(module.isVisible(model)).toBe(visibleBefore);
  });
});
