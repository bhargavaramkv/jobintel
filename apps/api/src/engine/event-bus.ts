import { EventEmitter } from 'node:events';

export interface EventBus {
  /** Called after a transaction that wrote ExecutionEvents has committed. */
  notify(): void;
  subscribe(listener: () => void): () => void;
}

export function createEventBus(): EventBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  return {
    notify: () => {
      emitter.emit('events');
    },
    subscribe: (listener) => {
      emitter.on('events', listener);
      return () => {
        emitter.off('events', listener);
      };
    },
  };
}
