import { CommandFunction } from '../commands/view/CommandAbstract';

export interface Keymap {
  id: string;
  keys: string;
  handler: string | CommandFunction;
}

export interface KeymapOptions {
  /**
   * Force the handler to be executed.
   */
  force?: boolean;
  /**
   * Prevent default of the original triggered event.
   */
  prevent?: boolean;
}

export interface KeymapsConfig {
  /**
   * Default keymaps.
   */
  defaults?: Record<string, Omit<Keymap, 'id'> & { opts?: KeymapOptions }>;
}

const config: () => KeymapsConfig = () => ({
  defaults: {
    'core:undo': {
      keys: '⌘+z, ctrl+z',
      handler: 'core:undo',
      opts: { prevent: true },
    },
    'core:redo': {
      keys: '⌘+shift+z, ctrl+shift+z',
      handler: 'core:redo',
      opts: { prevent: true },
    },
    'core:copy': {
      keys: '⌘+c, ctrl+c',
      handler: 'core:copy',
    },
    'core:paste': {
      keys: '⌘+v, ctrl+v',
      handler: 'core:paste',
    },
    'core:component-next': {
      keys: 's, down, right',
      handler: 'core:component-next',
      opts: { prevent: true },
    },
    'core:component-prev': {
      keys: 'w, up, left',
      handler: 'core:component-prev',
      opts: { prevent: true },
    },
    'core:component-enter': {
      keys: 'd, enter',
      handler: 'core:component-enter',
      opts: { prevent: true },
    },
    'core:component-exit': {
      keys: 'a, esc',
      handler: 'core:component-exit',
      opts: { prevent: true },
    },
    'core:component-delete': {
      keys: 'backspace, delete',
      handler: 'core:component-delete',
      opts: { prevent: true },
    },
  },
});

export default config;
