# Class-Based React Hooks

Create React hooks using classes - with `hookDidMount`, `hookWillUpdate`, etc.

## Examples

### `useCounter`

```tsx
// Import these.
import { ReactHook, createHook } from 'class-based-react-hooks';

// Define the type of the arguments of your hook.
type Args = [number];

// Define the type of the state of your hook.
type State = {
	num: number;
};

// Define the return type of your hook.
type Return = {
	num: number;
	increment: (by?: number) => void;
	reset: () => void;
};


// Start defining the class. Use the types we defined above as generic arguments for `ReactHook`.
class UseCounter extends ReactHook<Args, State, Return> {
	// Make your constructor. It must take Args as argument.
	constructor(args: Args) {
		// For React components you would do this.state = {...}.
		// Here, you pass the state to super.
		super(args, {
			num: args[0],
		});
	}
	// render() must return the hook's return type.
	render(): Return {
		return {
			num: this.state.num,
			increment: this.increment,
			reset: this.reset,
		};
	}
	increment = (by: number = 1) => {
		// setState will update the hook's state and schedule a rerender.
		this.setState({
			num: this.state.num + by,
		});
	};
	reset = () => {
		this.setState({
			num: this.args[0],
		});
	};
	
}

// Use createHook to turn your class into a hook.
const useCounter = createHook(UseCounter);


// Now use the hook you just created.
function Counter() {
	const {num, increment, reset} = useCounter(1);
	return (
		<div>
			<span>{num}</span>
			<button onClick={increment}>Increment</button>
			<button onClick={reset}>Reset</button>
		</div>
	)
}
```

### `useMiniSWR`

The main idea of this is similar to [`useSWR`](https://github.com/vercel/swr/), but with only the most basic features implemented.

* It is faster!! SWR starts data fetching *after* the component has mounted (or updated). MiniSWR starts immediately as it renders. 🔥🔥🔥
* I find this class-based implementation much easier to reason about.

```tsx
import { createHook, ReactHook } from 'class-based-react-hooks';

// Takes a key and a fetcher function.
// You always need to provide a fetcher, unlike with SWR where `fetch` is used by default.
type Args<Data, Key> = [Key, (key: Key) => Promise<Data>];
type State<Data> = {
	data: Data | undefined;
	error: unknown | undefined;
};
type Returns<Data> = {
	data: Data | undefined;
	error: unknown | undefined;
	isValidating: boolean;
	mutate: (newData?: Data, shouldRevalidate?: boolean) => void;
};

class UseMiniSWR<Data, Key> extends ReactHook<
	Args<Data, Key>,
	State<Data>,
	Returns<Data>
> {
	constructor(args: Args<Data, Key>) {
		// Initial state: both data and error is undefined.
		super(args, {
			data: undefined,
			error: undefined,
		});
	}
	// A RequestId to keep track of the latest request (and avoid concurrency bugs).
	_lastRequestId: number = 1;
	// Whether or not the latest request is still pending.
	_isRequestActive: boolean = false;
	// This will be run when the key changes, or when mutate is called.
	_fetchData = async (key: Key) => {
		const requestId = ++this._lastRequestId;
		// _isRequestActive is a field (not inside this.state)
		// because _fetchData is called from hookWillMount, hookWillUpdate, and _mutate,
		// and all three of those guarantee that a render will follow anyway.
		this._isRequestActive = true;
		const update: Partial<State<Data>> = {};
		try {
			const data = await this.args[1](key);
			update.data = data;
			update.error = undefined;
		} catch (error) {
			update.error = error;
		}
		if (this._lastRequestId === requestId) {
			// Here, too, a render is scheduled (by setState) after _isRequestActive is changed.
			this._isRequestActive = false;
			this.setState(update);
		}
	};
	hookWillMount(): void {
		// Start fetching the data as soon a we can!
		this._fetchData(this.args[0]);
	}
	hookWillUpdate(nextArgs: Args<Data, Key>, nextState: State<Data>): void {
		if (nextArgs[0] !== this.args[0]) {
			this._fetchData(nextArgs[0]);
		}
	}
	_mutate = (newData?: Data, shouldRevalidate: boolean = true) => {
		const update: Partial<State<Data>> = {};
		if (newData) {
			update.data = newData;
		}
		if (shouldRevalidate) {
			this._fetchData(this.args[0]);
		}
		this.setState(update);
	};
	render(): Returns<Data> {
		return {
			data: this.state.data,
			error: this.state.error,
			isValidating: this._isRequestActive,
			mutate: this._mutate,
		};
	}
}
const useMiniSWR = createHook(UseMiniSWR);

async function fetcher(uri: string): Promise<string> {
	const resp = await fetch(uri);
	return await resp.text();
}
function MyComponent() {
	const {data, mutate, isValidating} = useMiniSWR("https://raw.githubusercontent.com/wishawa/class-based-react-hooks/main/README.md", fetcher);
	return (
		<div>
			{isValidating && <span>Loading...</span>}
			{!!data && <span>{data}</span>}
			<button onClick={() => mutate()}>refresh</button>
		</div>
	);
}
```

## API

### `ReactHook`

`ReactHook` tries to mimick [`React.Component`'s API](https://reactjs.org/docs/react-component.html) where applicable.
Below is the definition for `ReactHook` with documentation comments.

```typescript
/// ReactHook is the class you have to extend to create a hook.
/// It has 3 generic arguments:
/// - `Args`: The arguments that the hook receives. Think of this as the props of `React.Component`.
///	Examples: `[number] -> useHook(42)`, `[string, typeof someObj] -> useHook("asdf", someObj)`.
/// - `State`: The state of the hook. This is like the state of a `React.Component`. It must be an object.
/// - `Return`: What this hook returns.
abstract class ReactHook<Args extends any[], State extends {}, Return> {
	/// The constructor takes the `Args` and an initial `State`.
	/// This is ❗different❗ from `React.Component`'s constructor, which takes only the props.
	/// So in your inherited class, instead of doing `super(args); this.state = {...};`,
	/// you should do `super(args, {...});`.
	constructor(args: Args, state: State) {
		// Omitted
	}

	/// You can access the hook's state through `this.state`.
	/// You should not try to modify it directly. Use `this.setState`.
	protected state: State;

	/// You can access the hook's args through `this.args`.
	protected args: Args;


	/// This method must be defined by the subclass. It must returns the `Return` type.
	/// Usually, this method would return things from `this.state` or `this.args`.
	/// This is called every time the component containing this hook renders.
	protected abstract render(): Return;

	/// Called just before the first `render()`.
	/// At this point `this.state` and `this.args` are already available.
	protected hookWillMount(): void {}

	/// Called after the first `render()` is all finished - the same time as `componentDidMount`.
	protected hookDidMount(): void; {}
	
	/// Called just before `render()`. Not called for the first render.
	/// This method is called even if the args and state remains the same so you must perform comparison yourself.
	/// At this point `this.args` and `this.state` are the args and state from the previous render -
	/// `nextArgs` and `nextState` are those of the upcoming render.
	protected hookWillUpdate(nextArgs: Args, nextState: State): void {}

	/// Called after `render()` is all finished - the same time as `componentDidUpdate`. Not called for the first render.
	/// This method is called even if the args and state remains the same so you must perform comparison yourself.
	protected hookDidUpdate(prevArgs: Args, prevState: State): void {}

	/// Called just before the component unmounts.
	protected hookWillUnmount(): void {}

	/// Called before every `render()`, after `hookWillMount` / `hookWillUpdate`.
	/// This should be a pure function.
	protected getDerivedStateFromArgs(
		this: {},
		nextArgs: Args,
		prevState: State
	): null | Partial<State> {
		return null;
	}


	/// Schedule the component containing this hook to rerender.
	/// A callback can be provided to be run after that render is finished.
	protected forceUpdate(callback?: Callback) {
		// Omitted
	}
	/// Update the state of the hook. Takes a partial state and merge it into the new state.
	/// State update is scheduled and not immediately reflected in `this.state`, just like in `React.Component`.
	/// A callback can be provided to be run after that update is rendered.
	protected setState(update: Partial<State>, callback?: Callback) {
		// Omitted
	}
}
```

### `createHook`

The `createHook` function takes a class (the class itself, **not** an instance) that
* Extends `ReactHook<Args, State, Return>`.
* Has constructor signature `constructor(args: Args)`.

It returns a hook function.
The returned hook has signature `(...args: Args) => Return`.