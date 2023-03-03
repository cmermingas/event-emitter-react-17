import React, {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';

import { EventEmitter } from 'events';

const events = new EventEmitter();

async function someAsyncAction(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

type ContextType = {
  counter1: number;
  counter2: number;
  counter3: number;
  increment: () => Promise<void>;
};

const CounterContext = createContext<ContextType>(null!);

function CounterProvider({ children }: { children: ReactNode }): ReactElement {
  const [counter1, setCounter1] = useState(1);
  const [counter2, setCounter2] = useState(1);
  const [counter3, setCounter3] = useState(1);
  const increment = useCallback(async () => {
    events.emit('beforeIncrement');
    setCounter1((x: number) => x + 1);
    setCounter2((x: number) => x + 1);
    await someAsyncAction();
    setCounter3((x: number) => x + 1);
    // React 17:
    //    Handlers of the following event will see counter1 updated value but not counter2.
    // React 18 with Automatic Batching:
    //    Handlers of the following event will not see see counter1 or counter2 updated value.
    // What is the best way to emit an event here and ensure that handlers see the updated state?
    //    setTimeout(() => events.emit('afterIncrement')) ??
    events.emit('afterIncrement');
  }, []);
  return (
    <CounterContext.Provider value={{ counter1, counter2, counter3, increment }}>
      {children}
    </CounterContext.Provider>
  );
}

function useBeforeAction(): string {
  const { counter1, counter2, counter3 } = useContext(CounterContext);
  const [result, setResult] = useState('');
  useEffect(() => {
    const handler = (): void => {
      const message = `BEFORE - counter1: ${counter1}, counter2: ${counter2}, counter3: ${counter3}`;
      console.log(message);
      setResult(message);
    }
    events.on('beforeIncrement', handler);
    return () => {
      events.off('beforeIncrement', handler);
    };
  }, [counter1, counter2, counter3]);
  return result;
}

function useAfterAction(): string {
  const { counter1, counter2, counter3 } = useContext(CounterContext);
  const [result, setResult] = useState('');
  useEffect(() => {
    const handler = (): void => {
      const message = `AFTER - counter1: ${counter1}, counter2: ${counter2}, counter3: ${counter3}`;
      console.log(message);
      setResult(message);
    };
    events.on('afterIncrement', handler);
    return () => {
      events.off('afterIncrement', handler);
    };
  }, [counter1, counter2, counter3]);
  return result;
}

function useMessages(): string[] {
  const [messages, setMessages] = useState<string[]>([]);
  const before = useBeforeAction();
  const after = useAfterAction();
  useEffect(() => {
    if (before) setMessages((current: string[]) => [...current, before]);
  }, [before])
  useEffect(() => {
    if (after) setMessages((current: string[]) => [...current, after]);
  }, [after]);
  return messages;
}

function CounterComponent(): ReactElement {
  const { counter1, counter2, counter3, increment } = useContext(CounterContext);
  const messages = useMessages();
  return (
    <div>
      <p>{`counter1: ${counter1}`}</p>
      <p>{`counter2: ${counter2}`}</p>
      <p>{`counter3: ${counter3}`}</p>
      <p>
        <button onClick={() => increment()}>INCREMENT</button>
      </p>
      <code>
        {messages.map((m, i) => <span key={i}>{m}<br /></span>)}
      </code>
    </div>
  );
}

export default function ReactAutomaticBatching(): ReactElement {
  return (
    <CounterProvider>
      <CounterComponent />
    </CounterProvider>
  );
}