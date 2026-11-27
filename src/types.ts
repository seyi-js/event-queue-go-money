export interface Message<T> {
  readonly offset: number;
  readonly payload: T;
  readonly publishedAt: Date;
}

export type Handler<T> = (message: Message<T>) => void;

export interface Consumer {
  readonly id: string;
  drain(): void;
}
